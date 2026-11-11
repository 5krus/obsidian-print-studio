import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {browserUI} from './support/ui';

const dom=new JSDOM('<!doctype html><body></body>',{url:'https://vault.invalid/note'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document});
const {snapshotMermaid}=await import('../src/mermaid-snapshot');
const {cleanMarkup}=await import('../src/document');
function render(content:string) {
  const root=document.createElement('div');root.innerHTML=content;document.body.replaceChildren(root);
  for(const svg of root.querySelectorAll('svg'))svg.getBoundingClientRect=()=>({width:200,height:100}) as DOMRect;
  snapshotMermaid(root,browserUI.createElement);return root;
}
function snapshot(root:HTMLElement) {
  const img=root.querySelector('img')!;
  return new dom.window.DOMParser().parseFromString(decodeURIComponent(img.src.split(',')[1]),'image/svg+xml');
}

test('captures SVG paint and HTML labels without enabling active content or external resources',()=>{
  const root=render(`<div class="mermaid"><svg xmlns="http://www.w3.org/2000/svg" aria-label="Planning" onload="attack()">
    <style>.node{fill:red}</style><script>attack()</script>
    <defs><marker id="arrow"><path d="M0 0L10 5L0 10z"/></marker></defs>
    <path id="edge" style="fill:none;stroke:rgb(30,40,50);marker-end:url(https://vault.invalid/note#arrow)"/>
    <path id="external" style="fill:url(https://remote.invalid/image.svg#paint)"/>
    <use href="#edge"/><use href="https://remote.invalid/image.svg#shape"/>
    <image href="https://remote.invalid/image.png"/>
    <foreignObject width="180" height="30"><div xmlns="http://www.w3.org/1999/xhtml"><b onclick="attack()">Updated planning</b><img src="https://remote.invalid/tracker"/><iframe src="https://remote.invalid/"></iframe></div></foreignObject>
    <animate attributeName="href" values="javascript:attack()"/>
  </svg></div>`);
  const img=root.querySelector('img')!;assert.equal(img.alt,'Planning');assert.equal(img.width,200);assert.equal(img.height,100);
  const svg=snapshot(root);assert.equal(svg.querySelector('parsererror')?.textContent,undefined);
  assert.equal(svg.querySelector('foreignObject b')!.textContent,'Updated planning');
  assert.match(svg.querySelector('#edge')!.getAttribute('style')!,/stroke:rgb\(30,\s*40,\s*50\)/);
  assert.match(svg.querySelector('#edge')!.getAttribute('style')!,/marker-end:url\("#arrow"\)/);
  assert.equal(svg.querySelector('use')!.getAttribute('href'),'#edge');
  assert.doesNotMatch(svg.documentElement.outerHTML,/<style|<script|<iframe|<image|<img|<animate|onload|onclick|remote.invalid|javascript:/);
  assert.match(cleanMarkup(root.innerHTML,browserUI.createElement),/data:image\/svg\+xml/);
  // This private sanitizer configuration must not change ordinary SVG cleanup.
  assert.doesNotMatch(cleanMarkup('<svg><foreignObject><div>Unsafe</div></foreignObject><style>body{color:red}</style></svg>',browserUI.createElement),/foreignObject|<style/);
});

test('leaves other SVGs and print-hidden diagrams alone, including embedded-note diagrams',()=>{
  const root=render('<svg id="ordinary"></svg><div class="print-hide"><div class="mermaid"><svg id="hidden"></svg></div></div><div class="markdown-embed"><div class="mermaid"><svg><text>Embedded diagram</text></svg></div></div>');
  assert.ok(root.querySelector('#ordinary'));assert.ok(root.querySelector('#hidden'));assert.equal(root.querySelectorAll('img.ps-mermaid').length,1);
  assert.match(snapshot(root).documentElement.textContent!,/Embedded diagram/);
});
