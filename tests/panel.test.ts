import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {browserUI} from './support/ui';
import {defaults,type Settings} from '../src/settings';
const dom=new JSDOM('<!doctype html><body><div id="root"></div></body>',{url:'http://localhost',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,HTMLInputElement:dom.window.HTMLInputElement,document:dom.window.document,FRAME_RUNTIME:'/* runtime stub */'});
const {StudioPanel}=await import('../src/panel');
const source={html:'<h1>Note</h1>',context:{title:'Note',vault:'Work',date:'Today',metadata:{}},warnings:[]};
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
after(()=>dom.window.close());
const button=(name:string)=>document.querySelector<HTMLButtonElement>(`[aria-label="${name}"]`)!;
const job=()=>JSON.parse(document.querySelector('iframe')!.srcdoc.match(/window.PRINT_STUDIO_JOB=(.*?);<\/script>/)![1]);
const send=(data:Record<string,unknown>)=>window.dispatchEvent(new dom.window.MessageEvent('message',{source:document.querySelector('iframe')!.contentWindow,data:{token:job().token,...data}}));

test('layout edits reuse the note, preserve the page, and clamp after pagination shrinks',async()=>{
  let reads=0;
  const panel=new StudioPanel(document.querySelector('#root')!,{ui:browserUI,settings:defaults(),source:async()=>{reads++;return source;},save:async()=>{},notify:()=>{}});
  try {
    await tick();send({type:'ready',pages:8});send({type:'viewport',page:6});
    await panel.render();send({type:'ready',pages:7});
    assert.equal(document.querySelector<HTMLInputElement>('[aria-label="Page"]')!.value,'6');
    assert.equal(reads,1);
    await panel.render();send({type:'ready',pages:3});
    assert.equal(document.querySelector<HTMLInputElement>('[aria-label="Page"]')!.value,'3');
    button('Refresh note').click();await tick();assert.equal(reads,2);
  }finally{panel.dispose();}
});

test('a newer refresh wins over pending source reads and failed reads can be retried',async()=>{
  const pending:Array<{resolve:(value:typeof source)=>void;reject:(error:Error)=>void}>=[];
  const panel=new StudioPanel(document.querySelector('#root')!,{ui:browserUI,settings:defaults(),source:()=>new Promise((resolve,reject)=>pending.push({resolve,reject})),save:async()=>{},notify:()=>{}});
  try {
    await tick();const shared=panel.render();await tick();assert.equal(pending.length,1);
    const fresh=panel.render(true);await tick();assert.equal(pending.length,2);
    pending[1].resolve({...source,html:'<p>Fresh</p>'});await fresh;
    pending[0].resolve({...source,html:'<p>Stale</p>'});await shared;assert.equal(job().html,'<p>Fresh</p>');
    const failed=panel.render(true);await tick();pending[2].reject(new Error('Read failed'));await failed;
    const retry=panel.render();await tick();assert.equal(pending.length,4);pending[3].resolve(source);await retry;
    assert.equal(job().html,source.html);
  }finally{panel.dispose();}
});

test('undo and redo persist restored presets, including removed presets',async()=>{
  let saved:Settings|undefined;
  const panel=new StudioPanel(document.querySelector('#root')!,{ui:{...browserUI,confirmRemoval:async()=>true},settings:defaults(),source:async()=>source,save:async s=>{saved=s;},notify:()=>{}});
  try {
    await tick();assert.equal(button('Undo change').disabled,true);
    button('Remove preset').click();await tick();assert.equal(saved?.presets.length,2);
    button('Undo change').click();await tick();assert.equal(saved?.presets.length,3);assert.equal(saved?.activeId,'classic');
    assert.equal(document.activeElement,button('Redo change'));
    button('Redo change').click();await tick();assert.equal(saved?.presets.length,2);
    assert.equal(document.activeElement,button('Undo change'));
  }finally{panel.dispose();}
});

test('placeholder picker inserts at the selection and updates properties on refresh',async()=>{
  let saved:Settings|undefined;
  let metadata:Record<string,unknown>={client:'Acme',count:0,approved:false,tags:['a']};
  const panel=new StudioPanel(document.querySelector('#root')!,{ui:browserUI,settings:defaults(),source:async()=>({...source,context:{...source.context,metadata}}),save:async s=>{saved=s;},notify:()=>{}});
  try {
    await tick();const field=document.querySelector<HTMLTextAreaElement>('[data-section="Header"] textarea')!;
    const picker=document.querySelector<HTMLSelectElement>('[aria-label="Insert placeholder into Header left"]')!;
    assert.ok(picker.querySelector('option[value="{{meta:approved}}"]'));
    assert.equal(picker.querySelector('option[value="{{meta:tags}}"]'),null);
    field.value='Dear CLIENT!';field.setSelectionRange(5,11);picker.value='{{meta:client}}';picker.dispatchEvent(new dom.window.Event('change'));
    await tick();assert.equal(field.value,'Dear {{meta:client}}!');assert.equal(saved?.presets[0].header.left,field.value);
    assert.equal(document.activeElement,field);assert.equal(field.selectionStart,'Dear {{meta:client}}'.length);
    metadata={project:'New'};await panel.render(true);
    assert.equal(picker.querySelector('option[value="{{meta:client}}"]'),null);assert.ok(picker.querySelector('option[value="{{meta:project}}"]'));
  }finally{panel.dispose();}
});

test('layout warnings are actionable, scoped to the current job, and cleared by edits',async()=>{
  const panel=new StudioPanel(document.querySelector('#root')!,{ui:browserUI,settings:defaults(),source:async()=>source,save:async()=>{},notify:()=>{}});
  try {
    await tick();send({type:'warnings',warnings:[{page:2,kind:'header'}]});send({type:'ready',pages:3});
    assert.match(document.querySelector('.ps-notes')!.textContent!,/increase the top margin/);
    button('Page 2').click();assert.equal(document.querySelector<HTMLInputElement>('[aria-label="Page"]')!.value,'2');
    await panel.render();assert.equal(document.querySelector('.ps-warning'),null);
  }finally{panel.dispose();}
});
test('preview readiness is scoped to the current frame job; edits cannot print stale pages',async()=>{
  let saved:Settings|undefined;const messages:string[]=[];
  const panel=new StudioPanel(document.querySelector('#root')!,{ui:browserUI,settings:defaults(),source:async()=>source,save:async value=>{saved=value;},notify:value=>messages.push(value)});
  try {
    await tick();const frame=document.querySelector('iframe')!;
    const token=()=>JSON.parse(frame.srcdoc.match(/window.PRINT_STUDIO_JOB=(.*?);<\/script>/)![1]).token;
    const send=(current:string,origin:Window|null=frame.contentWindow)=>window.dispatchEvent(new dom.window.MessageEvent('message',{source:origin,data:{type:'ready',token:current,pages:3}}));
    const print=document.querySelector<HTMLButtonElement>('.ps-primary')!;const old=token();
    send(old,null);assert.equal(print.disabled,true,'Foreign message must not enable printing');
    send(old);assert.equal(print.disabled,false);
    const company=document.querySelectorAll<HTMLInputElement>('input[type=text]')[1];company.value='New brand';company.dispatchEvent(new dom.window.Event('input'));
    assert.equal(print.disabled,true);send(old);assert.equal(print.disabled,true,'Old pages must stay unprintable after an edit');
    await tick();assert.equal(saved?.presets[0].company,'New brand');
    await panel.render();send(token());assert.equal(print.disabled,false);assert.match(frame.srcdoc,/New brand/);
    assert.deepEqual(messages,[]);
  }finally{panel.dispose();assert.equal(document.querySelector('iframe'),null);}
});

test('preset edits retain open sections and use an accessible confirmation before removal',async()=>{
  let saved:Settings|undefined;
  let confirm=false;
  const confirmations:string[]=[];
  const ui={...browserUI,confirmRemoval:async(name:string)=>{confirmations.push(name);return confirm;}};
  const settings=defaults();settings.presets=settings.presets.slice(0,1);
  const panel=new StudioPanel(document.querySelector('#root')!,{ui,settings,source:async()=>source,save:async value=>{saved=value;},notify:()=>{}});
  const button=(name:string)=>document.querySelector<HTMLButtonElement>(`[aria-label="${name}"]`)!;
  try {
    await tick();
    assert.equal(button('Remove preset').disabled,true);
    document.querySelector<HTMLDetailsElement>('[data-section="Page layout"]')!.open=true;
    button('Duplicate preset').click();
    await tick();
    assert.equal(saved?.presets.length,2);
    assert.equal(document.querySelector<HTMLDetailsElement>('[data-section="Page layout"]')!.open,true);
    const name=document.querySelector<HTMLInputElement>('input[type=text]')!;
    name.value='My letterhead';name.dispatchEvent(new dom.window.Event('input'));
    assert.equal(document.querySelector('select')!.selectedOptions[0].textContent,'My letterhead');
    const toggle=document.querySelector<HTMLElement>('[role=switch]')!;
    const wasOn=toggle.getAttribute('aria-checked')==='true';
    toggle.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:' ',bubbles:true}));
    await tick();
    assert.equal(saved?.presets.find(p=>p.id===saved?.activeId)?.headingBreaks,!wasOn);
    assert.equal(toggle.getAttribute('aria-checked'),String(!wasOn));
    assert.ok(document.getElementById(toggle.getAttribute('aria-labelledby')!)?.textContent);
    button('Remove preset').click();await tick();
    assert.equal(saved?.presets.length,2,'Cancel keeps the preset');
    confirm=true;button('Remove preset').click();await tick();
    assert.equal(saved?.presets.length,1);
    assert.equal(button('Remove preset').disabled,true);
    assert.deepEqual(confirmations,['My letterhead','My letterhead']);
  }finally{panel.dispose();}
});

test('the isolated preview follows theme changes without changing the document preset',async()=>{
  document.body.classList.add('theme-dark');
  let saves=0;
  const panel=new StudioPanel(document.querySelector('#root')!,{ui:browserUI,settings:defaults(),source:async()=>source,save:async()=>{saves++;},notify:()=>{}});
  try {
    await tick();
    const frame=document.querySelector('iframe')!;
    assert.match(frame.srcdoc,/:root\{color-scheme:dark\}/);
    assert.equal(frame.style.colorScheme,'dark');
    const initial=frame.srcdoc;
    const messages:unknown[]=[];
    frame.contentWindow!.postMessage=(message:unknown)=>messages.push(message);
    document.body.classList.replace('theme-dark','theme-light');await tick();
    assert.equal(frame.style.colorScheme,'light');
    assert.equal(frame.srcdoc,initial,'Changing the app theme must not repaginate the note');
    assert.ok(messages.some(value=>(value as {type:string;scheme:string}).type==='theme' && (value as {scheme:string}).scheme==='light'));
    assert.equal(saves,0,'App appearance must not modify print presets');
  }finally{panel.dispose();document.body.classList.remove('theme-light');}
});

test('queued viewport reports cannot replace a page number while it is being edited',async()=>{
  const panel=new StudioPanel(document.querySelector('#root')!,{ui:browserUI,settings:defaults(),source:async()=>source,save:async()=>{},notify:()=>{}});
  try {
    await tick();send({type:'ready',pages:8});
    const input=document.querySelector<HTMLInputElement>('[aria-label="Page"]')!;
    input.focus();input.value='3';
    send({type:'viewport',page:1});
    assert.equal(input.value,'3');
    input.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter'}));
    input.blur();
    await panel.render();send({type:'ready',pages:8});
    assert.equal(input.value,'3');
  }finally{panel.dispose();}
});
