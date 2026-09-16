import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState, EditorSelection} from '@codemirror/state';
import {pageBreakEditor} from '../src/page-break-editor';
import {pageBreakLines, printMarkerLines, prepareMarkdown} from '../src/template';

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


test('bottom markers share code and frontmatter protection and editor visibility',()=>{
  assert.equal(prepareMarkdown('&&&&\n# Cover\n====\nBody'),'\n<div class="ps-bottom-marker"></div>\n\n# Cover\n\n<div class="ps-page-break"></div>\n\nBody');
  assert.deepEqual(printMarkerLines('---\nvalue: |\n  &&&&\n---\n&&&&\n```\n&&&&\n```\n~~~\n&&&&\n~~~\n    &&&&\ntext &&&&\n&&&&&\n===='),[{line:5,kind:'bottom'},{line:15,kind:'break'}]);
  let state=EditorState.create({doc:'Before\n&&&&\nAfter',extensions:[pageBreakEditor]});
  assert.equal(state.field(pageBreakEditor).size,1);
  state=state.update({selection:{anchor:9}}).state;
  assert.equal(state.field(pageBreakEditor).size,0);
  state=state.update({selection:{anchor:0}}).state;
  assert.equal(state.field(pageBreakEditor).size,1);
});
