import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,normalizeSettings,normalizePreset,paperSize} from '../src/settings';
import {expandTemplate,prepareMarkdown,stripFrontmatter} from '../src/template';
const context={title:'Proposal <draft>',vault:'Work',date:'13 Sep 2026',metadata:{client:'Acme & Co.',reference:42,confidential:true,nested:{secret:'no'}}};
test('templates expand metadata, branding and real page totals without interpreting markup',()=>{
  assert.equal(expandTemplate('{{company}} / {{title}} / {{page}} of {{pages}} / {{meta:client}}',context,'North',3,12),'North / Proposal <draft> / 3 of 12 / Acme & Co.');
  assert.equal(expandTemplate('{{meta:reference}} {{meta:confidential}} {{meta:nested}} {{meta:missing}} {{unknown}} {{meta:__proto__}}',context,''),'42 true   {{unknown}} ');
});
test('frontmatter is removed only at the start, including CRLF and YAML terminators',()=>{
  assert.equal(stripFrontmatter('---\r\ntitle: Note\r\n---\r\n# Body'),'# Body');
  assert.equal(stripFrontmatter('---\na: 1\n...\nContent'),'Content');
  assert.equal(stripFrontmatter('Introduction\n\n---\n\nSection'),'Introduction\n\n---\n\nSection');
});
test('explicit page breaks preserve fenced examples and ordinary comments',()=>{
  assert.equal(prepareMarkdown('<!-- pagebreak -->\n```html\n<!-- pagebreak -->\n```\n~~~\n<!-- pagebreak -->\n~~~\n<!-- hello -->'),'<div class="ps-page-break"></div>\n```html\n<!-- pagebreak -->\n```\n~~~\n<!-- pagebreak -->\n~~~\n<!-- hello -->');
});
test('settings reject CSS injection, malformed logos and impossible geometry',()=>{
  const p=normalizePreset({marginTop:-50,marginBottom:Infinity,marginSide:100,fontSize:100,color:'red;}body{display:none}',border:'url(evil)',logo:'data:image/svg+xml;base64,PHN2Zz4=',header:{left:'safe'}});
  assert.equal(p.marginTop,22);assert.equal(p.marginBottom,24);assert.equal(p.marginSide,40);assert.equal(p.fontSize,18);assert.equal(p.color,'#354c49');assert.equal(p.border,'solid');assert.equal(p.logo,'');assert.equal(p.header.left,'safe');
});
test('invalid saved data recovers defaults, duplicate identities and active selection',()=>{
  assert.equal(normalizeSettings(null).presets.length,3);assert.equal(normalizeSettings({presets:[]}).activeId,'classic');
  const restored=normalizeSettings({presets:[{id:'a'},{id:'a'}],activeId:'missing'});assert.equal(restored.activeId,'a');assert.equal(new Set(restored.presets.map(p=>p.id)).size,2);
  const a=defaults(),b=defaults();a.presets[0].header.left='Changed';assert.notEqual(a.presets[0].header.left,b.presets[0].header.left);
});
test('paper dimensions correctly follow size and orientation',()=>{
  const p=defaults().presets[0];assert.deepEqual(paperSize(p),[210,297]);assert.deepEqual(paperSize({...p,paper:'Letter',orientation:'landscape'}),[279.4,215.9]);
});
