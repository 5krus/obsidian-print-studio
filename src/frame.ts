// Runs in a sandboxed iframe without Obsidian or access to the parent DOM.
// Standard DOM creation here is intentional; do not add Obsidian globals.
import {Previewer} from 'pagedjs';
import {frameCommand} from './messages';
import {pageCss, type PrintJob} from './document';
import {expandTemplate} from './template';
import {paperSize} from './settings';
import {layoutWarnings} from './layout-warnings';
declare global {interface Window {PRINT_STUDIO_JOB:PrintJob & {token:string}}}
const job=window.PRINT_STUDIO_JOB;
const send=(type:string, extra:Record<string,unknown>={})=>parent.postMessage({type,token:job.token,...extra},'*');
async function run() {
  const source=document.createElement('div');source.className='ps-content';
  // The parent serializes only cleanMarkup output into this network-isolated frame.
  source.append(...new DOMParser().parseFromString(job.html,'text/html').body.childNodes);
  if(job.preset.headingBreaks) {const headings=[...source.querySelectorAll('h1')];headings.slice(1).forEach(h=>h.classList.add('ps-heading-break'));}
  for(const heading of source.querySelectorAll('h2,h3,h4,h5,h6')) {
    const next=heading.nextElementSibling;
    if(next?.tagName==='P' && (next.textContent?.length ?? 0)<900){const group=document.createElement('div');group.className='ps-keep-heading';heading.before(group);group.append(heading,next);}
  }
  await Promise.all([...source.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));
  source.querySelectorAll('input[type=checkbox]').forEach(input=>{const span=document.createElement('span');span.className='ps-check';span.textContent=(input as HTMLInputElement).checked?'☑\uFE0E':'☐';input.replaceWith(span);});
  // Group the content after a spacer up to the next explicit break. Repeated
  // spacers in the same section share its remaining space.
  for(const marker of source.querySelectorAll('.ps-bottom-marker')) {
    if(!source.contains(marker))continue;
    const group=document.createElement('div');group.className='ps-bottom-block';
    marker.before(group);
    let next=marker.nextSibling;
    marker.remove();
    while(next) {
      if(next.nodeType===1 && (next as Element).classList.contains('ps-page-break'))break;
      const current=next;next=next.nextSibling;
      if(current.nodeType===1 && (current as Element).classList.contains('ps-bottom-marker'))current.parentNode?.removeChild(current);
      else group.append(current);
    }
  }
  const previewer=new Previewer();
  // Paged.js 0.4.3 normally waits for animation frames between pages. Electron
  // can stop those while the window is unfocused, leaving pagination stuck.
  // Queue tasks instead, yielding between pages without depending on repaint.
  const scheduler=new MessageChannel();
  const ticks:Array<()=>void>=[];
  scheduler.port1.onmessage=()=>ticks.shift()?.();
  previewer.chunker.q.tick=callback=>{ticks.push(callback);scheduler.port2.postMessage(null);};
  previewer.chunker.hooks.afterPageLayout.register((_element,page)=>page.removeListeners());
  const pages=await previewer.preview(source,[{'print-studio.css':pageCss(job.preset)}],document.querySelector<HTMLElement>('#ps-output')!).finally(()=>{scheduler.port1.close();scheduler.port2.close();});
  // Pagination is a fixed snapshot. Screen zoom and the print media switch must
  // never trigger Paged.js's incremental reflow on the completed document.
  pages.stop(); pages.pages.forEach(page=>page.removeListeners());
  const all=[...document.querySelectorAll<HTMLElement>('.pagedjs_page')];
  all.forEach((page,index)=>{
    const first=index===0 && job.preset.differentFirstPage;
    if(first)page.classList.add('ps-first-page');
    const box=page.querySelector('.pagedjs_pagebox')!;
    const border=document.createElement('div');border.className='ps-page-border';box.append(border);
    for(const location of ['header','footer'] as const) {
      const band=document.createElement('div');band.className=`ps-page-${location}`;
      for(const alignment of ['left','center','right'] as const) {
        const slot=document.createElement('div');slot.className=`ps-slot ${alignment}`;
        if(location==='header' && alignment==='left' && job.preset.logo && (index===0 || !job.preset.logoFirstPageOnly)) {const img=document.createElement('img');img.src=job.preset.logo;img.alt=job.preset.company || 'Company logo';img.className='ps-logo';slot.append(img);}
        const slots=location==='header' && first?job.preset.firstPageHeader:job.preset[location];
        const text=document.createElement('span');text.textContent=expandTemplate(slots[alignment],job.context,job.preset.company,index+1,all.length);slot.append(text);band.append(slot);
      }
      box.append(band);
    }
  });
  await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));
  await document.fonts.ready;
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
    if(message.type==='print'){window.focus();window.print();}
    if(message.type==='export'){
      // Export at actual size, regardless of the current preview magnification.
      const clone=document.documentElement.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('script').forEach(script=>script.remove());
      clone.querySelector<HTMLElement>('.pagedjs_pages')!.style.removeProperty('zoom');
      send('exported',{html:'<!doctype html>\n'+clone.outerHTML});
    }
  });
  send('ready',{pages:pages.total});
}
run().catch(error=>{const loading=document.querySelector('#ps-loading');if(loading)loading.textContent='Could not paginate this document.';send('error',{message:error instanceof Error?error.message:String(error)});});
