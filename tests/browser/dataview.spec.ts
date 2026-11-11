import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';

for(const mode of ['studio','text','reading']) {
  test(`Dataview values reach preview, HTML, PDF and print in ${mode} mode`,async({page,browser},testInfo)=>{
    await page.goto(`/test.html?dataview&mode=${mode}`);
    await expect(page.getByRole('status')).toContainText('Ready to print');
    const preview=page.frameLocator('.ps-frame');
    await expect(preview.locator('h1')).toHaveText('Sample Salve · v2');
    await expect(preview.getByText('Complex expression: 3',{exact:true})).toBeVisible();
    await expect(preview.locator('pre code')).toHaveText('=this.name');
    await expect(preview.getByText('const value = 2',{exact:true})).toBeVisible();
    const download=page.waitForEvent('download');
    await page.getByRole('button',{name:'Export HTML',exact:true}).click();
    const html=await readFile((await (await download).path())!,'utf8');
    const output=await browser.newPage();await output.setContent(html);await output.evaluate(()=>document.fonts.ready);
    await expect(output.locator('h1')).toHaveText('Sample Salve · v2');
    const pdf=testInfo.outputPath('dataview.pdf');
    await output.pdf({path:pdf,preferCSSPageSize:true,printBackground:true});
    const text=execFileSync('pdftotext',['-layout',pdf,'-'],{encoding:'utf8'});
    expect(text).toContain('Sample Salve · v2');expect(text).toContain('Complex expression: 3');
    expect(text).not.toContain('=this.version');expect(text).toContain('=this.name');
    for(const [label,kind] of [['Save PDF','pdf'],['Print','print']]) {
      await page.getByRole('button',{name:label,exact:true}).click();
      await expect.poll(()=>page.evaluate(()=>window.testOutput?.kind)).toBe(kind);
      await output.setContent(await page.evaluate(()=>window.testOutput.html));
      await expect(output.locator('h1')).toHaveText('Sample Salve · v2');
    }
    await output.close();
  });
}

test('disabled inline queries remain literal in preview and HTML export',async({page,browser})=>{
  await page.goto('/test.html?dataview&disabled');
  await expect(page.getByRole('status')).toContainText('Ready to print');
  await expect(page.frameLocator('.ps-frame').locator('h1')).toHaveText('=this.name · v=this.version');
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export HTML',exact:true}).click();
  const html=await readFile((await (await download).path())!,'utf8');
  const output=await browser.newPage();await output.setContent(html);
  await expect(output.locator('h1')).toHaveText('=this.name · v=this.version');await output.close();
});
