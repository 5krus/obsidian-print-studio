import {test,expect} from '@playwright/test';

test('table columns retain readable labels across pages, preview sizes and exported HTML',async({page,browser})=>{
  await page.goto('/test.html?tables');
  await expect(page.getByRole('status')).toContainText('Ready to print');
  await page.getByRole('combobox',{name:'Preview zoom'}).selectOption('1');
  const frame=page.frames()[1];
  const geometry=()=>frame.evaluate(()=>[...document.querySelectorAll<HTMLTableElement>('.pagedjs_page_content table')].map(table=>({
    width:table.getBoundingClientRect().width,
    cells:[...table.rows[0].cells].map(cell=>cell.getBoundingClientRect().width),
    overflow:table.getBoundingClientRect().right-table.closest('.pagedjs_page_content')!.getBoundingClientRect().right,
  })));
  const before=await geometry(),fragments=before.filter(table=>table.cells.length===3);
  expect(fragments.length).toBeGreaterThan(2);
  for(const table of fragments){
    expect(table.cells[1]).toBeGreaterThan(90);
    table.cells.forEach((width,index)=>expect(Math.abs(width-fragments[0].cells[index])).toBeLessThan(1));
  }
  for(const table of before)expect(table.overflow).toBeLessThan(1);
  const text=await frame.locator('.ps-content').allTextContents();
  for(let i=0;i<60;i++)expect(text.join('')).toContain(`TABLE-ROW-${i}`);
  expect(text.join('')).toContain('LONGREFERENCE'.repeat(80));
  await page.setViewportSize({width:600,height:900});
  expect(await geometry()).toEqual(before);
  await page.getByRole('button',{name:'Export HTML',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.testExport)).toBeTruthy();
  const output=await browser.newPage({viewport:{width:900,height:1200}});
  try {
    await output.setContent(await page.evaluate(()=>window.testExport));
    const exported=await output.locator('.pagedjs_page_content table').evaluateAll(tables=>tables.map(table=>[...(table as HTMLTableElement).rows[0].cells].map(cell=>cell.getBoundingClientRect().width)));
    expect(exported).toEqual(before.map(table=>table.cells));
  }finally{await output.close();}
});
