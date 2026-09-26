import {test,expect,type Page} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

const ready=(page:Page)=>expect(page.getByRole('status')).toContainText('Ready to print');
for(const mode of ['text','reading','studio'])test(`${mode}: captured styles survive pagination, HTML and PDF`,async({page,browser},info)=>{
  await page.goto(`/test.html?formatting&mode=${mode}`);await ready(page);
  const preview=page.frameLocator('.ps-frame');
  const bold=preview.getByText('BOLD-CHECK',{exact:true});
  if(mode!=='studio') {
    await expect(bold).toHaveCSS('color','rgb(170, 35, 50)');await expect(bold).toHaveCSS('font-weight','800');
    await expect(preview.getByText('ITALIC-CHECK',{exact:true})).toHaveCSS('color','rgb(35, 85, 185)');
    await expect(preview.getByText('PLUGIN-CHECK',{exact:true})).toHaveCSS('color','rgb(0, 130, 75)');
    await expect(preview.getByText('PLUGIN-CHECK',{exact:true})).toHaveCSS('font-size','22px');
    await expect(preview.getByText('HIGHLIGHT-CHECK',{exact:true})).toHaveCSS('background-color','rgb(255, 225, 40)');
    await expect(preview.getByText('INLINE-CHECK',{exact:true})).toHaveCSS('color','rgb(120, 40, 160)');
    await expect(preview.getByText('EMBED-STYLED-CHECK',{exact:true})).toHaveCSS('color','rgb(100, 30, 180)');
    await expect(preview.getByText('EMBED-STYLED-CHECK',{exact:true})).toHaveCSS('font-size','16.5px');
    await expect(preview.locator('.ps-check')).toHaveCSS('font-family',/DejaVu Sans/);
  } else await expect(bold).toHaveCSS('color','rgb(38, 39, 39)');
  await expect(preview.locator('.pagedjs_page').first()).toHaveCSS('background-color',mode==='reading'?'rgb(30, 30, 30)':'rgb(255, 255, 255)');
  const pages=await preview.locator('.pagedjs_page').count();expect(pages).toBeGreaterThan(2);
  await expect(page.locator('.ps-warning')).toHaveCount(0);
  // Snapshot source is a clone: capturing it must not rewrite the original note.
  await expect(page.locator('.formatting-test strong').first()).not.toHaveAttribute('style');
  await page.getByRole('combobox',{name:'Preview zoom'}).selectOption('1.5');
  await page.getByRole('button',{name:'Save PDF',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.testOutput?.kind)).toBe('pdf');
  const request=await page.evaluate(()=>window.testOutput);
  await writeFile(info.outputPath('formatting-request.json'),JSON.stringify(request));
  expect(request.html).not.toContain('<script');
  const output=await browser.newPage();await output.setContent(request.html);await output.evaluate(()=>document.fonts.ready);
  if(mode!=='studio')await expect(output.getByText('BOLD-CHECK',{exact:true})).toHaveCSS('color','rgb(170, 35, 50)');
  const pdf=info.outputPath('formatting.pdf');await output.pdf({path:pdf,preferCSSPageSize:true,printBackground:true});
  const pdfInfo=execFileSync('pdfinfo',[pdf],{encoding:'utf8'});
  expect(Number(pdfInfo.match(/Pages:\s+(\d+)/)![1])).toBe(pages);
  const text=execFileSync('pdftotext',['-layout',pdf,'-'],{encoding:'utf8'});
  for(const marker of ['BOLD-CHECK','ITALIC-CHECK','PLUGIN-CHECK','HIGHLIGHT-CHECK','INLINE-CHECK','FORMATTING-END'])expect(text).toContain(marker);
  for(let i=0;i<32;i++)expect(text.match(new RegExp(`STYLE-ROW-${String(i).padStart(2,'0')}`,'g'))).toHaveLength(1);
  // Rasterize the actual PDF, not just the DOM screenshot, for visual review.
  execFileSync('pdftoppm',['-f','1','-singlefile','-scale-to','1200','-png',pdf,info.outputPath('formatting-page-1')]);
  await info.attach(`${mode} PDF`,{path:pdf,contentType:'application/pdf'});
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export HTML',exact:true}).click();
  const html=await readFile((await (await download).path())!,'utf8');
  expect(html).toBe(request.html);await writeFile(info.outputPath('formatting.html'),html);
  await page.getByRole('button',{name:'Print',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.testOutput?.kind)).toBe('print');expect(await page.evaluate(()=>window.testOutput.html)).toBe(html);
  await output.close();
});

test('custom CSS overrides preserved styles, stays within content, validates, saves and undoes',async({page,browser},info)=>{
  await page.goto('/test.html?formatting');await ready(page);
  await page.locator('[data-section="Custom CSS"] summary').click();
  const css=page.getByRole('textbox',{name:'Print CSS',exact:true});
  await css.fill('strong { color: #cc00cc; } .ps-page-header, body, .ps-actions { color: red; } mark { background-color: #00ffff; }');
  await page.getByRole('switch',{name:'Enable custom CSS',exact:true}).click();await ready(page);
  const preview=page.frameLocator('.ps-frame');
  await expect(preview.getByText('BOLD-CHECK',{exact:true})).toHaveCSS('color','rgb(204, 0, 204)');
  await expect(preview.getByText('HIGHLIGHT-CHECK',{exact:true})).toHaveCSS('background-color','rgb(0, 255, 255)');
  await expect(preview.locator('.ps-page-header').first()).toHaveCSS('color','rgb(53, 76, 73)');
  expect(await page.evaluate(()=>(window.testSaved as {presets:Array<{customCssEnabled:boolean}>}).presets[0].customCssEnabled)).toBe(true);
  await css.fill('p { position: fixed; }');await expect(css).toHaveAttribute('aria-invalid','true');
  await expect(page.getByRole('button',{name:'Save PDF',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Undo change',exact:true}).click();await ready(page);
  await expect(preview.getByText('BOLD-CHECK',{exact:true})).toHaveCSS('color','rgb(204, 0, 204)');
  await page.getByRole('button',{name:'Save PDF',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.testOutput?.kind)).toBe('pdf');
  const output=await browser.newPage();await output.setContent(await page.evaluate(()=>window.testOutput.html));
  await expect(output.getByText('BOLD-CHECK',{exact:true})).toHaveCSS('color','rgb(204, 0, 204)');
  await output.pdf({path:info.outputPath('custom-css.pdf'),preferCSSPageSize:true,printBackground:true});await output.close();
  await page.getByRole('switch',{name:'Enable custom CSS',exact:true}).click();await ready(page);
  await expect(preview.getByText('BOLD-CHECK',{exact:true})).toHaveCSS('color','rgb(170, 35, 50)');
});

test('CSS strings cannot introduce markup when the paginated document is serialized',async({page,browser})=>{
  await page.goto('/test.html?formatting');await ready(page);
  await page.locator('[data-section="Custom CSS"] summary').click();
  await page.getByRole('textbox',{name:'Print CSS',exact:true}).fill('strong {font-family:"</style><script>window.injected=true</script><style>";color:#123456}');
  await page.getByRole('switch',{name:'Enable custom CSS',exact:true}).click();await ready(page);
  await page.getByRole('button',{name:'Save PDF',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.testOutput?.kind)).toBe('pdf');
  const html=await page.evaluate(()=>window.testOutput.html);expect(html).not.toContain('<script');
  const output=await browser.newPage();await output.setContent(html);
  await expect(output.locator('script')).toHaveCount(0);await expect(output.getByText('BOLD-CHECK',{exact:true})).toHaveCSS('color','rgb(18, 52, 86)');
  await output.close();
});

test('appearance switching and typography reuse snapshots; refresh picks up changed snippets',async({page})=>{
  await page.goto('/test.html?formatting');await ready(page);
  await page.locator('[data-section="Content"] summary').click();
  const appearance=page.getByRole('combobox',{name:'Note appearance',exact:true});
  await appearance.selectOption('studio');await ready(page);
  const bold=page.frameLocator('.ps-frame').getByText('BOLD-CHECK',{exact:true});await expect(bold).toHaveCSS('color','rgb(38, 39, 39)');
  await appearance.selectOption('reading');await ready(page);await expect(bold).toHaveCSS('color','rgb(170, 35, 50)');
  await page.locator('[data-section="Typography"] summary').click();
  await page.getByRole('spinbutton',{name:'Font size (pt)',exact:true}).fill('14');await page.getByRole('spinbutton',{name:'Font size (pt)',exact:true}).press('Tab');await ready(page);
  await expect(page.frameLocator('.ps-frame').getByText('PLUGIN-CHECK',{exact:true})).toHaveCSS('font-size','28px');
  expect(await page.evaluate(()=>window.testReads)).toBe(1);
  await page.addStyleTag({content:'.formatting-test strong{color:rgb(0,100,200)}'});
  await page.getByRole('button',{name:'Refresh note',exact:true}).click();await ready(page);
  await expect(bold).toHaveCSS('color','rgb(0, 100, 200)');expect(await page.evaluate(()=>window.testReads)).toBe(2);
});

test('restore defaults confirms, preserves custom presets, persists and supports undo and redo',async({page})=>{
  await page.goto('/test.html');await ready(page);
  await page.getByRole('textbox',{name:'Preset name',exact:true}).fill('Edited original');
  await page.getByRole('button',{name:'Preset settings',exact:true}).click();
  await page.getByRole('menuitem',{name:'Duplicate preset',exact:true}).click();
  const select=page.getByRole('combobox',{name:'Preset',exact:true});const custom=await select.inputValue();
  await page.getByRole('button',{name:'Preset settings',exact:true}).click();
  await page.getByRole('menuitem',{name:'Restore built-in presets',exact:true}).click();
  const dialog=page.getByRole('dialog');await expect(dialog.getByRole('button',{name:'Cancel',exact:true})).toBeFocused();
  await page.keyboard.press('Escape');await expect(select).toContainText('Edited original');
  await page.getByRole('button',{name:'Preset settings',exact:true}).click();
  await page.getByRole('menuitem',{name:'Restore built-in presets',exact:true}).click();await dialog.getByRole('button',{name:'Restore',exact:true}).click();
  await expect(select).toHaveValue(custom);await expect(select).toContainText('Studio letterhead');await expect(select).toContainText('Edited original copy');
  expect(await page.evaluate(()=>(window.testSaved as {presets:unknown[]}).presets.length)).toBe(4);
  await page.getByRole('button',{name:'Undo change',exact:true}).click();await expect(select).toContainText('Edited original');
  await page.getByRole('button',{name:'Redo change',exact:true}).click();await expect(select).toContainText('Studio letterhead');
});

test('custom parent typography inherits through ordinary nested text while explicit accents survive',async({page})=>{
  await page.goto('/test.html?formatting');await ready(page);
  await page.locator('[data-section="Custom CSS"] summary').click();
  await page.getByRole('textbox',{name:'Print CSS',exact:true}).fill('.ps-content { font-size: 20px; font-family: monospace; } p { color: #123456; }');
  await page.getByRole('switch',{name:'Enable custom CSS',exact:true}).click();await ready(page);
  const frame=page.frameLocator('.ps-frame');
  await expect(frame.getByText('BOLD-CHECK',{exact:true})).toHaveCSS('font-size','20px');
  await expect(frame.getByText('BOLD-CHECK',{exact:true})).toHaveCSS('font-family','monospace');
  await expect(frame.getByText('BOLD-CHECK',{exact:true})).toHaveCSS('color','rgb(170, 35, 50)');
  await expect(frame.getByText('PLUGIN-CHECK',{exact:true})).toHaveCSS('font-size','30px');
  await expect(frame.locator('p').first()).toHaveCSS('color','rgb(18, 52, 86)');
});
