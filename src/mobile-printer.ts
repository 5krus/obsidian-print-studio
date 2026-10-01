import {rasterPage} from './raster-page';
import {PDFDocument,PrintScaling} from 'pdf-lib';
import {paperSize} from './settings';
import type {OutputRequest} from './native-print';
import type {ElementFactory} from './ui';

// The mobile webview has no native PDF engine. Render one page at a time to
// bound canvas memory; the PDF has the same physical dimensions as the preview.
export class MobilePrinter {
  private disposed=false;
  private cancel?:()=>void;
  constructor(private root:HTMLElement,private createElement:ElementFactory,private save:(data:Uint8Array,title:string,open:boolean)=>Promise<void>) {}
  async output(request:OutputRequest) {
    if(this.disposed)return;
    if(this.cancel)throw new Error('A PDF is already being prepared.');
    const frame=this.createElement('iframe','ps-mobile-output');
    // Allow DOM capture, but never scripts, navigation, forms or popups.
    frame.setAttribute('sandbox','allow-same-origin');
    frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
    const [width,height]=paperSize(request.preset);
    frame.width=String(Math.ceil(width*96/25.4)+96);frame.height=String(Math.ceil(height*96/25.4)+96);
    let timer:number|undefined;
    const canceled=new Promise<never>((_,reject)=>{
      this.cancel=()=>reject(new Error('PDF export was closed.'));
      timer=window.setTimeout(()=>reject(new Error('Mobile PDF export timed out. Try a shorter note.')),120_000);
    });
    try {
      const loaded=new Promise<void>(resolve=>{frame.onload=()=>resolve();});
      frame.srcdoc=request.html;this.root.append(frame);
      await Promise.race([loaded,canceled]);
      const doc=frame.contentDocument;
      if(!doc)throw new Error('The mobile PDF renderer could not open this document.');
      await Promise.race([Promise.all([doc.fonts.ready,...Array.from(doc.images,img=>img.decode())]),canceled]);
      const pages=Array.from(doc.querySelectorAll<HTMLElement>('.pagedjs_page'));
      if(!pages.length)throw new Error('No pages were available for PDF export.');
      const pdf=await PDFDocument.create();pdf.setTitle(request.title);
      pdf.catalog.getOrCreateViewerPreferences().setPrintScaling(PrintScaling.None);
      for(const page of pages) {
        if(this.disposed)return;
        // At most ~3.6 MP for A4/Letter, below common iOS canvas limits.
        const canvas=await Promise.race([rasterPage(page),canceled]);
        try {
          const image=await pdf.embedPng(canvas.toDataURL('image/png'));
          const sheet=pdf.addPage([width*72/25.4,height*72/25.4]);
          sheet.drawImage(image,{x:0,y:0,width:sheet.getWidth(),height:sheet.getHeight()});
        }finally{
          // WebKit can corrupt the next canvas after a zero-sized surface.
          // A 1×1 surface releases page-sized memory without that regression.
          canvas.width=1;canvas.height=1;
        }
      }
      const data=await Promise.race([pdf.save(),canceled]);
      if(!this.disposed)await this.save(data,request.title,request.kind==='print');
    }finally{window.clearTimeout(timer);this.cancel=undefined;frame.remove();}
  }
  dispose(){this.disposed=true;this.cancel?.();}
}
