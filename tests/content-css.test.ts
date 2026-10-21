import test from 'node:test';
import assert from 'node:assert/strict';
import {compileContentCss} from '../src/content-css';
import {tocCss} from './toc-fixture';

test('custom CSS scopes selector lists and normalizes priority while preserving supported values',()=>{
  const css=compileContentCss('strong, em { color: rgb(12, 34, 56) !important; font-size: 1.2em; } .ps-content { line-height: 1.6; }');
  assert.match(css,/\.ps-content:is\(strong\),\.ps-content :is\(strong\),\.ps-content:is\(em\),\.ps-content :is\(em\)/);
  assert.match(css,/color:rgb\(12,34,56\)/);assert.doesNotMatch(css,/!important/);
  assert.match(css,/\.ps-content:is\(\.ps-content\)/);
});

test('TOC flex and empty leaders compile with pseudo-elements outside the scoping function',()=>{
  const css=compileContentCss(tocCss);
  assert.match(css,/\.ps-content:is\(\.toc-line\)::after,\.ps-content :is\(\.toc-line\)::after/);
  assert.match(css,/content:"";flex:1;order:1;border-bottom:1px dotted currentColor/);
  assert.match(css,/\.ps-content :is\(\.toc-line>:last-child\)\{order:2;white-space:nowrap\}/);
  assert.equal(compileContentCss('::before, .a:after {content:""}'),'.ps-content:is(*)::before,.ps-content :is(*)::before,.ps-content:is(.a):after,.ps-content :is(.a):after{content:""}');
  for(const css of ['p::marker{color:red}','p::after:hover{color:red}','p::before span{color:red}','p::after::before{content:""}','p::after{content:attr(title)}','p::after{content:counter(page)}','p::after{content:url(https://example.com)}','p{display:grid}','p{display:contents}'])assert.throws(()=>compileContentCss(css),css);
});

test('custom CSS rejects resource loads, page/layout control and malformed rules without partial output',()=>{
  for(const css of ['@import "https://example.com/a.css";','@page {size:A3}','@media print {p{color:red}}','p{position:fixed}','p{display:none}','p{background:url(https://example.com)}','p{color:var(--remote)}','p{--x:red}','p::before{content:"extra"}','p{color:red; broken ???}', 'p{color:expression(alert(1))}','p{color:u\\72l(https://example.com)}'])assert.throws(()=>compileContentCss(css),css);
  assert.throws(()=>compileContentCss(' '.repeat(50_000)+'p{}'),/50,000/);
  assert.equal(compileContentCss('/* comment */'),'');
});
