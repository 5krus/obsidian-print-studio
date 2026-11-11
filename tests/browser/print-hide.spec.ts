import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';

for(const mode of ['studio','text','reading']) {
  test(`print-hide omits content from preview, HTML, PDF and print in ${mode} mode`,async({page,browser},testInfo)=>{
    await page.goto(`/test.html?printHide&mode=${mode}`);
    await expect(page.getByRole('status')).toContainText('Ready to print');
    const source=page.locator('.ps-render-source');
    const original=await source.innerHTML();
    await expect(source).toContainText('HIDDEN-INLINE');
    const preview=page.frameLocator('.ps-frame');
    await expect(preview.locator('.pagedjs_page')).toHaveCount(1);
    await expect(preview.locator('.ps-content')).not.toContainText('HIDDEN-');
    await expect(preview.locator('.print-hide,.ps-image-placeholder,.ps-check,.ps-heading-break,.ps-page-break')).toHaveCount(0);
    const visible=['Visible heading','Keep this.','Visible embed','Visible similar class','Visible footer'];
    for(const text of visible)await expect(preview.getByText(text,{exact:true})).toBeVisible();

    const downloadPromise=page.waitForEvent('download');
    await page.getByRole('button',{name:'Export HTML',exact:true}).click();
    const html=await readFile((await (await downloadPromise).path())!,'utf8');
    expect(html).not.toContain('HIDDEN-');
    await writeFile(testInfo.outputPath('print-hide.html'),html);
    const output=await browser.newPage();
    await output.setContent(html);await output.evaluate(()=>document.fonts.ready);
    for(const text of visible)await expect(output.getByText(text,{exact:true})).toBeVisible();
    const pdf=testInfo.outputPath('print-hide.pdf');
    await output.pdf({path:pdf,preferCSSPageSize:true,printBackground:true});
    const text=execFileSync('pdftotext',['-layout',pdf,'-'],{encoding:'utf8'});
    expect(text).not.toContain('HIDDEN-');
    for(const value of visible)expect(text).toContain(value);
    await testInfo.attach('Exported PDF',{path:pdf,contentType:'application/pdf'});
    await output.close();

    for(const [label,kind] of [['Save PDF','pdf'],['Print','print']]) {
      await page.getByRole('button',{name:label,exact:true}).click();
      await expect.poll(()=>page.evaluate(()=>window.testOutput?.kind)).toBe(kind);
      const request=await page.evaluate(()=>window.testOutput);
      expect(request.html).not.toContain('HIDDEN-');
      for(const value of visible)expect(request.html).toContain(value);
    }
    expect(await source.innerHTML()).toBe(original);
  });
}
