// Paged.js uses CSS columns to find page breaks. Finished pages must not reflow
// into those off-page columns when a different window or zoom rounds text widths
// differently. Preserve the visible line breaks before dropping the columns.
const textBlocks='p,h1,h2,h3,h4,h5,h6,td,th,li,figcaption,center';
const nestedBlocks='div,p,h1,h2,h3,h4,h5,h6,table,ul,ol,li,blockquote,pre,figure,figcaption,center,img,svg,canvas';

function endsWithBreak(node:Node):boolean {
  for(let child=node.lastChild;child;child=child.previousSibling) {
    if(child.nodeType===3 && !child.textContent?.trim())continue;
    return child.nodeName==='BR' || endsWithBreak(child);
  }
  return false;
}

export function freezePageContent(pages:HTMLElement[]):void {
  const changes:Array<{block:HTMLElement;lines:DocumentFragment[]}>=[];
  for(const page of pages) {
    for(const block of page.querySelectorAll<HTMLElement>(`.pagedjs_page_content :is(${textBlocks})`)) {
      // Keep media, preformatted text, and nested block layouts intact. Their
      // individual text blocks are considered separately by the outer traversal.
      if(block.querySelector(nestedBlocks) || !['normal','nowrap','pre-line'].includes(getComputedStyle(block).whiteSpace))continue;
      const doc=block.ownerDocument,walker=doc.createTreeWalker(block,NodeFilter.SHOW_TEXT);
      const glyph=doc.createRange(),line=doc.createRange();line.setStart(block,0);
      const lines:DocumentFragment[]=[];
      let bottom=-Infinity,node:Node|null;
      const measure=(node:Node,offset:number,rect:DOMRect)=>{
        if(!rect.width || !rect.height)return;
        // Superscripts/subscripts overlap the ordinary glyphs on their line.
        if(bottom!==-Infinity && rect.top>=bottom-.5) {
          // A boundary before an inline element must not clone an empty copy
          // onto the preceding line (especially sub/sup, which affect height).
          let boundary=node;
          if(offset===0)while(boundary.parentNode!==block && !boundary.previousSibling)boundary=boundary.parentNode!;
          if(offset===0)line.setEndBefore(boundary);else line.setEnd(node,offset);
          lines.push(line.cloneContents());
          if(offset===0)line.setStartBefore(boundary);else line.setStart(node,offset);
          bottom=-Infinity;
        }
        bottom=Math.max(bottom,rect.bottom);
      };
      while((node=walker.nextNode())) {
        for(const word of (node.textContent??'').matchAll(/\S+/gu)) {
          const start=word.index,end=start+word[0].length;
          glyph.setStart(node,start);glyph.setEnd(node,end);
          const rects=[...glyph.getClientRects()].filter(rect=>rect.width && rect.height);
          if(rects.length===1)measure(node,start,rects[0]);
          else for(let offset=start;offset<end;offset++) {
            // Long URLs and scripts without spaces can wrap within a word.
            glyph.setStart(node,offset);glyph.setEnd(node,offset+1);
            measure(node,offset,glyph.getBoundingClientRect());
          }
        }
      }
      if(bottom===-Infinity)continue;
      line.setEnd(block,block.childNodes.length);lines.push(line.cloneContents());
      changes.push({block,lines});
    }
  }
  // Measure every block before changing any layout.
  for(const {block,lines} of changes) {
    block.replaceChildren();block.classList.add('ps-fixed-lines');
    lines.forEach((line,index)=>{
      const explicitBreak=endsWithBreak(line);
      block.append(line);
      if(index<lines.length-1 && !explicitBreak)block.append(block.ownerDocument.createElement('br'));
    });
  }
  for(const page of pages)for(const content of page.querySelectorAll<HTMLElement>('.pagedjs_page_content')) {
    content.classList.add('ps-fixed-page');
  }
}
