// Runs in a sandboxed iframe without Obsidian or access to the parent DOM.
// The host supplies prepared content and inert templates made with Obsidian helpers.
import {Previewer} from 'pagedjs';
import {frameCommand} from './messages';
import {pageCss, type PrintJob} from './document';
import {expandTemplate} from './template';
import {paperSize} from './settings';
import {layoutWarnings} from './layout-warnings';
import {freezePageContent} from './page-snapshot';
declare global {interface Window {PRINT_STUDIO_JOB:PrintJob & {token:string}}}
const job=window.PRINT_STUDIO_JOB;
const send=(type:string, extra:Record<string,unknown>={})=>parent.postMessage({type,token:job.token,...extra},'*');
async function run() {
  const source=new DOMParser().parseFromString(job.html,'text/html').body.firstElementChild as HTMLElement;
  // Capture trusted templates before paginating note content with arbitrary IDs.
  const furniture=document.querySelector<HTMLTemplateElement>('body > #ps-page-furniture')!.content;
  const lineBreak=document.querySelector<HTMLTemplateElement>('body > #ps-line-break')!.content.firstElementChild as HTMLBRElement;
  const lineBox=document.querySelector<HTMLTemplateElement>('body > #ps-line-box')!.content.firstElementChild as HTMLElement;
  await Promise.all([...source.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));
  const previewer=new Previewer();
  // Paged.js 0.4.3 normally waits for animation frames between pages. Electron
  // can stop those while the window is unfocused, leaving pagination stuck.
  // Queue tasks instead, yielding between pages without depending on repaint.
  const scheduler=new MessageChannel();
  const ticks:Array<()=>void>=[];
  scheduler.port1.onmessage=()=>ticks.shift()?.();
  previewer.chunker.q.tick=callback=>{ticks.push(callback);scheduler.port2.postMessage(null);};
  previewer.chunker.hooks.afterPageLayout.register((_element,page)=>page.removeListeners());
  // Include the content root in Paged.js's parsed tree. Passing the element
  // directly omits its own reference and can strand descendants outside it.
  const pages=await previewer.preview(source.outerHTML,[{'print-studio.css':pageCss(job.preset)+'\n'+(job.contentCss??'')}],document.querySelector<HTMLElement>('#ps-output')!).finally(()=>{scheduler.port1.close();scheduler.port2.close();});
  // Pagination is a fixed snapshot. Screen zoom and the print media switch must
  // never trigger Paged.js's incremental reflow on the completed document.
  pages.stop(); pages.pages.forEach(page=>page.removeListeners());
  const all=[...document.querySelectorAll<HTMLElement>('.pagedjs_page')];
  all.forEach((page,index)=>{
    const first=index===0 && job.preset.differentFirstPage;
    if(first)page.classList.add('ps-first-page');
    const box=page.querySelector('.pagedjs_pagebox')!;
    const decorations=furniture.cloneNode(true) as DocumentFragment;
    for(const location of ['header','footer'] as const) {
      const band=decorations.querySelector(`.ps-page-${location}`)!;
      for(const alignment of ['left','center','right'] as const) {
        const slot=band.querySelector(`.ps-slot.${alignment}`)!;
        const img=slot.querySelector('img');
        if(img) {
          if(job.preset.logo && (index===0 || !job.preset.logoFirstPageOnly)) {img.src=job.preset.logo;img.alt=job.preset.company || 'Company logo';}
          else img.remove();
        }
        const slots=location==='header' && first?job.preset.firstPageHeader:job.preset[location];
        const uppercase=location==='header' && first?job.preset.firstPageHeaderUppercase:job.preset[`${location}Uppercase`];
        const expanded=expandTemplate(slots[alignment],job.context,job.preset.company,index+1,all.length);
        slot.querySelector('span')!.textContent=uppercase[alignment]?expanded.toUpperCase():expanded;
      }
    }
    box.append(decorations);
  });
  await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));
  await document.fonts.ready;
  freezePageContent(all,lineBreak,lineBox);
  // Move only into unused space after pagination, without changing page count
  // or splitting a fitting cover. Oversized sections retain normal pagination.
  for(const page of all) {
    const area=page.querySelector<HTMLElement>('.pagedjs_area')!;
    for(const group of page.querySelectorAll<HTMLElement>('.ps-bottom-block')) {
      if(group.hasAttribute('data-split-to'))continue;
      const space=Math.max(0,area.getBoundingClientRect().bottom-group.getBoundingClientRect().bottom);
      group.style.top=`${space}px`;
    }
  }
  send('warnings',{warnings:layoutWarnings(all)});
  document.querySelector('#ps-loading')?.remove();
  const stack=document.querySelector<HTMLElement>('.pagedjs_pages')!;
  let zoom:string='fit';
  let currentPage=1;
  let scheduled=false;
  const report=()=>{
    scheduled=false;
    let closest=Infinity;
    all.forEach((page,index)=>{const distance=Math.abs(page.getBoundingClientRect().top-24);if(distance<closest){closest=distance;currentPage=index+1;}});
    send('viewport',{page:currentPage});
  };
  const goToPage=(page:number)=>{
    if(!Number.isFinite(page))return;
    currentPage=Math.min(all.length,Math.max(1,Math.round(page)));
    all[currentPage-1].scrollIntoView({block:'start'});
    send('viewport',{page:currentPage});
  };
  const applyZoom=()=>{
    const scale=zoom==='fit'?Math.min(1,Math.max(.1,(innerWidth-24)/(paperSize(job.preset)[0]*96/25.4+48))):Number(zoom);
    stack.style.zoom=String(scale);
    if(currentPage>1)goToPage(currentPage);
  };
  applyZoom();window.addEventListener('resize',applyZoom);
  window.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;window.requestAnimationFrame(report);}},{passive:true});
  window.addEventListener('message',(event:MessageEvent<unknown>)=>{
    const message=frameCommand(event.data);
    if(event.source!==parent || !message || message.token!==job.token)return;
    if(message.type==='theme')document.documentElement.style.colorScheme=message.scheme==='dark'?'dark':'light';
    if(message.type==='page')goToPage(Number(message.page));
    if(message.type==='zoom' && ['fit','0.5','0.75','1','1.25','1.5','2'].includes(message.value)){zoom=message.value;applyZoom();}
    if(message.type==='export' || message.type==='pdf' || message.type==='print'){
      // Export at actual size, regardless of the current preview magnification.
      const clone=document.documentElement.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('script,body > template#ps-page-furniture,body > template#ps-line-break,body > template#ps-line-box').forEach(element=>element.remove());
      // A legal CSS string can contain </style>. Escape it before serializing
      // style text as HTML so a font name or selector cannot inject markup.
      clone.querySelectorAll('style').forEach(style=>{style.textContent=(style.textContent??'').replace(/</g,'\\3c ');});
      clone.querySelector<HTMLElement>('.pagedjs_pages')!.style.removeProperty('zoom');
      clone.querySelector('meta[http-equiv="Content-Security-Policy"]')!.setAttribute('content',"default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none';");
      const html='<!doctype html>\n'+clone.outerHTML;
      if(message.type==='export')send('exported',{html});
      else send('output',{kind:message.type,html});
    }
  });
  send('ready',{pages:pages.total});
}
run().catch(error=>{const loading=document.querySelector('#ps-loading');if(loading)loading.textContent='Could not paginate this document.';send('error',{message:error instanceof Error?error.message:String(error)});});
