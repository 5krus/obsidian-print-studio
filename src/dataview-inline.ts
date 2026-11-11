import type {Component} from 'obsidian';
import type {ElementFactory} from './ui';

interface DataviewLike {
  index?:{initialized:boolean};
  api?: {
    evaluateInline(expression:string,origin:string):{successful:boolean;value?:unknown};
    renderValue(value:unknown,container:HTMLElement,component:Component,origin:string):Promise<void>;
  };
  settings?: {
    inlineQueryPrefix?:string;
    inlineJsQueryPrefix?:string;
    enableInlineDataview?:boolean;
    enableDataviewJs?:boolean;
    enableInlineDataviewJs?:boolean;
    inlineQueriesInCodeblocks?:boolean;
  };
}

interface SettleOptions {
  signal?:AbortSignal;
  timeoutMs?:number;
  render?:{
    component:Component;
    createElement:ElementFactory;
    sourcePathFor:(code:HTMLElement)=>string|undefined;
  };
}

/** Embedded queries must use their own note's fields, never the parent's. */
export function dataviewSourcePath(code:HTMLElement,root:HTMLElement,sourcePath:string,
  resolveLink:(link:string,origin:string)=>string|undefined):string|undefined {
  let origin:string|undefined=sourcePath;
  const embeds:HTMLElement[]=[];
  for(let parent=code.parentElement;parent && parent!==root;parent=parent.parentElement) {
    if(parent.matches('.markdown-embed'))embeds.unshift(parent);
  }
  for(const embed of embeds) {
    const link=embed.getAttribute('src');
    if(!link || !origin || link.includes('?no-dataview'))return undefined;
    origin=resolveLink(link,origin);
  }
  return origin;
}

/** Resolve pending DQL with Dataview's API and wait for its asynchronous renderers. */
export async function settleDataviewInline(root:HTMLElement,dataview:DataviewLike|undefined,
  {signal,timeoutMs=3000,render}:SettleOptions={}):Promise<number> {
  if(!dataview || dataview.settings?.enableInlineDataview===false || signal?.aborted)return 0;
  const settings=dataview.settings??{};
  const prefix=settings.inlineQueryPrefix??'=';
  const jsPrefix=settings.inlineJsQueryPrefix??'$=';
  // Keep the original targets: a rendered value can itself contain literal code.
  const targets=[...root.querySelectorAll<HTMLElement>('code')].filter(code=>{
    if(code.closest('.print-hide,.dataview') || (code.closest('pre') && !settings.inlineQueriesInCodeblocks))return false;
    const text=(code.textContent??'').trim();
    // Dataview gives the JS prefix priority, even when the prefixes overlap.
    if(jsPrefix && text.startsWith(jsPrefix))return settings.enableDataviewJs===true && settings.enableInlineDataviewJs===true && Boolean(text.slice(jsPrefix.length).trim());
    return Boolean(prefix && text.startsWith(prefix) && text.slice(prefix.length).trim());
  });
  if(!targets.length)return 0;
  const deadline=Date.now()+timeoutMs;
  return new Promise(resolve=>{
    let timer:number|undefined;
    let finished=false;
    const finish=(pending:number)=>{
      finished=true;
      if(timer!==undefined)window.clearTimeout(timer);
      signal?.removeEventListener('abort',abort);
      resolve(pending);
    };
    const abort=()=>finish(0);
    const api=dataview.api;
    const started=new Set<HTMLElement>();
    const startRendering=()=>{
      if(dataview.index?.initialized===false || !render || typeof api?.evaluateInline!=='function' || typeof api.renderValue!=='function')return;
      for(const code of targets) {
        if(started.has(code) || !root.contains(code))continue;
        started.add(code);
        const text=(code.textContent??'').trim();
        // Never run JavaScript ourselves or treat it as a regular DQL expression.
        if(jsPrefix && text.startsWith(jsPrefix))continue;
        // Offscreen MarkdownRenderer renders can omit inline postprocessors.
        // The plugin API supplies the same file context and value formatting.
        void (async()=>{
          try {
            const origin=render.sourcePathFor(code);
            if(!origin || origin.includes('?no-dataview'))return;
            const result=api.evaluateInline(text.slice(prefix.length).trim(),origin);
            if(!result.successful)return;
            const output=render.createElement('span','dataview dataview-inline-query');
            await api.renderValue(result.value,output,render.component,origin);
            if(!finished && !signal?.aborted && root.contains(code))code.replaceWith(output);
          } catch {
            // Keep the query intact and report it if no renderer completes it.
          }
        })();
      }
    };
    const check=()=>{
      if(signal?.aborted){finish(0);return;}
      const pending=targets.filter(code=>root.contains(code)).length;
      const remaining=deadline-Date.now();
      if(!pending || remaining<=0){finish(pending);return;}
      startRendering();
      timer=window.setTimeout(check,Math.min(50,remaining));
    };
    signal?.addEventListener('abort',abort,{once:true});
    check();
  });
}
