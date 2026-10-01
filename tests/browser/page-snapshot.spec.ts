import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';

const setup=async(page:import('@playwright/test').Page,body:string)=>{
  await page.setContent(body);await page.addScriptTag({path:'build/snapshot-test.js'});
  await page.addStyleTag({content:await page.evaluate(()=>window.snapshotCss)});
  await page.addStyleTag({content:'body{margin:0;font:12px/18px Arial,sans-serif}p{margin:0}.pagedjs_page{width:700px;height:900px;overflow:hidden}.pagedjs_page_content{width:360px;column-width:360px;column-fill:auto;column-gap:1000px}'});
};

// Measure real glyphs rather than just checking that the original text exists.
function words(root:HTMLElement) {
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),range=document.createRange();
  const result:Array<{text:string;x:number;y:number;width:number;color:string;background:string;font:string}>=[];
  let node:Node|null;
  while((node=walker.nextNode()))for(const word of (node.textContent??'').matchAll(/\S+/gu)) {
    range.setStart(node,word.index);range.setEnd(node,word.index+word[0].length);
    const rect=range.getBoundingClientRect(),style=getComputedStyle(node.parentElement!);
    result.push({text:word[0],x:rect.x,y:rect.y,width:rect.width,color:style.color,background:style.backgroundColor,font:style.font});
  }
  return result;
}

test('whole-paragraph inline formatting survives every frozen line',async({page},info)=>{
  await setup(page,`<div class="pagedjs_page"><div class="pagedjs_page_content"><p><span class="ftc-colored" style="color:#e90064;background-color:#f8e7ed;font:18px/1.5 Georgia,serif"><em>${'Long colored paragraphs must retain the same formatting on every wrapped line. '.repeat(7)}</em></span></p></div></div>`);
  const block=page.locator('p');const before=await block.evaluate(words);
  expect(new Set(before.map(word=>word.y)).size).toBeGreaterThan(3);
  await page.screenshot({path:info.outputPath('paragraph-before-freeze.png')});
  await page.evaluate(()=>window.freezeSnapshot());
  await page.screenshot({path:info.outputPath('paragraph-after-freeze.png')});
  const after=await block.evaluate(words);
  expect(after.map(({text,color,font})=>({text,color,font}))).toEqual(before.map(({text,color,font})=>({text,color,font})));
  after.forEach((word,index)=>{expect(Math.abs(word.x-before[index].x)).toBeLessThan(1);expect(Math.abs(word.y-before[index].y)).toBeLessThan(1);});
});

test('justification preserves soft-line spacing and leaves the final and explicit-break lines natural',async({page},info)=>{
  await setup(page,`<div class="pagedjs_page"><div class="pagedjs_page_content"><p style="text-align:justify">${'Natural justified text has evenly aligned edges and ordinary final lines. '.repeat(4)}Short end.<br>Explicit short line.<br>${'Another paragraph segment should retain its justified wrapping. '.repeat(3)}Final words.</p></div></div>`);
  const block=page.locator('p');const before=await block.evaluate(words);
  await page.screenshot({path:info.outputPath('justified-before-freeze.png')});
  await page.evaluate(()=>window.freezeSnapshot());
  await page.screenshot({path:info.outputPath('justified-after-freeze.png')});
  const after=await block.evaluate(words);
  expect(after.map(word=>word.text)).toEqual(before.map(word=>word.text));
  after.forEach((word,index)=>{expect(Math.abs(word.x-before[index].x)).toBeLessThan(1);expect(Math.abs(word.y-before[index].y)).toBeLessThan(1);});
});

test('page continuations justify the last soft wrap but leave explicit breaks natural',async({page})=>{
  await setup(page,`<div class="pagedjs_page"><div class="pagedjs_page_content"><p data-split-to="continued" style="text-align:justify;text-align-last:justify">Short explicit line.<br><br>${'A paragraph can continue on another page. '.repeat(3)}More words</p></div></div>`);
  await page.evaluate(()=>window.freezeSnapshot());
  const lines=page.locator('.ps-fixed-line');
  const ratios=await lines.evaluateAll(elements=>elements.map(element=>{
    const range=document.createRange();range.selectNodeContents(element);
    return range.getBoundingClientRect().width/element.getBoundingClientRect().width;
  }));
  expect(ratios[0]).toBeLessThan(.5);expect(ratios.at(-1)).toBeGreaterThan(.99);
});

test('finished line breaks survive a new output window without losing the final amount to an overflow column',async({page,browser},testInfo)=>{
  await setup(page,`<div class="pagedjs_page"><div class="pagedjs_page_content"><p>${'Consistent preview and output protect every word. '.repeat(8)}The reporting threshold is <strong style="white-space:nowrap">$200M in ARR.</strong></p></div></div>`);
  const paragraph=page.locator('p');
  const original=await paragraph.textContent();
  const height=await paragraph.evaluate(p=>p.getBoundingClientRect().height);
  await page.locator('.pagedjs_page_content').evaluate((e,h)=>(e as HTMLElement).style.height=`${h}px`,height);
  const unfrozen=await page.content();
  await page.evaluate(()=>window.freezeSnapshot());
  const frozen=await page.content();
  const lineText=await paragraph.evaluate(p=>p.innerHTML.split(/<br\s*\/?\s*>/i).map(s=>{const d=document.createElement('div');d.innerHTML=s;return d.textContent}));
  expect(lineText.length).toBeGreaterThan(2);
  // Exaggerate the font-metric change between a scaled editor window and a
  // fresh print window; the visible page size remains exactly the same.
  const output=await browser.newPage();
  const targetInPage=()=>output.locator('strong').evaluate(e=>{
    const r=e.getBoundingClientRect(),p=e.closest('.pagedjs_page')!.getBoundingClientRect();return r.left>=p.left && r.right<=p.right && r.bottom<=p.bottom;
  });
  await output.setContent(unfrozen);await output.addStyleTag({content:'p{font-size:14px}'});
  expect(await targetInPage()).toBe(false); // The pre-fix export loses its tail.
  await output.setContent(frozen);await output.addStyleTag({content:'p{font-size:14px}'});
  expect(await targetInPage()).toBe(true);
  await expect(output.locator('p')).toHaveText(original!);
  const rects=await output.locator('strong').evaluate(e=>[...e.getClientRects()].map(r=>({x:r.x,y:r.y})));
  expect(new Set(rects.map(r=>r.y)).size).toBe(1);
  const pdf=testInfo.outputPath('snapshot.pdf');await output.pdf({path:pdf,preferCSSPageSize:true,printBackground:true});
  const text=execFileSync('pdftotext',['-layout',pdf,'-'],{encoding:'utf8'});
  expect(text.replace(/\s/g,'')).toContain(original!.replace(/\s/g,''));
  expect(text).toContain('$200M in ARR.');
  await output.close();
});

test('freezing preserves explicit and blank lines, inline styles, Unicode, nested lists, tables and media',async({page})=>{
  await setup(page,`<div class="pagedjs_page"><div class="pagedjs_page_content">
    <p>Explicit line<br><br>Blank line remains<br>${'A long styled paragraph with '.repeat(8)}<em>emphasis</em>, <a href="https://example.com">a link</a>, sub<sub>script</sub> and super<sup>script</sup>, café — 日本語 😀.</p>
    <p>https://example.com/${'long-path'.repeat(35)} ${'日本語'.repeat(40)}</p>
    <ul><li><p>${'Nested list paragraph survives wrapping. '.repeat(8)}</p><ul><li>Child item</li></ul></li></ul>
    <table><tbody><tr><td>${'Cell text survives wrapping. '.repeat(8)}</td><td>Another cell</td></tr></tbody></table>
    <pre><code>literal\n  indentation</code></pre><p><img alt="Inline media" width="20" height="20"> Image caption</p>
  </div></div>`);
  const before=await page.locator('.pagedjs_page_content').evaluate(e=>({text:e.textContent,paragraphs:[...e.querySelectorAll('p')].map(p=>p.getBoundingClientRect().height),pre:e.querySelector('pre')!.outerHTML,media:e.querySelector('img')!.outerHTML}));
  await page.evaluate(()=>window.freezeSnapshot());
  const after=await page.locator('.pagedjs_page_content').evaluate(e=>({text:e.textContent,paragraphs:[...e.querySelectorAll('p')].map(p=>p.getBoundingClientRect().height),pre:e.querySelector('pre')!.outerHTML,media:e.querySelector('img')!.outerHTML}));
  expect(after.text).toBe(before.text);expect(after.pre).toBe(before.pre);expect(after.media).toBe(before.media);
  after.paragraphs.forEach((h,i)=>expect(Math.abs(h-before.paragraphs[i])).toBeLessThan(1));
  await expect(page.locator('em')).toHaveText('emphasis');await expect(page.locator('a')).toHaveAttribute('href','https://example.com');
  await expect(page.locator('sub')).toHaveText('script');await expect(page.locator('sup')).toHaveText('script');
  await expect(page.locator('td').first()).toHaveClass('ps-fixed-lines');
  expect(await page.locator('li').first().evaluate(e=>e.classList.contains('ps-fixed-lines'))).toBe(false);
});
