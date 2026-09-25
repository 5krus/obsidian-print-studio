import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {browserUI} from './support/ui';
import {defaults} from '../src/settings';
import {embeddedNoteHtml} from './fixtures';
const dom=new JSDOM('<!doctype html><body></body>');
Object.assign(globalThis,{window:dom.window,document:dom.window.document,FRAME_RUNTIME:'/* bundled runtime */'});
const documentModule=await import('../src/document');
const {pageCss}=documentModule;
const cleanMarkup=(html: string)=>documentModule.cleanMarkup(html, browserUI.createElement);
const frameDocument=(job: Parameters<typeof documentModule.frameDocument>[0], token: string)=>documentModule.frameDocument(job, token, browserUI.createElement);
test('print HTML preserves rich content while removing scripts and active embeds',()=>{
  const html=cleanMarkup('<h1>Title</h1><table><tr><td>A</td></tr></table><blockquote>Quote</blockquote><script>alert(1)</script><img src="https://example.com/pixel" onerror="alert(1)" alt="Chart"><iframe src="https://example.com"></iframe><a href="javascript:alert(1)">Bad link</a><p style="position:fixed">Text</p>');
  assert.match(html,/<table>/);assert.match(html,/<blockquote>/);assert.match(html,/\[Image: Chart\]/);assert.doesNotMatch(html,/<script|<iframe|onerror|javascript:|style=|https:\/\/example.com/);
});
test('self-contained images survive and unsupported URI schemes do not',()=>{
  assert.match(cleanMarkup('<img src="data:image/png;base64,aGVsbG8=" alt="Logo">'),/data:image\/png/);
  assert.doesNotMatch(cleanMarkup('<a href="obsidian://open?file=secret">Note</a>'),/obsidian:/);
});
test('page styling keeps printable borders and bands within physical page margins',()=>{
  const p=defaults().presets[0];const css=pageCss(p);assert.match(css,/size:210mm 297mm/);assert.match(css,/margin:30mm 22mm 24mm/);assert.match(css,/border:0.6mm solid #354c49/);assert.match(css,/\.ps-page-header/);assert.match(css,/\.ps-page-footer/);
});
test('frame payload cannot close its script element and preview is network isolated',()=>{
  const html=frameDocument({html:'<h1>Hello</h1>',preset:defaults().presets[0],context:{title:'</script><script>attack()</script>',vault:'Work',date:'Today',metadata:{evil:'</script>'}}},'token');
  assert.match(html,/connect-src 'none'/);assert.match(html,/\\u003c\/script>/);assert.doesNotMatch(html,/<script>attack/);assert.equal((html.match(/<script>/g)??[]).length,2);
});

test('code block controls and their icons are removed without losing code or checklist state',()=>{
  const html=cleanMarkup('<pre><code>const answer = 42;</code><button class="copy-code-button"><svg><path d="M0 0h2"/></svg>Copy</button></pre><ul><li><input type="checkbox" checked>Done</li><li><input type="checkbox">Pending</li></ul>');
  assert.match(html,/const answer = 42;/);
  assert.doesNotMatch(html,/<button|<svg|Copy|<input/);
  assert.match(html,/☑/);assert.match(html,/☐/);
  assert.equal((html.match(/task-list-item/g)??[]).length,2);
});

test('embedded note metadata is optional without stripping body headings, tags, code or media captions',()=>{
  const original=cleanMarkup(embeddedNoteHtml);
  assert.match(original,/Generated embed title/);assert.match(original,/generated-tag/);
  const cleaned=documentModule.cleanMarkup(embeddedNoteHtml,browserUI.createElement,true);
  assert.doesNotMatch(cleaned,/Generated|generated-tag|Nested generated title|nested-generated-tag|Open embedded note|Properties panel/);
  for(const text of ['Main document heading','#main-tag','Embedded body heading','#body-tag','Keep this code example','code-tag','Nested body survives','Image caption survives','End of main document'])assert.ok(cleaned.includes(text),text);
  assert.doesNotMatch(cleaned,/markdown-preview-view|markdown-embed-content/);
  const outside='<div class="inline-title">Outside title</div><pre class="frontmatter">Outside properties</pre>';
  assert.equal(documentModule.cleanMarkup(outside,browserUI.createElement,true),outside);
});

test('native preview wrappers are unwrapped after metadata filtering without losing nested content',()=>{
  for(const hide of [false,true]) {
    const root=document.createElement('div');
    root.innerHTML=documentModule.cleanMarkup(embeddedNoteHtml,browserUI.createElement,hide);
    assert.equal(root.querySelectorAll('.markdown-embed-content,.markdown-preview-view').length,0);
    assert.equal(root.querySelectorAll('.markdown-embed').length,2);
    assert.equal(root.querySelector('.markdown-embed > h2')?.textContent,'Embedded body heading');
    assert.equal(root.querySelector('.markdown-embed .markdown-embed p')?.textContent,'Nested body survives');
    assert.equal(root.querySelectorAll('.markdown-embed-title').length,hide?0:2);
  }
  const outside='<div class="markdown-preview-view"><p>Outside embed</p></div>';
  assert.equal(cleanMarkup(outside),outside);
});

test('the preset removes embedded metadata from the frame payload before pagination',()=>{
  const preset=defaults().presets[0];preset.hideEmbeddedNoteMetadata=true;
  const html=frameDocument({html:embeddedNoteHtml,preset,context:{title:'Main title',vault:'Work',date:'Today',metadata:{}}},'token');
  const job=JSON.parse(html.match(/window.PRINT_STUDIO_JOB=(.*?);<\/script>/)![1]);
  assert.equal(job.preset.hideEmbeddedNoteMetadata,true);
  assert.doesNotMatch(job.html,/Generated embed title|generated-tag/);
  assert.match(job.html,/Embedded body heading/);
});
