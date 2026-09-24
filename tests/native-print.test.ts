import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {NativePrinter,pdfOptions,printOptions,type DesktopBridge} from '../src/native-print';
import {defaults,paperSize} from '../src/settings';
import {PDFDocument} from 'pdf-lib';
async function fixturePDF(preset=defaults().presets[0]){const pdf=await PDFDocument.create();pdf.addPage(paperSize(preset).map(mm=>mm*72/25.4) as [number,number]);return pdf.save();}
Object.assign(globalThis,{window:{setTimeout,clearTimeout}});

test('desktop output uses the selected paper and cleans up on success, cancellation and failure',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'print-studio-'));
  const path=join(directory,'test.pdf');
  let canceled=false,fail=false,destroyed=0,created=0,printCanceled=false;
  const pdfCalls:unknown[]=[],printCalls:unknown[]=[];
  class Window {
    dead=false;
    constructor(options:Record<string,unknown>){created++;assert.deepEqual(options.webPreferences,{nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false});}
    async loadURL(url:string){assert.ok(url.startsWith('blob:'));if(fail)throw new Error('Load failed');}
    destroy(){destroyed++;this.dead=true;}
    isDestroyed(){return this.dead;}
    webContents={
      executeJavaScript:async()=>undefined,
      printToPDF:async(options:ReturnType<typeof pdfOptions>)=>{pdfCalls.push(options);return fixturePDF({...defaults().presets[0],paper:options.pageSize,orientation:options.landscape?'landscape':'portrait'});},
      print:(options:unknown,callback:(success:boolean,reason:string)=>void)=>{printCalls.push(options);callback(!printCanceled,printCanceled?'Print job canceled':'');},
      setWindowOpenHandler:()=>{},on:()=>{},
    };
  }
  const desktop:DesktopBridge={BrowserWindow:Window,dialog:{showSaveDialog:async()=>({canceled,filePath:path})}};
  const printer=new NativePrinter(desktop,undefined,'win32');
  try {
    for(const paper of ['A4','Letter'] as const)for(const orientation of ['portrait','landscape'] as const) {
      const preset={...defaults().presets[0],paper,orientation};
      await printer.output({kind:'pdf',title:'Test',html:'<p>Test</p>',preset});
      assert.equal((await PDFDocument.load(await readFile(path))).getPageCount(),1);
      assert.deepEqual(pdfCalls.at(-1),{pageSize:paper,landscape:orientation==='landscape',preferCSSPageSize:true,scale:1,printBackground:true,displayHeaderFooter:false,margins:{top:0,bottom:0,left:0,right:0}});
      await printer.output({kind:'print',title:'Test',html:'<p>Test</p>',preset});
      assert.deepEqual(printCalls.at(-1),{silent:false,pageSize:paper,landscape:orientation==='landscape',scaleFactor:100,printBackground:true,margins:{marginType:'none'},header:'',footer:''});
    }
    const request={kind:'pdf' as const,title:'Test',html:'<p>Test</p>',preset:defaults().presets[0]};
    canceled=true;await printer.output(request);assert.equal(created,8);
    canceled=false;fail=true;await assert.rejects(printer.output(request),/Load failed/);
    fail=false;printCanceled=true;await printer.output({...request,kind:'print'});
    assert.equal(created,destroyed);
    printer.dispose();await printer.output(request);assert.equal(created,10);
    assert.equal(pdfOptions(request.preset).pageSize,'A4');assert.equal(printOptions(request.preset).pageSize,'A4');
  } finally {printer.dispose();await rm(directory,{recursive:true,force:true});}
});

test('Linux Print submits a prepared PDF, never opens a viewer or the native print dialog',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'print-studio-linux-'));
  const filePath=join(directory,'print.pdf');
  let invalidPDF=false,submitError=false,destroyed=0,submitted=0,saved=0;
  const request={kind:'print' as const,title:'Test',html:'<p>Test</p>',preset:defaults().presets[0]};
  class Window {
    dead=false;
    async loadURL(){}
    destroy(){this.dead=true;destroyed++;}
    isDestroyed(){return this.dead;}
    webContents={
      executeJavaScript:async()=>undefined,
      printToPDF:async(options:unknown)=>{assert.deepEqual(options,pdfOptions(request.preset));return invalidPDF?Buffer.from('invalid'):fixturePDF();},
      print:()=>{assert.fail('Linux must never enter Electron’s native print dialog');},
      setWindowOpenHandler:()=>{},on:()=>{},
    };
  }
  const printer=new NativePrinter({BrowserWindow:Window,dialog:{showSaveDialog:async()=>{saved++;return {canceled:false,filePath};}}},async(data,job)=>{
    assert.deepEqual(job,request);assert.equal((await PDFDocument.load(data)).getPageCount(),1);submitted++;
    if(submitError)throw new Error('Printer unavailable');
  },'linux');
  try {
    await printer.output(request);assert.equal(submitted,1);assert.equal(saved,0);
    invalidPDF=true;await assert.rejects(printer.output(request),/valid PDF/);assert.equal(submitted,1);
    invalidPDF=false;submitError=true;await assert.rejects(printer.output(request),/Printer unavailable/);
    submitError=false;await printer.output({...request,kind:'pdf'});assert.equal(submitted,2);assert.equal(saved,1);
    assert.equal(destroyed,4);
  }finally{printer.dispose();await rm(directory,{recursive:true,force:true});}
});
