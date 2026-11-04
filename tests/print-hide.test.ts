import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {preparePrintRoot} from '../src/print-structure';
import {DEFAULT_PRESET} from '../src/settings';

const doc=new JSDOM('<!doctype html><body></body>').window.document;
const create=((tag:string,cls?:string)=>{const el=doc.createElement(tag);if(cls)el.className=cls;return el;}) as Parameters<typeof preparePrintRoot>[3];

test('elements with the print-hide class are left out of the printed note',()=>{
  const root=doc.createElement('div');
  root.innerHTML='<h1>Recipe</h1><p>Keep <span class="print-hide">internal note</span>this.</p><div class="print-hide"><h2>Behind the Bench</h2><p>Private</p></div><p>Footer</p>';
  preparePrintRoot(root,DEFAULT_PRESET,[],create);
  assert.equal(root.querySelectorAll('.print-hide').length,0);
  assert.doesNotMatch(root.textContent!,/internal note|Behind the Bench|Private/);
  assert.match(root.textContent!,/Recipe.*Keep this\..*Footer/s);
});
