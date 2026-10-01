import {test,expect} from '@playwright/test';
import {PDFDocument,PDFRawStream,PDFName,PDFNumber,decodePDFRawStream} from 'pdf-lib';
import {writeFileSync} from 'node:fs';

for(const paper of ['A4','Letter'])for(const orientation of ['portrait','landscape'])test(`mobile ${paper} ${orientation}: preview saves page images to a correctly sized PDF`,async({page},testInfo)=>{
  await page.setViewportSize({width:600,height:900});
  await page.goto(`/test.html?mobile&uppercase&paper=${paper}&orientation=${orientation}`);
  await expect(page.getByRole('status')).toContainText('Ready to print');
  expect(await page.locator('.ps-frame').getAttribute('sandbox')).not.toContain('allow-same-origin');
  await expect(page.getByRole('button',{name:'Open PDF',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Save PDF',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>({bytes:window.testMobilePDF?.length,errors:window.testNotices})),{timeout:60000}).toMatchObject({bytes:expect.any(Number),errors:[]});
  const bytes=Buffer.from(await page.evaluate(()=>window.testMobilePDF));
  expect(await page.evaluate(()=>window.testMobileSaved)).toEqual({title:'Example',open:false});
  const pdf=await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBe(await page.evaluate(()=>window.testPages));
  const size=paper==='A4'?[210*72/25.4,297*72/25.4]:[612,792];
  if(orientation==='landscape')size.reverse();
  for(const sheet of pdf.getPages()){
    expect(sheet.getWidth()).toBeCloseTo(size[0],3);
    expect(sheet.getHeight()).toBeCloseTo(size[1],3);
    expect(sheet.node.Resources()?.toString()).toContain('/Image');
  }
  assertPageBorders(pdf);
  const path=testInfo.outputPath('mobile.pdf');writeFileSync(path,bytes);
  await testInfo.attach('Mobile PDF',{path,contentType:'application/pdf'});
  await expect(page.locator('.ps-mobile-output')).toHaveCount(0);
  await page.screenshot({path:testInfo.outputPath('mobile-studio.png')});
});

test('mobile Open PDF exports a longer note for opening, independent of zoom',async({page},testInfo)=>{
  await page.goto('/test.html?mobile');
  await expect(page.getByRole('status')).toContainText('Ready to print');
  await page.getByRole('combobox',{name:'Preview zoom',exact:true}).selectOption('1.5');
  await page.getByRole('button',{name:'Open PDF',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.testMobileSaved),{timeout:45000}).toEqual({title:'Print validation',open:true});
  expect(await page.evaluate(()=>window.testNotices)).toEqual([]);
  const data=Buffer.from(await page.evaluate(()=>window.testMobilePDF));
  const pdf=await PDFDocument.load(data);
  expect(pdf.getPageCount()).toBe(await page.evaluate(()=>window.testPages));
  expect(pdf.getPageCount()).toBeGreaterThan(3);
  assertPageBorders(pdf);
  const path=testInfo.outputPath('mobile-long-note.pdf');writeFileSync(path,data);
  await testInfo.attach('Long mobile PDF',{path,contentType:'application/pdf'});
});

test('closing a mobile export removes its document without saving a partial PDF',async({page})=>{
  await page.goto('/test.html?mobile&uppercase&cancelMobile');
  await expect(page.getByRole('status')).toContainText('Ready to print');
  await page.getByRole('button',{name:'Save PDF',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.testNotices)).toEqual(['Print Studio: PDF export was closed.']);
  expect(await page.evaluate(()=>window.testMobilePDF)).toBeUndefined();
  await expect(page.locator('.ps-mobile-output')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Save PDF',exact:true})).toBeEnabled();
});

// Check actual pixels along the preset's 7 mm left border on every page.
// A WebKit zero-canvas cleanup regression left valid, nonblank PDFs but lost
// later-page borders and headers; page counts and dimensions alone miss it.
function assertPageBorders(pdf:PDFDocument) {
  const images=pdf.context.enumerateIndirectObjects().map(([,object])=>object).filter((object):object is PDFRawStream=>object instanceof PDFRawStream && object.dict.get(PDFName.of('Subtype'))===PDFName.of('Image'));
  expect(images.length).toBe(pdf.getPageCount());
  for(const image of images){
    expect(image.dict.get(PDFName.of('ColorSpace'))).toBe(PDFName.of('DeviceRGB'));
    const width=image.dict.lookup(PDFName.of('Width'),PDFNumber).asNumber();
    const pixels=decodePDFRawStream(image).decode();
    let ink=0;
    for(let y=100;y<300;y++)for(let x=49;x<59;x++)if(pixels[(y*width+x)*3]<160)ink++;
    expect(ink,'Each page must retain its left border after earlier canvases are released').toBeGreaterThan(150);
  }
}
