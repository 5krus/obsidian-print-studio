import DOMPurify from 'dompurify';
import type {ElementFactory} from './ui';
import {normalizePreset, paperSize, type Preset} from './settings';
import {escapeHtml, type DocumentContext} from './template';
export interface PrintJob {html:string; preset:Preset; context:DocumentContext}
export function cleanMarkup(html: string, createElement: ElementFactory, hideEmbeddedNoteMetadata = false): string {
  const clean = DOMPurify.sanitize(html, {RETURN_DOM_FRAGMENT:true, USE_PROFILES:{html:true,svg:true,svgFilters:true}, ADD_ATTR:['xmlns'], ADD_FORBID_CONTENTS:['button'], FORBID_TAGS:['style','button','iframe','object','embed','video','audio','form'], FORBID_ATTR:['style','srcset']});
  const root = createElement('div');
  root.append(clean);
  root.querySelectorAll('input').forEach(input=>{if(input.type==='checkbox'){input.closest('li')?.classList.add('task-list-item');const mark=createElement('span');mark.className='ps-check';mark.textContent=input.checked?'☑\uFE0E':'☐';input.replaceWith(mark);}else input.remove();});
  root.querySelectorAll('img').forEach(img=>{if(!/^data:image\/(png|jpeg|gif|webp|svg\+xml);(?:base64,|charset=utf-8,)/i.test(img.src)) {const alt=createElement('span');alt.className='ps-image-placeholder';alt.textContent=`[Image: ${img.alt || 'unavailable'}]`;img.replaceWith(alt);}});
  root.querySelectorAll('a').forEach(a=>{const href=a.getAttribute('href') ?? '';if(!/^(https?:|mailto:|#)/i.test(href)) a.removeAttribute('href');});
  root.querySelectorAll('svg').forEach(svg=>{svg.querySelectorAll('[href],[xlink\\:href]').forEach(el=>{for(const attr of ['href','xlink:href']) if(el.hasAttribute(attr) && !el.getAttribute(attr)!.startsWith('#')) el.removeAttribute(attr);});});
  root.querySelectorAll('.copy-code-button,.collapse-indicator,.edit-block-button,.metadata-container').forEach(e=>e.remove());
  if(hideEmbeddedNoteMetadata) {
    // Obsidian hides this generated furniture with workspace CSS, which is not
    // carried into the print frame. Remove it before pagination to reclaim space.
    // Do not remove .mod-frontmatter: it can also wrap the note's body content.
    for(const embed of root.querySelectorAll('.markdown-embed,.internal-embed:not(.image-embed):not(.media-embed)')) {
      embed.querySelectorAll('.markdown-embed-title,.markdown-embed-link,.inline-title,.frontmatter,.frontmatter-container,.frontmatter-section').forEach(e=>e.remove());
    }
  }
  // Native note previews add nested display containers. Paged.js can resume at
  // the next section instead of an overflowing figure inside these wrappers,
  // silently dropping the rest of the embed. Keep the outer embed (and its
  // metadata scope), but let its body blocks participate directly in pagination.
  for(const wrapper of root.querySelectorAll('.markdown-embed .markdown-embed-content,.markdown-embed .markdown-preview-view')) {
    wrapper.replaceWith(...wrapper.childNodes);
  }
  return root.innerHTML;
}
export function pageCss(preset: Preset): string {
  const p=normalizePreset(preset), [w,h]=paperSize(p);
  return `@page {size:${w}mm ${h}mm;margin:${p.marginTop}mm ${p.marginSide}mm ${p.marginBottom}mm;}
  ${p.differentFirstPage?`@page :first {margin-top:${p.firstPageMarginTop}mm;}`:''}
  *{box-sizing:border-box}body{color:#262727;font-family:${p.font==='serif'?'Georgia,"Times New Roman",serif':'Arial,Helvetica,sans-serif'};font-size:${p.fontSize}pt;line-height:${p.lineHeight};margin:0}
  .ps-content{overflow-wrap:anywhere}.ps-bottom-block{display:flow-root;position:relative}.ps-bottom-block>:last-child{margin-bottom:0}.ps-keep-heading{break-inside:avoid;page-break-inside:avoid}h1,h2,h3,h4,h5,h6{line-height:1.2;break-after:avoid;page-break-after:avoid;color:${p.color}}h1{font-size:2.3em;letter-spacing:-.04em;margin:0 0 .65em}h2{font-size:1.45em;margin:1.4em 0 .6em}h3{font-size:1.12em;margin:1.1em 0 .5em}p{margin:0 0 .9em;orphans:3;widows:3}ul,ol{padding-left:1.5em;margin:.5em 0 1em}li{margin:.25em 0}blockquote,.callout{border-left:3px solid ${p.color};background:#f4f5f4;padding:.7em 1em;margin:1em 0}.callout-title{font-weight:bold;margin-bottom:.4em}.callout-icon{display:none}blockquote p:last-child,.callout-content p:last-child{margin:0}hr{border:0;border-top:1px solid #d6dad8;margin:1.5em 0}table{width:100%;border-collapse:collapse;margin:1em 0;font-size:.9em}th,td{border-bottom:1px solid #d6dad8;text-align:left;padding:.6em .65em;vertical-align:top;overflow-wrap:anywhere}th{background:#edf0ee;color:${p.color};font-weight:600}thead{display:table-header-group}tr{break-inside:avoid}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f1f3f2;padding:1em;font-size:.82em;border:1px solid #e0e5e2}code{font-family:Consolas,"Liberation Mono",monospace;font-size:.9em}a{color:${p.color};text-decoration:underline}img,svg{max-width:100%;height:auto;max-height:${h-p.marginTop-p.marginBottom-10}mm;object-fit:contain}figure{margin:1em 0;break-inside:avoid}strong{font-weight:700}.ps-page-break{break-before:page;height:0}.ps-heading-break{break-before:page}.ps-image-placeholder{font-style:italic;color:#666}.internal-embed{border:0}.task-list-item{list-style:none}.ps-check{font-family:"DejaVu Sans","Segoe UI Symbol","Arial Unicode MS",sans-serif;display:inline-block;margin-right:.5em}
  .ps-page-header,.ps-page-footer{position:absolute;left:${p.marginSide}mm;right:${p.marginSide}mm;display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;gap:4mm;font-family:Arial,Helvetica,sans-serif;font-size:8pt;line-height:1.35;color:${p.color};z-index:5}
  .ps-page-header{top:10mm;height:${p.marginTop-14}mm;${p.headerRule?'border-bottom:.3mm solid '+p.color+';':''}padding-bottom:3mm}
  .ps-page-footer{bottom:10mm;height:${p.marginBottom-14}mm;${p.footerRule?'border-top:.2mm solid '+p.color+';':''}padding-top:2mm}
  .ps-slot{white-space:pre-wrap;overflow-wrap:anywhere;overflow:hidden;max-height:100%}.ps-slot.center{text-align:center}.ps-slot.right{text-align:right}.ps-slot.left{display:flex;align-items:center;gap:3mm}.ps-logo{flex-shrink:0;width:auto;max-width:23mm;max-height:${Math.min(p.logoHeight,p.marginTop-18)}mm;object-fit:contain}.ps-page-border{position:absolute;inset:7mm;pointer-events:none;z-index:4;${p.border==='none'?'display:none;':`border:${p.borderWidth}mm ${p.border} ${p.color};`}}
  .ps-slot{min-width:0}.ps-slot>span{min-width:0}
  ${p.differentFirstPage?`.ps-first-page .ps-page-header{grid-template-columns:2fr 1fr 1fr;height:${p.firstPageMarginTop-14}mm;border-bottom:${p.firstPageHeaderRule?'.3mm solid '+p.color:'0'}}.ps-first-page .ps-logo{max-width:40mm;max-height:${Math.min(p.firstPageLogoHeight,p.firstPageMarginTop-18)}mm}`:''}
  `;
}
export function frameDocument(job: PrintJob, token: string, createElement: ElementFactory, colorScheme: 'light' | 'dark' = 'light'): string {
  const preset=normalizePreset(job.preset);
  const payload=JSON.stringify({...job,preset,html:cleanMarkup(job.html, createElement, preset.hideEmbeddedNoteMetadata),token}).replace(/</g,'\\u003c');
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' blob:; img-src data:; font-src data:; connect-src 'none';"><title>${escapeHtml(job.context.title)} — Print Studio</title><style data-pagedjs-ignore>
  :root{color-scheme:${colorScheme==='dark'?'dark':'light'}}html,body{background:transparent;margin:0}.pagedjs_pages{display:flex;flex-direction:column;align-items:center;gap:24px;padding:24px}.pagedjs_page{color-scheme:light;background:white;box-shadow:0 2px 12px #00000026;flex-shrink:0}.pagedjs_pagebox{position:relative}#ps-loading{display:none}
  @media print{html,body{color-scheme:light;background:white!important}.pagedjs_pages{display:block!important;padding:0!important;zoom:1!important}.pagedjs_page{margin:0!important;box-shadow:none!important;break-after:page}.pagedjs_page:last-child{break-after:auto}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}#ps-loading{display:none}}
  </style></head><body><div id="ps-loading">Preparing your pages…</div><div id="ps-output"></div><script>window.PRINT_STUDIO_JOB=${payload};</script><script>${FRAME_RUNTIME.replace(/<\/script/gi,'<\\/script')}</script></body></html>`;
}
