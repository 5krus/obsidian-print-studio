import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {NativePrinter,pdfOptions,printOptions,type DesktopBridge} from '../src/native-print';
import {defaults} from '../src/settings';
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
      printToPDF:async(options:unknown)=>{pdfCalls.push(options);return Buffer.from('%PDF-fixture');},
      print:(options:unknown,callback:(success:boolean,reason:string)=>void)=>{printCalls.push(options);callback(!printCanceled,printCanceled?'Print job canceled':'');},
      setWindowOpenHandler:()=>{},on:()=>{},
    };
  }
  const desktop:DesktopBridge={BrowserWindow:Window,dialog:{showSaveDialog:async()=>({canceled,filePath:path})}};
  const printer=new NativePrinter(desktop);
  try {
    for(const paper of ['A4','Letter'] as const)for(const orientation of ['portrait','landscape'] as const) {
      const preset={...defaults().presets[0],paper,orientation};
      await printer.output({kind:'pdf',title:'Test',html:'<p>Test</p>',preset});
      assert.equal((await readFile(path)).toString(),'%PDF-fixture');
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
