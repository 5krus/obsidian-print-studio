import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState, EditorSelection} from '@codemirror/state';
import {pageBreakEditor} from '../src/page-break-editor';
import {pageBreakLines, prepareMarkdown} from '../src/template';

test('short markers produce isolated print breaks without consuming adjacent text',()=>{
  assert.equal(prepareMarkdown('Before\n====\nAfter'),'Before\n\n<div class="ps-page-break"></div>\n\nAfter');
  assert.deepEqual(pageBreakLines('---\nvalue: |\n  ====\n---\n====\n```\n====\n```\n~~~\n====\n~~~\n    ====\ntext ====\n=====\n<!-- pagebreak -->'),[5,15]);
});

test('markers hide and reveal with cursor, selections, edits and multiple cursors',()=>{
  let state=EditorState.create({doc:'Before\n====\nAfter\n<!-- pagebreak -->',extensions:[pageBreakEditor],selection:{anchor:0}});
  const hidden=()=>state.field(pageBreakEditor).size;
  assert.equal(hidden(),2);
  state=state.update({selection:{anchor:8}}).state;
  assert.equal(hidden(),1);
  state=state.update({selection:{anchor:7,head:state.doc.length}}).state;
  assert.equal(hidden(),0);
  state=state.update({selection:{anchor:0}}).state;
  assert.equal(hidden(),2);
  state=state.update({changes:{from:7,to:11,insert:'ordinary'}}).state;
  assert.equal(hidden(),1);
  state=EditorState.create({doc:'====\ntext\n====',extensions:[pageBreakEditor,EditorState.allowMultipleSelections.of(true)],selection:EditorSelection.create([EditorSelection.cursor(0),EditorSelection.cursor(10)])});
  assert.equal(hidden(),0);
});
