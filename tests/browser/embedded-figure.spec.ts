import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

for(const paper of ['A4','Letter'])for(const orientation of ['portrait','landscape']) {
  test(`${paper} ${orientation}: embedded figure and following text survive pagination and PDF`,async({page,browser},testInfo)=>{
    await page.goto(`/test.html?figure&paper=${paper}&orientation=${orientation}`);
    await expect(page.getByRole('status')).toContainText('Ready to print');
    const preview=page.frameLocator('.ps-frame');
    const image=preview.getByRole('img',{name:'Embedded square diagram',exact:true});
    await expect(image).toHaveCount(1);
    expect(await image.evaluate((img:HTMLImageElement)=>img.complete && img.naturalWidth===2756)).toBe(true);
    await expect(preview.getByText('FIGURE-CAPTION',{exact:true})).toBeVisible();
    await expect(preview.getByText('AFTER-FIGURE:',{exact:false})).toBeVisible();
    await expect(preview.getByRole('heading',{name:'NEXT-SECTION',exact:true})).toBeVisible();
    for(let i=0;i<10;i++)await expect(preview.getByText(`BEFORE-FIGURE-${i}`,{exact:false})).toHaveCount(1);
    const download=page.waitForEvent('download');
    await page.getByRole('button',{name:'Export HTML',exact:true}).click();
    const html=await readFile((await (await download).path())!,'utf8');
    const output=await browser.newPage();await output.setContent(html);
    await output.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));
    const pdf=testInfo.outputPath('embedded-figure.pdf');
    await output.pdf({path:pdf,preferCSSPageSize:true,printBackground:true});
    const text=execFileSync('pdftotext',['-layout',pdf,'-'],{encoding:'utf8'});
    for(const marker of ['FIGURE-CAPTION','AFTER-FIGURE','NEXT-SECTION',...Array.from({length:10},(_,i)=>`BEFORE-FIGURE-${i}`)])expect(text.split(marker)).toHaveLength(2);
    expect(execFileSync('pdfimages',['-list',pdf],{encoding:'utf8'})).toMatch(/2756\s+2756/);
    await output.close();
  });
}
