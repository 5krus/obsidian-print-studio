import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';

const setup=async(page:import('@playwright/test').Page,body:string)=>{
  await page.setContent(body);await page.addScriptTag({path:'build/snapshot-test.js'});
  await page.addStyleTag({content:await page.evaluate(()=>window.snapshotCss)});
  await page.addStyleTag({content:'body{margin:0;font:12px/18px Arial,sans-serif}p{margin:0}.pagedjs_page{width:700px;height:900px;overflow:hidden}.pagedjs_page_content{width:360px;column-width:360px;column-fill:auto;column-gap:1000px}'});
};

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
