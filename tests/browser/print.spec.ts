import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';

test('embedded titles and properties can be hidden without leaving space or changing body content',async({page,browser},testInfo)=>{
  await page.goto('/test.html?embeds');
  await expect(page.getByRole('status')).toContainText('Ready to print');
  await page.getByRole('combobox',{name:'Preview zoom'}).selectOption('1');
  const preview=page.frameLocator('.ps-frame');
  await expect(preview.getByText('Generated embed title',{exact:true})).toBeVisible();
  await expect(preview.locator('.frontmatter')).toContainText('generated-tag');
  const body=preview.getByRole('heading',{name:'Embedded body heading',exact:true});
  const position=()=>body.evaluate(el=>el.getBoundingClientRect().top-el.closest('.pagedjs_area')!.getBoundingClientRect().top);
  const before=await position();
  await page.locator('[data-section="Content"] summary').click();
  const toggle=page.getByRole('switch',{name:'Hide embedded note titles and properties',exact:true});
  await expect(toggle).not.toBeChecked();await toggle.click();
  await expect(page.getByRole('status')).toContainText('Ready to print');
  await expect(preview.locator('.markdown-embed-title,.markdown-embed-link,.frontmatter,.frontmatter-container')).toHaveCount(0);
  expect(await position()).toBeLessThan(before-30);
  for(const value of ['Main document heading','Embedded body heading','#main-tag','#body-tag','Nested body survives','Image caption survives','End of main document'])await expect(preview.getByText(value,{exact:true})).toBeVisible();
  await expect(preview.locator('code')).toContainText('tags: [code-tag]');
  expect(await page.evaluate(()=>window.testReads)).toBe(1);
  expect(await page.evaluate(()=>(window.testSaved as {presets:Array<{hideEmbeddedNoteMetadata:boolean}>}).presets[0].hideEmbeddedNoteMetadata)).toBe(true);
  await page.getByRole('button',{name:'Undo change',exact:true}).click();
  await expect(toggle).not.toBeChecked();
  await expect(preview.getByText('Generated embed title',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Redo change',exact:true}).click();
  await expect(toggle).toBeChecked();
  await expect(page.getByRole('status')).toContainText('Ready to print');
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export HTML',exact:true}).click();
  const html=await readFile((await (await downloadPromise).path())!,'utf8');
  expect(html).not.toContain('Generated embed title');expect(html).not.toContain('generated-tag');
  const output=await browser.newPage();await output.setContent(html);await output.evaluate(()=>document.fonts.ready);
  const pdf=testInfo.outputPath('embedded-notes.pdf');
  await output.pdf({path:pdf,preferCSSPageSize:true,printBackground:true});
  const text=execFileSync('pdftotext',['-layout',pdf,'-'],{encoding:'utf8'});
  expect(text).not.toContain('Generated embed title');expect(text).not.toContain('generated-tag');
  for(const value of ['Embedded body heading','#body-tag','code-tag','Nested body survives','End of main document'])expect(text).toContain(value);
  await output.close();
});

test('per-field uppercase resolves placeholders in preview and exports while preserving the note',async({page,browser},testInfo)=>{
  await page.goto('/test.html?uppercase&firstPage');
  await expect(page.getByRole('status')).toContainText('Ready to print');
  const preview=page.frameLocator('.ps-frame');
  const header=preview.locator('.ps-page-header').nth(1);
  const footer=preview.locator('.ps-page-footer').first();
  const first=preview.locator('.ps-page-header').first();
  await expect(header.locator('.left')).toHaveText('Example');
  await expect(footer.locator('.left')).toHaveText('13 Sep 2026');
  for(const section of ['Header','Footer','First page']) {
    const controls=page.locator(`[data-section="${section}"]`);
    await controls.locator('summary').click();
    for(const alignment of ['left','center','right']) {
      const toggle=controls.getByRole('switch',{name:`Uppercase ${alignment}`,exact:true});
      await expect(toggle).not.toBeChecked();await toggle.click();
    }
  }
  await expect(page.getByRole('status')).toContainText('Ready to print');
  await expect(header.locator('.left')).toHaveText('EXAMPLE');
  await expect(header.locator('.center')).toHaveText('TEST VAULT');
  await expect(header.locator('.right')).toHaveText('PRINT STUDIO TEST');
  await expect(footer.locator('.left')).toHaveText('13 SEP 2026');
  await expect(footer.locator('.center')).toHaveText('ACME');
  await expect(footer.locator('.right')).toHaveText('PAGE 1 / 2');
  await expect(first.locator('.left')).toHaveText('PREPARED FOR CAFÉ');
  await expect(first.locator('.center')).toHaveText('EXAMPLE');
  await expect(first.locator('.right')).toHaveText('ACME');
  await expect(preview.getByRole('heading',{name:'Example',exact:true})).toBeVisible();
  await expect(preview.getByText('Mixed case body stays unchanged.',{exact:true})).toBeVisible();
  const controls=page.locator('[data-section="Header"]');
  await expect(controls.getByRole('textbox',{name:'Left',exact:true})).toHaveValue('{{title}}');
  const saved=await page.evaluate(()=>window.testSaved) as {presets:Array<{headerUppercase:unknown;footerUppercase:unknown;firstPageHeaderUppercase:unknown}>};
  for(const key of ['headerUppercase','footerUppercase','firstPageHeaderUppercase'] as const)expect(saved.presets[0][key]).toEqual({left:true,center:true,right:true});
  await controls.getByRole('switch',{name:'Uppercase left',exact:true}).click();
  await expect(header.locator('.left')).toHaveText('Example');
  await expect(header.locator('.center')).toHaveText('TEST VAULT');
  await expect(first.locator('.center')).toHaveText('EXAMPLE');
  await page.getByRole('button',{name:'Undo change',exact:true}).click();
  await expect(header.locator('.left')).toHaveText('EXAMPLE');
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export HTML',exact:true}).click();
  const html=await readFile((await (await downloadPromise).path())!,'utf8');
  const output=await browser.newPage();
  await output.setContent(html);await output.evaluate(()=>document.fonts.ready);
  await expect(output.locator('.ps-page-header').nth(1).locator('.left')).toHaveText('EXAMPLE');
  const pdf=testInfo.outputPath('uppercase.pdf');
  await output.pdf({path:pdf,preferCSSPageSize:true,printBackground:true});
  const text=execFileSync('pdftotext',['-layout',pdf,'-'],{encoding:'utf8'});
  for(const value of ['EXAMPLE','13 SEP 2026','ACME','PREPARED FOR CAFÉ','Example','Mixed case body stays unchanged.'])expect(text).toContain(value);
  await output.close();
});

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
    // Exercise the production Save PDF message path, including snapshotting at
    // non-default preview zoom. The desktop adapter receives the chosen preset.
    await page.getByRole('button',{name:'Save PDF',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>window.testOutput?.kind)).toBe('pdf');
    const request=await page.evaluate(()=>window.testOutput);
    expect(request.preset.paper).toBe(paper);expect(request.preset.orientation).toBe(orientation);
    expect(request.html).not.toContain('<script');expect(request.html).not.toContain('zoom: 1.5');
    expect(request.html).toContain("script-src 'none'");
    await writeFile(testInfo.outputPath('native-request.json'),JSON.stringify(request));
    await output.setContent(request.html);await output.evaluate(()=>document.fonts.ready);
    const direct=testInfo.outputPath('direct.pdf');
    await output.pdf({path:direct,format:request.preset.paper,landscape:orientation==='landscape',preferCSSPageSize:true,scale:1,printBackground:true,displayHeaderFooter:false,margin:{top:0,bottom:0,left:0,right:0}});
    const directInfo=execFileSync('pdfinfo',['-f','1','-l',String(pages),direct],{encoding:'utf8'});
    expect(Number(directInfo.match(/Pages:\s+(\d+)/)?.[1])).toBe(pages);
    const allSizes=[...directInfo.matchAll(/Page\s+\d+ size:\s+([\d.]+) x ([\d.]+)/g)];
    expect(allSizes).toHaveLength(pages);
    for(const dimensions of allSizes){expect(Math.abs(Number(dimensions[1])-size[0])).toBeLessThan(1);expect(Math.abs(Number(dimensions[2])-size[1])).toBeLessThan(1);}
    expect(execFileSync('pdftotext',['-layout',direct,'-'],{encoding:'utf8'})).toBe(text);
    await page.getByRole('button',{name:'Print',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>window.testOutput?.kind)).toBe('print');
    expect(await page.evaluate(()=>window.testOutput.preset.paper)).toBe(paper);
    expect(await page.evaluate(()=>window.testOutput.html)).toBe(request.html);
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


for(const options of ['', '&paper=Letter&orientation=landscape', '&firstPage&top', '&noBreak', '&longCover']) {
  test(`bottom-aligned cover preserves content and following page ${options}`,async({page,browser},testInfo)=>{
    await page.goto(`/test.html?cover${options}`);
    await expect(page.getByRole('status')).toContainText('Ready to print');
    await page.getByRole('combobox',{name:'Preview zoom'}).selectOption('1');
    const preview=page.frameLocator('.ps-frame');
    const author=preview.getByText('COVER-AUTHOR',{exact:true});
    await expect(author).toHaveCount(1);
    const gap=await author.evaluate(el=>el.closest('.pagedjs_area')!.getBoundingClientRect().bottom-el.getBoundingClientRect().bottom);
    expect(Math.abs(gap)).toBeLessThan(2);
    if(options.includes('top')) {
      const top=preview.getByText('TOP-ANCHOR',{exact:true});
      expect(await top.evaluate(el=>el.getBoundingClientRect().top-el.closest('.pagedjs_area')!.getBoundingClientRect().top)).toBeLessThan(2);
    }
    if(!options.includes('noBreak')) {
      const body=preview.getByRole('heading',{name:'BODY-START'});
      expect(await body.evaluate(el=>el.getBoundingClientRect().top-el.closest('.pagedjs_area')!.getBoundingClientRect().top)).toBeLessThan(2);
      expect(await body.evaluate(el=>el.closest('.pagedjs_page')!.getAttribute('data-page-number'))).not.toBe(await author.evaluate(el=>el.closest('.pagedjs_page')!.getAttribute('data-page-number')));
    }
    if(!options.includes('longCover'))await expect(preview.locator('.pagedjs_page')).toHaveCount(options.includes('noBreak')?1:2);
    await expect(preview.locator('.ps-bottom-marker')).toHaveCount(0);
    const downloadPromise=page.waitForEvent('download');
    await page.getByRole('button',{name:'Export HTML',exact:true}).click();
    const html=await readFile((await (await downloadPromise).path())!,'utf8');
    const output=await browser.newPage();await output.setContent(html);await output.evaluate(()=>document.fonts.ready);
    const exported=output.getByText('COVER-AUTHOR',{exact:true});
    expect(Math.abs(await exported.evaluate(el=>el.closest('.pagedjs_area')!.getBoundingClientRect().bottom-el.getBoundingClientRect().bottom))).toBeLessThan(2);
    const pdf=testInfo.outputPath('cover.pdf');
    await output.pdf({path:pdf,preferCSSPageSize:true,printBackground:true});
    const text=execFileSync('pdftotext',['-layout',pdf,'-'],{encoding:'utf8'});
    expect(text.match(/COVER-AUTHOR/g)).toHaveLength(1);
    expect(text.match(/COVER-TITLE/g)).toHaveLength(1);
    if(options.includes('longCover'))for(let i=0;i<45;i++)expect(text.match(new RegExp(`COVER-ROW-${i}\\b`,'g'))).toHaveLength(1);
    expect(text).not.toContain('&&&&');
    await output.close();
  });
}
