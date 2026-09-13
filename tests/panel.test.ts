import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {defaults,type Settings} from '../src/settings';
const dom=new JSDOM('<!doctype html><body><div id="root"></div></body>',{url:'http://localhost',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,FRAME_RUNTIME:'/* runtime stub */'});
const {StudioPanel}=await import('../src/panel');
const source={html:'<h1>Note</h1>',context:{title:'Note',vault:'Work',date:'Today',metadata:{}},warnings:[]};
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
test('preview readiness is scoped to the current frame job; edits cannot print stale pages',async()=>{
  let saved:Settings|undefined;const messages:string[]=[];
  const panel=new StudioPanel(document.querySelector('#root')!,{settings:defaults(),source:async()=>source,save:async value=>{saved=value;},notify:value=>messages.push(value)});
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
  }finally{panel.dispose();assert.equal(document.querySelector('iframe'),null);dom.window.close();}
});
