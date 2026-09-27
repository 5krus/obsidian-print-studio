import type {ElementFactory} from './ui';
import type {Preset} from './settings';
import {noteCssClasses} from './note-formatting';

/** Prepare document structure with the host's Obsidian element factory. */
export function preparePrintRoot(root:HTMLElement,preset:Preset,cssclasses:unknown,createElement:ElementFactory):void {
  root.className='ps-content markdown-rendered markdown-preview-view';
  root.classList.add(...noteCssClasses(cssclasses));
  if(preset.headingBreaks)[...root.querySelectorAll('h1')].slice(1).forEach(heading=>heading.classList.add('ps-heading-break'));
  for(const heading of root.querySelectorAll('h2,h3,h4,h5,h6')) {
    const next=heading.nextElementSibling;
    if(next?.tagName==='P' && (next.textContent?.length??0)<900) {
      const group=createElement('div','ps-keep-heading');heading.before(group);group.append(heading,next);
    }
  }
  // Repeated bottom spacers share the remaining space up to an explicit break.
  for(const marker of root.querySelectorAll('.ps-bottom-marker')) {
    if(!root.contains(marker))continue;
    const group=createElement('div','ps-bottom-block');marker.before(group);
    let next=marker.nextSibling;marker.remove();
    while(next) {
      if(next.nodeType===1 && (next as Element).classList.contains('ps-page-break'))break;
      const current=next;next=next.nextSibling;
      if(current.nodeType===1 && (current as Element).classList.contains('ps-bottom-marker'))current.parentNode?.removeChild(current);
      else group.append(current);
    }
  }
}

/** Inert, trusted templates cross the sandbox boundary as HTML, never functions. */
export function printTemplates(createElement:ElementFactory):string {
  const furniture=createElement('template');furniture.id='ps-page-furniture';
  furniture.content.append(createElement('div','ps-page-border'));
  for(const location of ['header','footer']) {
    const band=createElement('div',`ps-page-${location}`);
    for(const alignment of ['left','center','right']) {
      const slot=createElement('div',`ps-slot ${alignment}`);
      if(location==='header' && alignment==='left')slot.append(createElement('img','ps-logo'));
      slot.append(createElement('span'));band.append(slot);
    }
    furniture.content.append(band);
  }
  const lineBreak=createElement('template');lineBreak.id='ps-line-break';
  lineBreak.content.append(createElement('br'));
  return furniture.outerHTML+lineBreak.outerHTML;
}
