import {TEXT_PROPERTIES, filterTextStyle} from './content-css';
import {serializeRenderedNote} from './rendered-note';
import type {ElementFactory} from './ui';
import type {Preset} from './settings';

export interface NoteFormatting {html:string; rootStyle:string}
export function noteCssClasses(value:unknown):string[] {
  return (Array.isArray(value)?value:typeof value==='string'?value.split(/[ ,]+/):[])
    .filter((cls):cls is string=>typeof cls==='string' && Boolean(cls) && !/\s/.test(cls) && !/^(ps-|pagedjs_)/.test(cls));
}
const inherited=new Set(['color','font-family','font-weight','font-style','font-variant','font-variant-caps','font-stretch','letter-spacing','word-spacing','text-transform','text-align','text-indent']);

/** Capture resolved text appearance while the note is still in Obsidian's DOM. */
export function captureNoteFormatting(source:HTMLElement,createElement:ElementFactory):NoteFormatting {
  const view=source.ownerDocument.defaultView!;
  const clone=source.cloneNode(true) as HTMLElement;
  const originals=[source,...source.querySelectorAll<HTMLElement>('*')];
  const copies=[clone,...clone.querySelectorAll<HTMLElement>('*')];
  originals.forEach((element,index)=>{
    const copy=copies[index];copy.removeAttribute('style');
    if(element.namespaceURI!=='http://www.w3.org/1999/xhtml' || element.matches('.ps-check,.ps-page-break,.ps-bottom-marker'))return;
    const computed=view.getComputedStyle(element);
    for(const property of TEXT_PROPERTIES) {
      const value=computed.getPropertyValue(property);
      copy.style.setProperty(property,value);
    }
  });
  // Reading surfaces can be transparent and inherit their backdrop from a pane.
  let ancestor:HTMLElement|null=source;
  while(ancestor) {
    const background=view.getComputedStyle(ancestor).backgroundColor;
    if(background && background!=='transparent' && background!=='rgba(0, 0, 0, 0)') {clone.style.backgroundColor=background;break;}
    ancestor=ancestor.parentElement;
  }
  if(!ancestor)clone.style.setProperty('background-color','#ffffff');
  return {html:serializeRenderedNote(clone,createElement),rootStyle:clone.style.cssText};
}

/** Turn filtered snapshots into low-specificity rules so custom CSS can win. */
export function noteFormattingCss(root:HTMLElement,rootStyle:string,preset:Preset,createElement:ElementFactory):string {
  const original=createElement('span');original.style.cssText=rootStyle;
  const base=createElement('span');filterTextStyle(original.style,base.style);
  const baseSize=parseFloat(base.style.fontSize)||16;
  const baseLine=(base.style.lineHeight.endsWith('px')?parseFloat(base.style.lineHeight)/baseSize:parseFloat(base.style.lineHeight)) || 1.5;
  const studioFont=preset.font==='serif'?'Georgia,"Times New Roman",serif':'Arial,Helvetica,sans-serif';
  const lineRatio=(style:CSSStyleDeclaration)=>style.lineHeight.endsWith('px')?parseFloat(style.lineHeight)/(parseFloat(style.fontSize)||baseSize):parseFloat(style.lineHeight);
  const convert=(input:CSSStyleDeclaration,parent?:CSSStyleDeclaration)=>{
    const target=createElement('span');filterTextStyle(input,target.style);
    const size=parseFloat(target.style.fontSize)||baseSize;
    // Resolve inheritance after structural cleanup: an embedded reading-view
    // wrapper may have been removed, but its text appearance must survive.
    if(parent)for(const property of inherited)if(input.getPropertyValue(property) && input.getPropertyValue(property)===parent.getPropertyValue(property))target.style.setProperty(property,'inherit');
    if(target.style.fontSize.endsWith('px'))target.style.fontSize=parent?`${size/(parseFloat(parent.fontSize)||baseSize)}em`:`${Math.max(.01,size/baseSize*preset.fontSize)}pt`;
    const ratio=lineRatio(input);
    if(Number.isFinite(ratio))target.style.lineHeight=parent && Math.abs(ratio-lineRatio(parent))<.0001?'inherit':String(ratio/baseLine*preset.lineHeight);
    if(preset.formatting==='text') {
      if(target.style.color===base.style.color)target.style.setProperty('color','#262727');
      if(target.style.backgroundColor===base.style.backgroundColor)target.style.setProperty('background-color','transparent');
      if(target.style.fontFamily===base.style.fontFamily)target.style.fontFamily=studioFont;
    }
    return target.style.cssText;
  };
  root.querySelectorAll('[data-ps-format]').forEach(element=>element.removeAttribute('data-ps-format'));
  const rules=[`.ps-content{${convert(base.style)}}`];
  if(preset.formatting==='reading' && base.style.backgroundColor) {
    rules.push(`.pagedjs_page{background-color:${base.style.backgroundColor}}`);
    // Use the note's foreground for furniture on colored paper, too.
    if(base.style.color)rules.push(`.ps-page-header,.ps-page-footer{color:${base.style.color};border-color:${base.style.color}}.ps-page-border{border-color:${base.style.color}}`);
  }
  const styles=new Map<string,number>();
  const originals=new Map<HTMLElement,CSSStyleDeclaration>();
  for(const element of root.querySelectorAll<HTMLElement>('[style]')) {
    const copy=createElement('span');copy.style.cssText=element.style.cssText;originals.set(element,copy.style);
  }
  for(const [element,original] of originals) {
    let ancestor=element.parentElement;
    while(ancestor && ancestor!==root && !originals.has(ancestor))ancestor=ancestor.parentElement;
    const style=convert(original,ancestor && originals.get(ancestor)||base.style);element.removeAttribute('style');
    if(!style)continue;
    let id=styles.get(style);
    if(id===undefined){id=styles.size;styles.set(style,id);rules.push(`.ps-content :where([data-ps-format="${id}"]){${style}}`);}
    element.setAttribute('data-ps-format',String(id));
  }
  return rules.join('\n');
}
