import DOMPurify from 'dompurify';
import type {ElementFactory} from './ui';

const svgProperties=['background-color','color','fill','fill-opacity','fill-rule','stroke','stroke-width','stroke-opacity','stroke-linecap','stroke-linejoin','stroke-dasharray','stroke-dashoffset','stroke-miterlimit','opacity','font-family','font-size','font-weight','font-style','font-variant','letter-spacing','word-spacing','text-anchor','dominant-baseline','paint-order','shape-rendering','marker-start','marker-mid','marker-end','clip-path','mask','filter','stop-color','stop-opacity','flood-color','flood-opacity','display'];
const labelProperties=['color','background-color','font-family','font-size','font-weight','font-style','font-variant','line-height','letter-spacing','word-spacing','text-align','text-decoration','white-space','word-break','overflow-wrap','display','box-sizing','width','height','max-width','max-height','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','border-top-width','border-right-width','border-bottom-width','border-left-width','border-style','border-color','border-radius','opacity'];

/** Retain only references to definitions inside this particular SVG. */
function localReference(value:string,ids:Set<string>,baseURI:string):string|undefined {
  try {
    const target=new URL(value,baseURI),base=new URL(baseURI);
    const id=decodeURIComponent(target.hash.slice(1));target.hash='';base.hash='';
    if(target.href===base.href && /^[-\w:.]+$/.test(id) && ids.has(id))return `#${id}`;
  } catch { /* Invalid references are omitted. */ }
  return undefined;
}
function capturedValue(value:string,ids:Set<string>,baseURI:string):string|undefined {
  if(/url\s*\(/i.test(value)) {
    const match=value.match(/^url\(["']?([^"')]+)["']?\)$/i);
    const local=match && localReference(match[1],ids,baseURI);
    return local?`url("${local}")`:undefined;
  }
  return /var\s*\(|expression\s*\(|javascript:/i.test(value)?undefined:value;
}

/** Freeze Mermaid's SVG styles and HTML labels inside an inert SVG image. */
export function snapshotMermaid(root:HTMLElement,createElement:ElementFactory):void {
  const view=root.ownerDocument.defaultView!;
  for(const svg of root.querySelectorAll<SVGSVGElement>('.mermaid > svg')) {
    if(svg.closest('.print-hide'))continue;
    const clone=svg.cloneNode(true) as SVGSVGElement;
    const originals=[svg,...svg.querySelectorAll('*')];
    const copies=[clone,...clone.querySelectorAll('*')];
    const ids=new Set(originals.map(el=>el.id).filter(Boolean));
    originals.forEach((element,index)=>{
      const copy=copies[index];copy.removeAttribute('style');
      const computed=view.getComputedStyle(element);
      const properties=element.namespaceURI==='http://www.w3.org/1999/xhtml'?labelProperties:svgProperties;
      const declarations:string[]=[];
      for(const property of properties) {
        const value=capturedValue(computed.getPropertyValue(property),ids,element.baseURI);
        if(value)declarations.push(`${property}:${value}`);
      }
      // The host deliberately hides the offscreen render. Do not capture its visibility.
      if(declarations.length)copy.setAttribute('style',declarations.join(';'));
      for(const attribute of [...copy.attributes]) {
        if(attribute.name==='style')continue;
        if(attribute.localName==='href') {
          const local=localReference(attribute.value,ids,element.baseURI);
          if(local)copy.setAttributeNS(attribute.namespaceURI,attribute.name,local);else copy.removeAttributeNode(attribute);
        } else if(/url\s*\(/i.test(attribute.value)) {
          const value=capturedValue(attribute.value,ids,element.baseURI);
          if(value)copy.setAttribute(attribute.name,value);else copy.removeAttributeNode(attribute);
        }
      }
    });
    // HTML labels are allowed only inside this image, never in the print document's SVG.
    const clean=DOMPurify.sanitize(clone,{RETURN_DOM_FRAGMENT:true,USE_PROFILES:{html:true,svg:true,svgFilters:true},HTML_INTEGRATION_POINTS:{foreignobject:true},ADD_TAGS:['foreignObject','use'],ADD_ATTR:['xmlns'],FORBID_TAGS:['style','script','iframe','object','embed','video','audio','form','input','button','image','img','animate','animateMotion','animateTransform','set'],FORBID_ATTR:['src','srcset']});
    const imageSvg=clean.querySelector('svg');
    if(!imageSvg)continue;
    const bounds=svg.getBoundingClientRect();
    const width=bounds.width || svg.viewBox.baseVal.width;
    const height=bounds.height || svg.viewBox.baseVal.height;
    if(!(width>0 && height>0))continue;
    imageSvg.setAttribute('width',String(width));imageSvg.setAttribute('height',String(height));
    // XMLSerializer supplies namespace declarations, including XHTML label roots.
    for(const element of [imageSvg,...imageSvg.querySelectorAll('[xmlns]')])element.removeAttribute('xmlns');
    const image=createElement('img','ps-mermaid');
    image.width=Math.ceil(width);image.height=Math.ceil(height);
    image.alt=svg.getAttribute('aria-label') || svg.querySelector('title')?.textContent || 'Mermaid diagram';
    image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new view.XMLSerializer().serializeToString(imageSvg));
    svg.replaceWith(image);
  }
}
