import {test,expect,type Locator} from '@playwright/test';
import {execFileSync} from 'node:child_process';

async function checkRows(rows:Locator) {
  await expect(rows).toHaveCount(72);
  const measurements=await rows.evaluateAll(elements=>elements.map(element=>{
    const row=element.getBoundingClientRect(),title=element.firstElementChild!.getBoundingClientRect(),number=element.lastElementChild!.getBoundingClientRect();
    const leader=getComputedStyle(element,'::after'),style=getComputedStyle(element),page=element.closest('.pagedjs_page_content')!.getBoundingClientRect();
    return {display:style.display,content:leader.content,border:leader.borderBottomStyle,width:parseFloat(leader.width),right:row.right-number.right,gap:number.left-title.right,number:element.lastElementChild!.textContent,children:element.children.length,top:Math.min(title.top,number.top)-page.top,bottom:page.bottom-Math.max(title.bottom,number.bottom)};
  }));
  measurements.forEach((row,index)=>{
    expect(row.display).toBe('flex');expect(row.content).toBe('""');expect(row.border).toBe('dotted');
    if(index%9!==0)expect(row.width).toBeGreaterThan(100);
    expect(Math.abs(row.right),JSON.stringify({index,...row})).toBeLessThan(1);expect(row.gap).toBeGreaterThan(0);
    expect(row.number).toBe(String(index+3));expect(row.children).toBe(2);
    expect(row.top).toBeGreaterThanOrEqual(-1);expect(row.bottom).toBeGreaterThanOrEqual(-1);
  });
}

for(const mode of ['studio','text','reading'])test(`${mode}: TOC leaders and page numbers survive pagination and PDF export`,async({page,browser},info)=>{
  await page.goto(`/test.html?formatting&toc&mode=${mode}`);
  await expect(page.getByRole('status')).toContainText('Ready to print');
  const preview=page.frameLocator('.ps-frame');
  expect(await preview.locator('.pagedjs_page').count()).toBeGreaterThan(2);
  await checkRows(preview.locator('.pagedjs_page .toc-line'));
  await page.getByRole('button',{name:'Save PDF',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.testOutput?.kind)).toBe('pdf');
  const output=await browser.newPage();await output.setContent(await page.evaluate(()=>window.testOutput.html));
  await checkRows(output.locator('.toc-line'));
  const pdf=info.outputPath('toc.pdf');await output.pdf({path:pdf,preferCSSPageSize:true,printBackground:true});
  const text=execFileSync('pdftotext',['-layout',pdf,'-'],{encoding:'utf8'});
  for(let index=0;index<72;index++)expect(text.match(new RegExp(`TOC-${String(index).padStart(2,'0')}`,'g'))).toHaveLength(1);
  execFileSync('pdftoppm',['-f','1','-singlefile','-scale-to','1200','-png',pdf,info.outputPath('toc-page-1')]);
  await output.close();
});
