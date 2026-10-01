import {Context} from 'html2canvas/dist/lib/core/context';
import {CacheStorage} from 'html2canvas/dist/lib/core/cache-storage';
import {Bounds,parseBounds} from 'html2canvas/dist/lib/css/layout/bounds';
import {parseTree} from 'html2canvas/dist/lib/dom/node-parser';
import {CanvasRenderer} from 'html2canvas/dist/lib/render/canvas/canvas-renderer';

// Use the pinned renderer against our already-frozen, disposable snapshot.
// html2canvas's default wrapper clones into another iframe with document.write;
// WebKit changes that nested frame's origin and export never completes. Reading
// the snapshot directly avoids that clone without granting script permission.
export async function rasterPage(page:HTMLElement):Promise<HTMLCanvasElement> {
  const view=page.ownerDocument.defaultView!;
  CacheStorage.setContext(view);
  const context=new Context({logging:false,allowTaint:false,useCORS:false,imageTimeout:15000},new Bounds(view.scrollX,view.scrollY,view.innerWidth,view.innerHeight));
  const bounds=parseBounds(context,page);
  const tree=parseTree(context,page);
  const renderer=new CanvasRenderer(context,{scale:2,backgroundColor:0xffffffff,x:bounds.left,y:bounds.top,width:Math.ceil(bounds.width),height:Math.ceil(bounds.height)});
  try {return await renderer.render(tree);}
  catch(error){renderer.canvas.width=1;renderer.canvas.height=1;throw error;}
}
