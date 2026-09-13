import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';

for(const paper of ['A4','Letter'])for(const orientation of ['portrait','landscape'])for(const firstPage of [false,true]) {
  test(`${paper} ${orientation}${firstPage?' first-page letterhead':''}: all content and page furniture survive PDF export`,async({page,browser},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`/test.html?paper=${paper}&orientation=${orientation}${firstPage?'&firstPage':''}`);
    await expect(page.getByRole('status')).toContainText('Ready to print');
    const preview=page.frameLocator('.ps-frame');
    const pages=await preview.locator('.pagedjs_page').count();
    expect(pages).toBeGreaterThan(2);
    expect(await preview.locator('.ps-check').allTextContents()).toEqual(['☑\uFE0E','☐']);
    await expect(preview.locator('.ps-page-header')).toHaveCount(pages);
    await expect(preview.locator('.ps-page-footer')).toHaveCount(pages);
    await expect(preview.locator('.ps-logo')).toHaveCount(firstPage?1:pages);
    await expect(page.locator('.ps-warning')).toHaveCount(0);
    if(firstPage) {
      await expect(preview.locator('.ps-page-header').first()).toContainText('FIRST-PAGE HEADER');
      await expect(preview.locator('.ps-page-header').first()).toContainText('Acme');
      const tops=await preview.locator('.pagedjs_area').evaluateAll(areas=>areas.slice(0,2).map(area=>area.getBoundingClientRect().top-area.closest('.pagedjs_page')!.getBoundingClientRect().top));
      expect(tops[0]-tops[1]).toBeGreaterThan(70);
    }
    expect(await preview.locator('img').evaluateAll(images=>images.every(img=>(img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth>0))).toBe(true);
    const manual=preview.getByRole('heading',{name:'MANUAL-BREAK-START'});
    expect(await manual.evaluate(el=>{const area=el.closest('.pagedjs_area')!;return el.getBoundingClientRect().top-area.getBoundingClientRect().top;})).toBeLessThan(10);
    await page.getByRole('combobox',{name:'Preview zoom'}).selectOption('1.5');
    await page.getByRole('button',{name:'Next page',exact:true}).click();
    await expect(page.getByRole('spinbutton',{name:'Page',exact:true})).toHaveValue('2');
    const downloadPromise=page.waitForEvent('download');
    await page.getByRole('button',{name:'Export HTML',exact:true}).click();
    const download=await downloadPromise;
    const html=await readFile((await download.path())!,'utf8');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('zoom: 1.5');
    const output=await browser.newPage();
    await output.setContent(html);
    await output.evaluate(()=>document.fonts.ready);
    await expect(output.locator('.pagedjs_page')).toHaveCount(pages);
    const pdf=testInfo.outputPath(`${paper}-${orientation}.pdf`);
    await output.pdf({path:pdf,preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false,margin:{top:0,bottom:0,left:0,right:0}});
    const info=execFileSync('pdfinfo',[pdf],{encoding:'utf8'});
    expect(Number(info.match(/Pages:\s+(\d+)/)?.[1])).toBe(pages);
    const dimensions=info.match(/Page size:\s+([\d.]+) x ([\d.]+)/)!;
    const size=paper==='A4'?[595.28,841.89]:[612,792];if(orientation==='landscape')size.reverse();
    expect(Math.abs(Number(dimensions[1])-size[0])).toBeLessThan(1);
    expect(Math.abs(Number(dimensions[2])-size[1])).toBeLessThan(1);
    const text=execFileSync('pdftotext',['-layout',pdf,'-'],{encoding:'utf8'});
    for(let i=1;i<=65;i++)expect(text.match(new RegExp(`ROW-${String(i).padStart(3,'0')}`,'g'))).toHaveLength(1);
    for(let i=1;i<=12;i++)expect(text.match(new RegExp(`PARAGRAPH-${String(i).padStart(3,'0')}`,'g'))).toHaveLength(1);
    expect(text).toContain('END-OF-DOCUMENT');
    const furniture=execFileSync('pdftotext',['-raw',pdf,'-'],{encoding:'utf8'}).replace(/\s+/g,' ');
    expect(furniture.match(/PRINT-CHECK HEADER/g)).toHaveLength(firstPage?pages-1:pages);
    if(firstPage)expect(furniture.match(/FIRST-PAGE HEADER/g)).toHaveLength(1);
    expect(furniture.match(/PRINT-CHECK FOOTER/g)).toHaveLength(pages);
    for(let i=1;i<=pages;i++)expect(text).toMatch(new RegExp(`${i}\\s*/\\s*${pages}`));
    expect(text).toContain('Completed checklist item');expect(text).toContain('Pending checklist item');
    await testInfo.attach('Generated PDF',{path:pdf,contentType:'application/pdf'});
    await output.close();expect(errors).toEqual([]);
  });
}

test('preset transfers, navigation, theme changes and narrow layouts',async({page})=>{
  await page.goto('/test.html');await expect(page.getByRole('status')).toContainText('Ready to print');
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('combobox',{name:'Export presets',exact:true}).selectOption('current');
  const backup=await readFile((await (await downloadPromise).path())!,'utf8');
  await page.locator('input[type=file][accept=".json,application/json"]').setInputFiles({name:'preset.json',mimeType:'application/json',buffer:Buffer.from(backup)});
  await expect(page.getByRole('combobox',{name:'Preset',exact:true})).toContainText('Studio letterhead (imported)');
  await expect(page.getByRole('status')).toContainText('Ready to print');
  await page.getByRole('spinbutton',{name:'Page',exact:true}).fill('3');
  await page.getByRole('spinbutton',{name:'Page',exact:true}).press('Enter');
  await expect(page.getByRole('spinbutton',{name:'Page',exact:true})).toHaveValue('3');
  await page.getByRole('combobox',{name:'Preview zoom'}).selectOption('2');
  await expect(page.frameLocator('.ps-frame').locator('.pagedjs_pages')).toHaveCSS('zoom','2');
  await page.getByRole('combobox',{name:'Preview zoom'}).selectOption('fit');
  await page.evaluate(()=>document.body.classList.replace('theme-dark','theme-light'));
  await expect(page.frameLocator('.ps-frame').locator('html')).toHaveCSS('color-scheme','light');
  await page.setViewportSize({width:600,height:850});
  expect(await page.locator('.ps-studio').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.locator('input[type=file][accept=".json,application/json"]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{}')});
  await expect.poll(()=>page.evaluate(()=>window.testNotices.at(-1))).toContain('not supported');
  await expect(page.getByRole('combobox',{name:'Preset',exact:true}).locator('option')).toHaveCount(4);
});

test('layout changes retain the page and use cached note content; refresh rereads it',async({page})=>{
  await page.goto('/test.html');await expect(page.getByRole('status')).toContainText('Ready to print');
  const current=page.getByRole('spinbutton',{name:'Page',exact:true});
  await current.fill('3');await current.press('Enter');
  await page.getByRole('textbox',{name:'Company name',exact:true}).fill('Updated company');
  await expect(page.getByRole('status')).toContainText('Ready to print');
  await expect(current).toHaveValue('3');expect(await page.evaluate(()=>window.testReads)).toBe(1);
  const top=await page.frameLocator('.ps-frame').locator('.pagedjs_page').nth(2).evaluate(el=>el.getBoundingClientRect().top);
  expect(Math.abs(top)).toBeLessThan(3);
  await page.getByRole('button',{name:'Refresh note',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Ready to print');
  expect(await page.evaluate(()=>window.testReads)).toBe(2);await expect(current).toHaveValue('3');
});

test('clipped furniture and oversized table rows produce page links and useful advice',async({page})=>{
  await page.goto('/test.html?overflow');await expect(page.getByRole('status')).toContainText('Ready to print');
  const warnings=page.locator('.ps-warning');
  await expect(warnings.filter({hasText:'Header text or logo is clipped'}).first()).toBeVisible();
  await expect(warnings.filter({hasText:'Footer text is clipped'}).first()).toBeVisible();
  await expect(warnings.filter({hasText:'A table row overflows'}).first()).toBeVisible();
  const link=warnings.filter({hasText:'A table row overflows'}).first().getByRole('button');
  const number=(await link.innerText()).replace('Page ','');await link.click();
  await expect(page.getByRole('spinbutton',{name:'Page',exact:true})).toHaveValue(number);
});

test('first-page controls, placeholder insertion, and undo/redo work together',async({page})=>{
  await page.goto('/test.html');await expect(page.getByRole('status')).toContainText('Ready to print');
  await page.locator('[data-section="First page"] summary').click();
  await page.getByRole('switch',{name:'Different first-page header',exact:true}).click();
  await expect(page.getByRole('switch',{name:'Different first-page header',exact:true})).toBeFocused();
  const first=page.locator('[data-section="First page"]');
  await first.getByRole('textbox',{name:'Left',exact:true}).fill('For ');
  await first.getByRole('combobox',{name:'Insert placeholder into First page left',exact:true}).selectOption('{{meta:client}}');
  await expect(first.getByRole('textbox',{name:'Left',exact:true})).toHaveValue('For {{meta:client}}');
  await expect(page.getByRole('status')).toContainText('Ready to print');
  await expect(page.frameLocator('.ps-frame').locator('.ps-page-header').first()).toContainText('For Acme');
  await page.getByRole('button',{name:'Undo change',exact:true}).click();
  await expect(first.getByRole('textbox',{name:'Left',exact:true})).toHaveValue('For ');
  await page.getByRole('button',{name:'Redo change',exact:true}).click();
  await expect(first.getByRole('textbox',{name:'Left',exact:true})).toHaveValue('For {{meta:client}}');
});

test('pagination completes when the host stops delivering animation frames',async({page})=>{
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  await page.goto('/test.html');
  await expect(page.getByRole('status')).toContainText('Ready to print');
  expect(await page.frameLocator('.ps-frame').locator('.pagedjs_page').count()).toBeGreaterThan(2);
});

test('preset removal dialog supports cancel, Escape, confirmation and undo',async({page})=>{
  await page.goto('/test.html');
  await expect(page.getByRole('status')).toContainText('Ready to print');
  await page.getByRole('button',{name:'Duplicate preset',exact:true}).click();
  const presets=page.getByRole('combobox',{name:'Preset',exact:true});
  const count=await presets.locator('option').count();
  const remove=page.getByRole('button',{name:'Remove preset',exact:true});
  const dialog=page.getByRole('dialog',{name:'Remove preset',exact:true});
  await remove.click();
  await expect(dialog.getByRole('button',{name:'Cancel',exact:true})).toBeFocused();
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(presets.locator('option')).toHaveCount(count);
  await expect(remove).toBeFocused();
  await remove.click();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(presets.locator('option')).toHaveCount(count);
  await remove.click();
  await dialog.getByRole('button',{name:'Remove',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(presets.locator('option')).toHaveCount(count-1);
  await page.getByRole('button',{name:'Undo change',exact:true}).click();
  await expect(presets.locator('option')).toHaveCount(count);
});
