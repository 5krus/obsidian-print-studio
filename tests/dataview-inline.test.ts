import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {settleDataviewInline} from '../src/dataview-inline';

const dom=new JSDOM('<!doctype html><body></body>');
Object.assign(globalThis,{window:dom.window});
const doc=dom.window.document;
const create=((tag:string,cls?:string)=>{const el=doc.createElement(tag);if(cls)el.className=cls;return el;}) as Parameters<typeof settleDataviewInline>[3];
const parse=(html:string)=>{const root=doc.createElement('div');root.innerHTML=html;doc.body.append(root);return root;};
const frontmatter={name:'Sample Salve',version:2,meta:{shelf_life:'6 months'},tags:['a','b']};

test('waits for Dataview to replace inline queries before continuing',async()=>{
  const root=parse('<h1><code>=this.name</code></h1>');
  setTimeout(()=>root.querySelector('code')!.replaceWith('Rendered by Dataview'),120);
  await settleDataviewInline(root,{settings:{}},frontmatter,create);
  assert.equal(root.textContent,'Rendered by Dataview');
});

test('fills plain this.field lookups from frontmatter when Dataview has not rendered them',async()=>{
  const root=parse('<p><code>=this.name</code> v<code>=this.version</code> · <code>=this.meta.shelf_life</code> · <code>=this.tags</code></p>');
  await settleDataviewInline(root,{settings:{}},frontmatter,create,100);
  assert.equal(root.textContent,'Sample Salve v2 · 6 months · a, b');
});

test('leaves code blocks, unknown fields and complex expressions untouched',async()=>{
  const root=parse('<pre><code>=this.name</code></pre><p><code>=this.missing</code><code>=this.version + 1</code></p>');
  await settleDataviewInline(root,undefined,frontmatter,create);
  assert.equal(root.querySelectorAll('code').length,3);
});

test('respects a custom inline query prefix',async()=>{
  const root=parse('<p><code>dv: this.name</code> <code>=this.name</code></p>');
  await settleDataviewInline(root,{settings:{inlineQueryPrefix:'dv:'}},frontmatter,create,100);
  assert.equal(root.textContent,'Sample Salve =this.name');
});
