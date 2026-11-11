import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

for(const mobile of [false,true])for(const mode of ['studio','text','reading'])test(`${mobile?'mobile':'desktop'} ${mode}: Mermaid styles and HTML labels survive preview and export`,async({page,browser,browserName},info)=>{
  test.skip(!mobile && browserName==='webkit','Native desktop PDF requires Chromium');
  await page.goto(`/test.html?mermaid&mode=${mode}${mobile?'&mobile':''}`);
  await expect(page.getByRole('status')).toContainText('Ready to print');
  const img=page.frameLocator('.ps-frame').locator('.ps-mermaid');
  await expect(img).toBeVisible();
  const snapshot=await img.evaluate((image:HTMLImageElement)=>({width:image.naturalWidth,svg:decodeURIComponent(image.src.split(',')[1])}));
  expect(snapshot.width).toBe(300);
  expect(snapshot.svg).toContain('Updated planning');expect(snapshot.svg).toContain('Create feature branch');
  expect(snapshot.svg).toContain('fill:rgb(255, 180, 230)');expect(snapshot.svg).toContain('url(&quot;#arrow&quot;)');
  expect(snapshot.svg).not.toContain('<style');expect(snapshot.svg).not.toContain('visibility:hidden');
  await page.getByRole('button',{name:'Save PDF',exact:true}).click();
  const pdf=info.outputPath('mermaid.pdf');
  if(mobile) {
    await expect.poll(()=>page.evaluate(()=>({bytes:window.testMobilePDF?.length,errors:window.testNotices})),{timeout:45000}).toMatchObject({bytes:expect.any(Number),errors:[]});
    await writeFile(pdf,Buffer.from(await page.evaluate(()=>window.testMobilePDF)));
  } else {
    await expect.poll(()=>page.evaluate(()=>window.testOutput?.kind)).toBe('pdf');
    const output=await browser.newPage();await output.setContent(await page.evaluate(()=>window.testOutput.html));
    await output.locator('.ps-mermaid').evaluate((img:HTMLImageElement)=>img.decode());
    await output.pdf({path:pdf,preferCSSPageSize:true,printBackground:true});await output.close();
    const html=await page.evaluate(()=>window.testOutput.html);
    const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export HTML',exact:true}).click();
    expect(await readFile((await (await download).path())!,'utf8')).toBe(html);
    await page.getByRole('button',{name:'Print',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>window.testOutput?.kind)).toBe('print');
    expect(await page.evaluate(()=>window.testOutput.html)).toBe(html);
  }
  execFileSync('pdftoppm',['-f','1','-singlefile','-scale-to','1200','-png',pdf,info.outputPath('mermaid')]);
  await assertDiagramPixels(pdf,info.outputPath('pixels'));
  await info.attach('Mermaid PDF',{path:pdf,contentType:'application/pdf'});
});

// Inspect the actual PDF: colored nodes alone can hide a lost foreignObject label.
async function assertDiagramPixels(pdf:string,prefix:string) {
  execFileSync('pdftoppm',['-f','1','-singlefile','-scale-to','1200',pdf,prefix]);
  const ppm=await readFile(`${prefix}.ppm`);
  const header=ppm.toString('ascii',0,80).match(/^P6\s+(\d+)\s+(\d+)\s+255\s/)!;
  const width=Number(header[1]),height=Number(header[2]),pixels=ppm.subarray(header[0].length);
  const rows:number[]=[];let left=width,right=0;
  for(let y=0;y<height;y++) {
    let colored=0;
    for(let x=0;x<width;x++) {
      const i=(y*width+x)*3;
      if(pixels[i]>230 && pixels[i+1]>140 && pixels[i+1]<210 && pixels[i+2]>200) {colored++;left=Math.min(left,x);right=Math.max(right,x);}
    }
    if(colored>100)rows.push(y);
  }
  expect(rows.length,'Both node backgrounds must be printed').toBeGreaterThan(80);
  const gap=rows.findIndex((row,index)=>index>0 && row-rows[index-1]>4);expect(gap).toBeGreaterThan(0);
  const ink=(top:number,bottom:number,x1:number,x2:number)=>{
    let count=0;for(let y=top;y<bottom;y++)for(let x=x1;x<x2;x++){const i=(y*width+x)*3;if(pixels[i]<80 && pixels[i+1]<80 && pixels[i+2]<80)count++;}return count;
  };
  expect(ink(rows[0]+4,rows[gap-1]-4,left+4,right-4),'HTML label ink inside the first node').toBeGreaterThan(250);
  expect(ink(rows[gap]+4,rows.at(-1)!-4,left+4,right-4),'SVG text ink inside the second node').toBeGreaterThan(150);
  const center=Math.round((left+right)/2);
  expect(ink(rows[gap-1]+4,rows[gap]-4,center-10,center+10),'Connecting line and arrowhead').toBeGreaterThan(30);
}
