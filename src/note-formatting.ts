import {TEXT_PROPERTIES, serializeTextStyle, textStyleDeclarations} from './content-css';
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
  const rootStyle=textStyleDeclarations(clone.style);
  rootStyle.set('background-color','#ffffff');
  let ancestor:HTMLElement|null=source;
  while(ancestor) {
    const background=view.getComputedStyle(ancestor).backgroundColor;
    if(background && background!=='transparent' && background!=='rgba(0, 0, 0, 0)') {rootStyle.set('background-color',background);break;}
    ancestor=ancestor.parentElement;
  }
  return {html:serializeRenderedNote(clone,createElement),rootStyle:serializeTextStyle(rootStyle)};
}

/** Turn filtered snapshots into low-specificity rules so custom CSS can win. */
export function noteFormattingCss(root:HTMLElement,rootStyle:string,preset:Preset,createElement:ElementFactory):string {
  const original=createElement('span');original.style.cssText=rootStyle;
  const base=textStyleDeclarations(original.style);
  const value=(style:ReadonlyMap<string,string>,property:string)=>style.get(property)??'';
  const baseSize=parseFloat(value(base,'font-size'))||16;
  const lineRatio=(style:ReadonlyMap<string,string>)=>value(style,'line-height').endsWith('px')?parseFloat(value(style,'line-height'))/(parseFloat(value(style,'font-size'))||baseSize):parseFloat(value(style,'line-height'));
  const baseLine=lineRatio(base)||1.5;
  const studioFont=preset.font==='serif'?'Georgia,"Times New Roman",serif':'Arial,Helvetica,sans-serif';
  const convert=(input:ReadonlyMap<string,string>,parent?:ReadonlyMap<string,string>)=>{
    const target=new Map(input);
    const size=parseFloat(value(target,'font-size'))||baseSize;
    // Resolve inheritance after structural cleanup: an embedded reading-view
    // wrapper may have been removed, but its text appearance must survive.
    if(parent)for(const property of inherited)if(input.get(property) && input.get(property)===parent.get(property))target.set(property,'inherit');
    if(value(target,'font-size').endsWith('px'))target.set('font-size',parent?`${size/(parseFloat(value(parent,'font-size'))||baseSize)}em`:`${Math.max(.01,size/baseSize*preset.fontSize)}pt`);
    const ratio=lineRatio(input);
    if(Number.isFinite(ratio))target.set('line-height',parent && Math.abs(ratio-lineRatio(parent))<.0001?'inherit':String(ratio/baseLine*preset.lineHeight));
    if(preset.formatting==='text') {
      if(value(target,'color')===value(base,'color'))target.set('color','#262727');
      if(value(target,'background-color')===value(base,'background-color'))target.set('background-color','transparent');
      if(value(target,'font-family')===value(base,'font-family'))target.set('font-family',studioFont);
    }
    return serializeTextStyle(target);
  };
  root.querySelectorAll('[data-ps-format]').forEach(element=>element.removeAttribute('data-ps-format'));
  const rules=[`.ps-content{${convert(base)}}`];
  if(preset.formatting==='reading' && base.get('background-color')) {
    rules.push(`.pagedjs_page{background-color:${base.get('background-color')}}`);
    // Use the note's foreground for furniture on colored paper, too.
    if(base.get('color'))rules.push(`.ps-page-header,.ps-page-footer{color:${base.get('color')};border-color:${base.get('color')}}.ps-page-border{border-color:${base.get('color')}}`);
  }
  const styles=new Map<string,number>();
  const originals=new Map<HTMLElement,Map<string,string>>();
  for(const element of root.querySelectorAll<HTMLElement>('[style]')) {
    originals.set(element,textStyleDeclarations(element.style));
  }
  for(const [element,original] of originals) {
    let ancestor=element.parentElement;
    while(ancestor && ancestor!==root && !originals.has(ancestor))ancestor=ancestor.parentElement;
    const style=convert(original,ancestor && originals.get(ancestor)||base);element.removeAttribute('style');
    if(!style)continue;
    let id=styles.get(style);
    if(id===undefined){id=styles.size;styles.set(style,id);rules.push(`.ps-content :where([data-ps-format="${id}"]){${style}}`);}
    element.setAttribute('data-ps-format',String(id));
  }
  return rules.join('\n');
}
