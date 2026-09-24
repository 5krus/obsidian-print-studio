import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {preparePDF} from '../../src/pdf-output';
import {defaults} from '../../src/settings';

test('transparent diagrams and text survive Ghostscript conversion of the prepared PDF',async({page},testInfo)=>{
  const png=await page.evaluate(()=>{
    const canvas=document.createElement('canvas');canvas.width=480;canvas.height=240;
    const ctx=canvas.getContext('2d')!;
    ctx.strokeStyle='black';ctx.lineWidth=5;ctx.strokeRect(30,30,420,180);
    ctx.fillStyle='#ff0000';ctx.fillRect(60,60,120,120);
    ctx.fillStyle='#0000ff';ctx.fillRect(300,60,120,120);
    return canvas.toDataURL('image/png');
  });
  await page.setContent(`<style>@page{size:A4;margin:20mm}</style><h1>IMAGE-REGRESSION</h1><img width="480" height="240" src="${png}"><p>SELECTABLE-TEXT</p>`);
  await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));
  const raw=await page.pdf({preferCSSPageSize:true,printBackground:true});
  const original=testInfo.outputPath('original.pdf'),fixed=testInfo.outputPath('prepared.pdf'),converted=testInfo.outputPath('converted.pdf');
  await writeFile(original,raw);
  await writeFile(fixed,await preparePDF(raw,defaults().presets[0]));
  execFileSync('gs',['-q','-dSAFER','-dBATCH','-dNOPAUSE','-sDEVICE=pdfwrite',`-sOutputFile=${converted}`,fixed]);
  const pixels=(path:string)=>{
    const ppm=execFileSync('pdftoppm',['-r','72','-f','1','-singlefile',path],{maxBuffer:10*1024*1024});
    const header=ppm.indexOf(Buffer.from('\n255\n'))+5;
    expect(header).toBeGreaterThan(4);
    const counts={red:0,blue:0};
    for(let i=header;i<ppm.length;i+=3){if(ppm[i]>200 && ppm[i+1]<50 && ppm[i+2]<50)counts.red++;if(ppm[i]<50 && ppm[i+1]<50 && ppm[i+2]>200)counts.blue++;}
    return counts;
  };
  const before=pixels(original),after=pixels(converted);
  for(const color of ['red','blue'] as const){expect(before[color]).toBeGreaterThan(7000);expect(after[color]/before[color]).toBeGreaterThan(.98);expect(after[color]/before[color]).toBeLessThan(1.02);}
  const text=execFileSync('pdftotext',[converted,'-'],{encoding:'utf8'});
  expect(text).toContain('IMAGE-REGRESSION');expect(text).toContain('SELECTABLE-TEXT');
  expect(execFileSync('pdfimages',['-list',fixed],{encoding:'utf8'})).not.toContain('icc');
});
