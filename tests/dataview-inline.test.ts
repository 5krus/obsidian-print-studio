import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {dataviewSourcePath,settleDataviewInline} from '../src/dataview-inline';

const dom=new JSDOM('<!doctype html><body></body>');
Object.assign(globalThis,{window:dom.window});
const doc=dom.window.document;
const parse=(html:string)=>{const root=doc.createElement('div');root.innerHTML=html;return root;};

test('embedded source paths resolve from outer to inner notes and never fall back to parent metadata',()=>{
  const root=parse('<code>=this.name</code><div class="markdown-embed" src="Folder/Outer"><div class="markdown-embed" src="Inner#Section"><code>=this.name</code></div></div>');
  const codes=root.querySelectorAll('code');const calls:string[]=[];
  const resolve=(link:string,origin:string)=>{calls.push(`${origin}:${link}`);return link==='Folder/Outer'?'Folder/Outer.md':'Folder/Inner.md';};
  assert.equal(dataviewSourcePath(codes[0],root,'Parent.md',resolve),'Parent.md');
  assert.equal(dataviewSourcePath(codes[1],root,'Parent.md',resolve),'Folder/Inner.md');
  assert.deepEqual(calls,['Parent.md:Folder/Outer','Folder/Outer.md:Inner#Section']);
  assert.equal(dataviewSourcePath(codes[1],root,'Parent.md',()=>undefined),undefined);
  root.querySelector('.markdown-embed')!.removeAttribute('src');
  assert.equal(dataviewSourcePath(codes[1],root,'Parent.md',resolve),undefined);
});

test('waits for every Dataview target, including complex expressions, before continuing',async()=>{
  const root=parse('<h1><code>=this.name</code> · v<code>=this.version + 1</code></h1>');
  const codes=root.querySelectorAll('code');
  setTimeout(()=>codes[0].replaceWith('Sample Salve'),10);
  setTimeout(()=>codes[1].replaceWith('3'),75);
  assert.equal(await settleDataviewInline(root,{settings:{}}),0);
  assert.equal(root.textContent,'Sample Salve · v3');
});

test('does not evaluate or wait for literal code when Dataview is absent or inline queries are disabled',async()=>{
  for(const plugin of [undefined,{settings:{enableInlineDataview:false}}]) {
    const root=parse('<p><code>=this.name</code><code>$=dv.current().name</code></p>');
    const original=root.innerHTML;
    assert.equal(await settleDataviewInline(root,plugin,{timeoutMs:0}),0);
    assert.equal(root.innerHTML,original);
  }
});

test('respects trimmed custom prefixes, empty prefixes and disabled JavaScript',async()=>{
  const root=parse('<code> dv: this.name </code><code>=this.name</code><code>js: dv.current().name</code>');
  setTimeout(()=>root.querySelector('code')!.replaceWith('Sample Salve'),10);
  assert.equal(await settleDataviewInline(root,{settings:{inlineQueryPrefix:'dv:',inlineJsQueryPrefix:'js:'}}),0);
  assert.equal(root.textContent,'Sample Salve=this.namejs: dv.current().name');
  assert.equal(await settleDataviewInline(parse('<code>=this.name</code>'),{settings:{inlineQueryPrefix:'',inlineJsQueryPrefix:''}},{timeoutMs:0}),0);
  assert.equal(await settleDataviewInline(parse('<code>=  </code><code>$= </code>'),{settings:{}},{timeoutMs:0}),0);
});

test('respects JS opt-in and JS prefix precedence without executing scripts itself',async()=>{
  const settings={inlineQueryPrefix:'=',inlineJsQueryPrefix:'=js',enableDataviewJs:true,enableInlineDataviewJs:true};
  const root=parse('<code>=js dv.current().name</code>');
  setTimeout(()=>root.querySelector('code')!.replaceWith('Rendered JS value'),10);
  assert.equal(await settleDataviewInline(root,{settings}),0);
  assert.equal(root.textContent,'Rendered JS value');
  const disabled=parse('<code>=js dv.current().name</code>');
  for(const flags of [{enableDataviewJs:false},{enableInlineDataviewJs:false}]) {
    assert.equal(await settleDataviewInline(disabled,{settings:{...settings,...flags}},{timeoutMs:0}),0);
  }
});

test('only waits for fenced code when Dataview is configured to render it',async()=>{
  const root=parse('<pre><code>=this.name</code></pre>');
  assert.equal(await settleDataviewInline(root,{settings:{inlineQueriesInCodeblocks:false}},{timeoutMs:0}),0);
  assert.equal(await settleDataviewInline(root,{settings:{inlineQueriesInCodeblocks:true}},{timeoutMs:0}),1);
});

test('timeout preserves unresolved queries and reports them rather than guessing frontmatter values',async()=>{
  const root=parse('<code>=this.missing</code><code>=this.name</code>');
  const original=root.innerHTML;
  assert.equal(await settleDataviewInline(root,{settings:{}},{timeoutMs:20}),2);
  assert.equal(root.innerHTML,original);
});

test('closing the print view cancels the wait promptly and leaves no polling timer',async()=>{
  const root=parse('<code>=this.name</code>');
  const controller=new AbortController();
  const pending=settleDataviewInline(root,{settings:{}},{signal:controller.signal});
  controller.abort();
  assert.equal(await pending,0);
  assert.equal(root.textContent,'=this.name');
  assert.equal(await settleDataviewInline(root,{settings:{}},{signal:controller.signal}),0);
});

test('ignores hidden content and code returned inside rendered values',async()=>{
  const root=parse('<span class="print-hide"><code>=this.name</code></span><span class="dataview"><code>=literal</code></span><code>=this.example</code>');
  setTimeout(()=>{
    const result=doc.createElement('span');result.innerHTML='<code>=a literal code sample</code>';
    root.querySelector(':scope > code')!.replaceWith(result);
  },10);
  assert.equal(await settleDataviewInline(root,{settings:{}}),0);
  assert.match(root.textContent!,/=a literal code sample/);
});

const render={
  component:{} as import('obsidian').Component,
  createElement:((tag:string,cls='')=>{const el=doc.createElement(tag);el.className=cls;return el;}) as import('../src/ui').ElementFactory,
  sourcePathFor:()=> 'Recipe.md',
};

test('uses Dataview API for file-context evaluation and rich value rendering when no postprocessor ran',async()=>{
  const root=parse('<h1><code>=this.name</code> · v<code>=this.version + 1</code></h1>');
  const calls:string[]=[];
  const api={
    evaluateInline:(expression:string,origin:string)=>{calls.push(`${origin}:${expression}`);return {successful:true,value:expression==='this.name'?'Sample Salve':3};},
    renderValue:async(value:unknown,container:HTMLElement,component:unknown,origin:string)=>{
      assert.equal(component,render.component);assert.equal(origin,'Recipe.md');
      await new Promise(resolve=>setTimeout(resolve,10));
      const strong=doc.createElement('strong');strong.textContent=String(value);container.append(strong);
    },
  };
  assert.equal(await settleDataviewInline(root,{api},{render}),0);
  assert.deepEqual(calls,['Recipe.md:this.name','Recipe.md:this.version + 1']);
  assert.equal(root.textContent,'Sample Salve · v3');
  assert.equal(root.querySelectorAll('strong').length,2);
});

test('waits for the Dataview index before evaluating and preserves null, false, zero and empty values',async()=>{
  const root=parse('<code>=this.null</code><code>=this.false</code><code>=this.zero</code><code>=this.empty</code>');
  const index={initialized:false};
  const values=[null,false,0,''];let calls=0;
  const api={
    evaluateInline:()=>{assert.equal(index.initialized,true);return {successful:true,value:values[calls++]};},
    renderValue:async(value:unknown,container:HTMLElement)=>{container.textContent=value===null?'—':String(value);},
  };
  setTimeout(()=>{index.initialized=true;},10);
  assert.equal(await settleDataviewInline(root,{api,index},{render}),0);
  assert.equal(calls,4);assert.equal(root.textContent,'—false0');assert.equal(root.querySelectorAll('code').length,0);
});

test('never sends JS to the DQL API and does not guess an unknown embedded source',async()=>{
  const root=parse('<code>=this.name</code><code>$=danger()</code>');let calls=0;
  const api={evaluateInline:()=>{calls++;return {successful:true};},renderValue:async()=>{}};
  assert.equal(await settleDataviewInline(root,{api},{render:{...render,sourcePathFor:()=>undefined},timeoutMs:20}),1);
  assert.equal(calls,0);assert.equal(root.querySelectorAll('code').length,2);
});

test('render failures and timeouts preserve the query, and late results never change the snapshot',async()=>{
  for(const failure of ['evaluate','render','late'] as const) {
    const root=parse('<code>=this.name</code>');let finish=()=>{};
    const api={
      evaluateInline:()=>{if(failure==='evaluate')throw Error('Unavailable');return {successful:true,value:'Sample Salve'};},
      renderValue:async(_value:unknown,container:HTMLElement)=>{
        if(failure==='render')throw Error('Render failed');
        await new Promise<void>(resolve=>{finish=resolve;});container.textContent='Too late';
      },
    };
    assert.equal(await settleDataviewInline(root,{api},{render,timeoutMs:20}),1);
    finish();await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(root.innerHTML,'<code>=this.name</code>');
  }
});

test('cancellation prevents an in-flight API render from modifying a closed view',async()=>{
  const root=parse('<code>=this.name</code>');const controller=new AbortController();let finish=()=>{};
  const api={evaluateInline:()=>({successful:true,value:'Sample Salve'}),renderValue:async(_value:unknown,container:HTMLElement)=>{
    await new Promise<void>(resolve=>{finish=resolve;});container.textContent='Too late';
  }};
  const pending=settleDataviewInline(root,{api},{render,signal:controller.signal});
  controller.abort();assert.equal(await pending,0);
  finish();await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(root.innerHTML,'<code>=this.name</code>');
});
