import {test,expect,type Locator} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

async function checkParagraphs(paragraphs:Locator) {
  const result=await paragraphs.evaluateAll(elements=>{
    let words=0;const errors:string[]=[];
    for(const paragraph of elements) {
      const bounds=paragraph.closest('.pagedjs_page_content')!.getBoundingClientRect();
      const walker=document.createTreeWalker(paragraph,NodeFilter.SHOW_TEXT),range=document.createRange();
      let node:Node|null;
      while((node=walker.nextNode())) {
        if(!node.textContent?.trim())continue;
        words+=node.textContent.trim().split(/\s+/u).length;
        const style=getComputedStyle(node.parentElement!);
        if(style.color!=='rgb(233, 0, 100)' || !style.fontFamily.includes('Times New Roman'))errors.push(`Lost style: ${node.textContent.slice(0,50)}`);
        if(!node.parentElement!.closest('.ftc-color-default-red'))errors.push('Lost highlight wrapper');
        range.selectNodeContents(node);
        for(const rect of range.getClientRects())if(rect.left<bounds.left-1 || rect.right>bounds.right+1 || rect.bottom>bounds.bottom+1)errors.push(`Outside print margins: ${node.textContent.slice(0,50)}`);
      }
    }
    return {words,errors};
  });
  expect(result.words).toBeGreaterThan(1700);expect(result.errors).toEqual([]);
  // A page break is still a soft wrap, including when Paged.js marks an inline
  // child instead of its paragraph as the last split element.
  const continuations=await paragraphs.evaluateAll(elements=>elements.filter(p=>p.hasAttribute('data-split-to')).map(p=>{
    const line=p.lastElementChild!,range=document.createRange();range.selectNodeContents(line);
    return {text:line.textContent,ratio:range.getBoundingClientRect().width/line.getBoundingClientRect().width};
  }));
  expect(continuations.length).toBeGreaterThan(1);
  for(const line of continuations)expect(line.ratio).toBeGreaterThan(.99);
  // The actual last paragraph line remains short, even after a page split.
  const last=paragraphs.last().locator('.ps-fixed-line').last();
  expect(await last.evaluate(element=>{
    const range=document.createRange();range.selectNodeContents(element);
    return range.getBoundingClientRect().width/element.getBoundingClientRect().width;
  })).toBeLessThan(.9);
}

for(const mode of ['text','reading'])test(`${mode}: long colored and justified paragraphs survive preview, HTML and PDF`,async({page,browser},info)=>{
  await page.goto(`/test.html?formatting&paragraphs&mode=${mode}`);
  await expect(page.getByRole('status')).toContainText('Ready to print');
  const frame=page.frameLocator('.ps-frame');
  const pages=await frame.locator('.pagedjs_page').count();expect(pages).toBeGreaterThan(3);
  await checkParagraphs(frame.locator('.colored-paragraph'));
  await expect(page.locator('.ps-warning')).toHaveCount(0);
  await frame.locator('.pagedjs_page').first().screenshot({path:info.outputPath('paragraph-preview.png')});
  await page.getByRole('combobox',{name:'Preview zoom'}).selectOption('1.5');
  await page.getByRole('button',{name:'Save PDF',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.testOutput?.kind)).toBe('pdf');
  const html=await page.evaluate(()=>window.testOutput.html);
  const output=await browser.newPage();await output.setContent(html);await output.evaluate(()=>document.fonts.ready);
  await checkParagraphs(output.locator('.colored-paragraph'));
  await expect(output.locator('template#ps-line-box')).toHaveCount(0);
  const pdf=info.outputPath('paragraph-formatting.pdf');
  await output.pdf({path:pdf,preferCSSPageSize:true,printBackground:true});
  const pdfInfo=execFileSync('pdfinfo',[pdf],{encoding:'utf8'});
  expect(Number(pdfInfo.match(/Pages:\s+(\d+)/)![1])).toBe(pages);
  const text=execFileSync('pdftotext',['-layout',pdf,'-'],{encoding:'utf8'});
  for(let i=0;i<80;i++)expect(text.replace(/\s/g,'').match(new RegExp(`PARA-${String(i).padStart(3,'0')}`,'g'))).toHaveLength(1);
  expect(text).toContain('LAST-PARAGRAPH-WORD.');
  execFileSync('pdftoppm',['-f','1','-singlefile','-scale-to','1200','-png',pdf,info.outputPath('paragraph-pdf-page-1')]);
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export HTML',exact:true}).click();
  expect(await readFile((await (await download).path())!,'utf8')).toBe(html);
  await writeFile(info.outputPath('paragraph-formatting.html'),html);
  await page.getByRole('button',{name:'Print',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.testOutput?.kind)).toBe('print');expect(await page.evaluate(()=>window.testOutput.html)).toBe(html);
  await output.close();
});
