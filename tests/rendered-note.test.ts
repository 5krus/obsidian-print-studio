import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {serializeRenderedNote} from '../src/rendered-note';
import {embeddedNoteHtml,inlineEmbeddedNote} from './fixtures';

const dom=new JSDOM('<!doctype html><body></body>');
const doc=dom.window.document;
const create=<K extends keyof HTMLElementTagNameMap>(tag:K)=>doc.createElement(tag);
const parse=(html:string)=>{const root=create('div');root.innerHTML=html;return root;};

test('native span embeds retain their title, frontmatter and body scope across HTML parsing',()=>{
  const source=inlineEmbeddedNote(parse(embeddedNoteHtml));
  const original=source.innerHTML;
  // This is the 0.3.7 failure: reparsing moves the title outside the embed.
  assert.equal(parse(original).querySelector('.markdown-embed')?.querySelector('.markdown-embed-title'),null);
  const rendered=parse(serializeRenderedNote(source,create));
  const embed=rendered.querySelector('.markdown-embed')!;
  assert.equal(embed.tagName,'DIV');
  assert.equal(embed.querySelector('.markdown-embed-title')?.textContent,'Generated embed title');
  assert.match(embed.querySelector('.frontmatter')!.textContent!,/generated-tag/);
  assert.equal(embed.querySelector('h2')?.textContent,'Embedded body heading');
  assert.equal(embed.querySelector('.markdown-embed')?.querySelector('p')?.textContent,'Nested body survives');
  assert.equal(rendered.querySelectorAll('p:empty').length,0);
  assert.equal(source.innerHTML,original);
});

test('multiple embeds split inline paragraphs without dropping text, formatting, or image embeds',()=>{
  const root=create('div'),paragraph=create('p');root.append(paragraph);
  paragraph.append('Before ');
  for(const title of ['First','Second']) {
    const span=create('span');span.className='internal-embed markdown-embed';
    const body=create('p');body.textContent=title;span.append(body);paragraph.append(span);
    const emphasis=create('em');emphasis.textContent=` After ${title} `;paragraph.append(emphasis);
  }
  const image=create('span');image.className='internal-embed image-embed';image.append(create('img'));paragraph.append(image);
  const rendered=parse(serializeRenderedNote(root,create));
  assert.equal(rendered.textContent,'Before First After First Second After Second ');
  assert.equal(rendered.querySelectorAll('div.markdown-embed').length,2);
  assert.equal(rendered.querySelectorAll('em').length,2);
  assert.equal(rendered.querySelectorAll('span.image-embed img').length,1);
  assert.equal(rendered.querySelector('p .markdown-embed'),null);
});
