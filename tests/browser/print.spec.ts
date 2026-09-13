import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';

for(const paper of ['A4','Letter'])for(const orientation of ['portrait','landscape']) {
  test(`${paper} ${orientation}: all content and page furniture survive PDF export`,async({page,browser},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`/test.html?paper=${paper}&orientation=${orientation}`);
    await expect(page.getByRole('status')).toContainText('Ready to print');
    const preview=page.frameLocator('.ps-frame');
    const pages=await preview.locator('.pagedjs_page').count();
    expect(pages).toBeGreaterThan(2);
    expect(await preview.locator('.ps-check').allTextContents()).toEqual(['☑\uFE0E','☐']);
    await expect(preview.locator('.ps-page-header')).toHaveCount(pages);
    await expect(preview.locator('.ps-page-footer')).toHaveCount(pages);
    await expect(preview.locator('.ps-logo')).toHaveCount(pages);
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
    expect(furniture.match(/PRINT-CHECK HEADER/g)).toHaveLength(pages);
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

test('pagination completes when the host stops delivering animation frames',async({page})=>{
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  await page.goto('/test.html');
  await expect(page.getByRole('status')).toContainText('Ready to print');
  expect(await page.frameLocator('.ps-frame').locator('.pagedjs_page').count()).toBeGreaterThan(2);
});
