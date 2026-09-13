import type {LayoutWarning} from './messages';

/** Inspect completed pages at actual size, before applying preview zoom. */
export function layoutWarnings(pages:HTMLElement[]):LayoutWarning[] {
  const warnings:LayoutWarning[]=[];
  pages.forEach((page,index)=>{
    const add=(kind:LayoutWarning['kind'])=>{
      if(warnings.length<200 && !warnings.some(w=>w.page===index+1 && w.kind===kind))warnings.push({page:index+1,kind});
    };
    for(const kind of ['header','footer'] as const) {
      for(const slot of page.querySelectorAll<HTMLElement>(`.ps-page-${kind} .ps-slot`)) {
        const bounds=slot.getBoundingClientRect();
        if(slot.scrollHeight>slot.clientHeight+1 || slot.scrollWidth>slot.clientWidth+1 || [...slot.children].some(child=>{
          const rect=child.getBoundingClientRect();return rect.bottom>bounds.bottom+2 || rect.top<bounds.top-2 || rect.right>bounds.right+2;
        }))add(kind);
      }
    }
    const area=page.querySelector<HTMLElement>('.pagedjs_area');if(!area)return;
    const bounds=area.getBoundingClientRect();
    // Paged.js deliberately fragments paragraphs across pages. Inspect atomic
    // blocks and rows, rather than treating those paragraph fragments as loss.
    for(const block of area.querySelectorAll<HTMLElement>('tr,pre,img,svg,figure')) {
      if(block.tagName==='TR' && block.hasAttribute('data-split-to') && !block.hasAttribute('data-split-from'))add('table');
      const rect=block.getBoundingClientRect();
      if(rect.width && rect.height && (rect.right>bounds.right+2 || rect.left<bounds.left-2 || rect.height>bounds.height+2 || rect.bottom>bounds.bottom+2))add(block.closest('tr')?'table':'content');
    }
  });
  return warnings;
}
