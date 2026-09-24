import {writeFile} from 'node:fs/promises';
import type {Preset} from './settings';
import {preparePDF} from './pdf-output';

export interface OutputRequest {kind:'pdf'|'print'; html:string; title:string; preset:Preset}
export function pdfOptions(preset:Preset) {
  return {pageSize:preset.paper,landscape:preset.orientation==='landscape',preferCSSPageSize:true,scale:1,printBackground:true,displayHeaderFooter:false,margins:{top:0,bottom:0,left:0,right:0}};
}
export function printOptions(preset:Preset) {
  return {silent:false,pageSize:preset.paper,landscape:preset.orientation==='landscape',scaleFactor:100,printBackground:true,margins:{marginType:'none'},header:'',footer:''};
}
// Keep the Electron bridge at the desktop boundary; preview content never gets
// Node access. Only the finished, script-free snapshot enters this window.
interface PrintWindow {
  loadURL(url:string):Promise<void>;
  destroy():void;
  isDestroyed():boolean;
  webContents:{
    executeJavaScript(code:string):Promise<unknown>;
    printToPDF(options:ReturnType<typeof pdfOptions>):Promise<Uint8Array>;
    print(options:ReturnType<typeof printOptions>,callback:(success:boolean,reason:string)=>void):void;
    setWindowOpenHandler(handler:()=>{action:'deny'}):void;
    on(event:'will-navigate',handler:(event:{preventDefault():void})=>void):void;
  };
}
export interface DesktopBridge {
  BrowserWindow:new(options:Record<string,unknown>)=>PrintWindow;
  dialog:{showSaveDialog(options:Record<string,unknown>):Promise<{canceled:boolean;filePath?:string}>};
}
export class NativePrinter {
  private windows=new Set<PrintWindow>();
  private disposed=false;
  constructor(private desktop:DesktopBridge,private printPDF?:(data:Uint8Array,request:OutputRequest)=>Promise<void>,private platform:NodeJS.Platform=process.platform) {}
  async output(request:OutputRequest) {
    if(this.disposed)return;
    if(!this.desktop?.BrowserWindow || !this.desktop.dialog)throw new Error('Desktop printing is unavailable. Restart Obsidian or use Export HTML.');
    const externalPrint=request.kind==='print' && this.platform==='linux';
    const makePDF=request.kind==='pdf' || externalPrint;
    if(externalPrint && !this.printPDF)throw new Error('Use Save PDF, then print the saved file with the same paper size in your PDF viewer.');
    let filePath:string|undefined;
    if(request.kind==='pdf') {
      const result=await this.desktop.dialog.showSaveDialog({title:'Save PDF',buttonLabel:'Save',defaultPath:`${request.title}.pdf`,filters:[{name:'PDF',extensions:['pdf']}]});
      if(result.canceled || !result.filePath || this.disposed)return;
      filePath=result.filePath;
    }
    const win=new this.desktop.BrowserWindow({show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
    this.windows.add(win);
    const url=URL.createObjectURL(new Blob([request.html],{type:'text/html;charset=utf-8'}));
    let timer:number|undefined;
    try {
      win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
      win.webContents.on('will-navigate',event=>event.preventDefault());
      // Bound preparation/PDF generation, but let users take their time in the
      // physical print dialog. Closing the studio destroys outstanding windows.
      const prepare=async()=>{
        await win.loadURL(url);
        await win.webContents.executeJavaScript('Promise.all([document.fonts.ready,...Array.from(document.images,img=>img.decode())]).then(()=>undefined)');
        if(makePDF) {
          const data=await win.webContents.printToPDF(pdfOptions(request.preset));
          if(new TextDecoder().decode(data.slice(0,5))!=='%PDF-')throw new Error('The print engine did not return a valid PDF. Please try again.');
          return preparePDF(data,request.preset);
        }
      };
      const data=await Promise.race([prepare(),new Promise<never>((_,reject)=>{timer=window.setTimeout(()=>reject(new Error('Preparing the print document timed out. Please try again.')),60_000);})]);
      window.clearTimeout(timer);
      if(this.disposed)return;
      if(makePDF) {
        if(!data || new TextDecoder().decode(data.slice(0,5))!=='%PDF-')throw new Error('The print engine did not return a valid PDF. Please try again.');
        if(externalPrint)await this.printPDF!(data,request);
        else await writeFile(filePath!,data);
      }
      else await new Promise<void>((resolve,reject)=>win.webContents.print(printOptions(request.preset),(success,reason)=>{
        if(success || /cancel/i.test(reason))resolve();else reject(new Error(reason || 'Printing failed.'));
      }));
    } finally {
      window.clearTimeout(timer);URL.revokeObjectURL(url);
      if(!win.isDestroyed())win.destroy();
      this.windows.delete(win);
    }
  }
  dispose(){this.disposed=true;for(const win of this.windows)if(!win.isDestroyed())win.destroy();this.windows.clear();}
}
