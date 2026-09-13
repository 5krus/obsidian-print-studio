import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {browserUI} from '../demo/ui';
import {defaults,type Settings} from '../src/settings';
const dom=new JSDOM('<!doctype html><body><div id="root"></div></body>',{url:'http://localhost',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,HTMLInputElement:dom.window.HTMLInputElement,document:dom.window.document,FRAME_RUNTIME:'/* runtime stub */'});
const {StudioPanel}=await import('../src/panel');
const source={html:'<h1>Note</h1>',context:{title:'Note',vault:'Work',date:'Today',metadata:{}},warnings:[]};
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
after(()=>dom.window.close());
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
