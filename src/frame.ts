import {Previewer} from 'pagedjs';
import {pageCss, type PrintJob} from './document';
import {expandTemplate} from './template';
import {paperSize} from './settings';
declare global {interface Window {PRINT_STUDIO_JOB:PrintJob & {token:string}}}
const job=window.PRINT_STUDIO_JOB;
const send=(type:string, extra:Record<string,unknown>={})=>parent.postMessage({type,token:job.token,...extra},'*');
async function run() {
  const source=document.createElement('div');source.className='ps-content';source.innerHTML=job.html;
  if(job.preset.headingBreaks) {const headings=[...source.querySelectorAll('h1')];headings.slice(1).forEach(h=>h.classList.add('ps-heading-break'));}
  for(const heading of source.querySelectorAll('h2,h3,h4,h5,h6')) {
    const next=heading.nextElementSibling;
    if(next?.tagName==='P' && (next.textContent?.length ?? 0)<900){const group=document.createElement('div');group.className='ps-keep-heading';heading.before(group);group.append(heading,next);}
  }
  await Promise.all([...source.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));
  source.querySelectorAll('input[type=checkbox]').forEach(input=>{const span=document.createElement('span');span.className='ps-check';span.textContent=(input as HTMLInputElement).checked?'☑':'☐';input.replaceWith(span);});
  const previewer=new Previewer();
  previewer.chunker.hooks.afterPageLayout.register((_element,page)=>page.removeListeners());
  const pages=await previewer.preview(source,[{'print-studio.css':pageCss(job.preset)}],document.querySelector<HTMLElement>('#ps-output')!);
  // Pagination is a fixed snapshot. Screen zoom and the print media switch must
  // never trigger Paged.js's incremental reflow on the completed document.
  pages.stop(); pages.pages.forEach(page=>page.removeListeners());
  const all=[...document.querySelectorAll<HTMLElement>('.pagedjs_page')];
  all.forEach((page,index)=>{
    const box=page.querySelector('.pagedjs_pagebox')!;
    const border=document.createElement('div');border.className='ps-page-border';box.append(border);
    for(const location of ['header','footer'] as const) {
      const band=document.createElement('div');band.className=`ps-page-${location}`;
      for(const alignment of ['left','center','right'] as const) {
        const slot=document.createElement('div');slot.className=`ps-slot ${alignment}`;
        if(location==='header' && alignment==='left' && job.preset.logo) {const img=document.createElement('img');img.src=job.preset.logo;img.alt=job.preset.company || 'Company logo';img.className='ps-logo';slot.append(img);}
        const text=document.createElement('span');text.textContent=expandTemplate(job.preset[location][alignment],job.context,job.preset.company,index+1,all.length);slot.append(text);band.append(slot);
      }
      box.append(band);
    }
  });
  await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));
  document.querySelector('#ps-loading')?.remove();
  const fit=()=>{const stack=document.querySelector<HTMLElement>('.pagedjs_pages');if(stack) stack.style.zoom=String(Math.min(1,Math.max(.2,(innerWidth-32)/(paperSize(job.preset)[0]*96/25.4+48))));};
  fit();window.addEventListener('resize',fit);
  window.addEventListener('message',event=>{if(event.source!==parent || event.data?.token!==job.token) return;if(event.data.type==='theme') document.documentElement.style.colorScheme=event.data.scheme==='dark'?'dark':'light';if(event.data.type==='print') {window.focus();window.print();} if(event.data.type==='export') send('exported',{html:'<!doctype html>\n'+document.documentElement.outerHTML.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')});});
  send('ready',{pages:pages.total});
}
run().catch(error=>{document.querySelector('#ps-loading')!.textContent='Could not paginate this document.';send('error',{message:error instanceof Error?error.message:String(error)});});
