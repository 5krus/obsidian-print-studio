export const formattingCss=`
.formatting-test.markdown-preview-view { color:rgb(230,230,230); background-color:rgb(30,30,30); font:16px/1.6 Georgia,serif; --study-color:rgb(170,35,50); }
.formatting-test strong { color:var(--study-color); font-weight:800; }
.formatting-test em { color:rgb(35,85,185); font-style:italic; }
.formatting-test .fast-text-color-study { color:rgb(0,130,75); font-weight:700; font-size:1.5em; text-decoration:underline; }
.formatting-test mark { color:rgb(35,35,35); background-color:rgb(255,225,40); }
.formatting-test h1 { font-size:2em; }
.formatting-test p { margin:0 0 1em; }
.formatting-test .markdown-embed-content { color:rgb(100,30,180); font-size:18px; font-family:serif; }
`;
export const formattingHtml=`<h1>FORMATTING-CHECK</h1>
<p>PLAIN-CHECK <strong>BOLD-CHECK</strong> <em>ITALIC-CHECK</em></p>
<p><span class="fast-text-color-study">PLUGIN-CHECK</span> <mark>HIGHLIGHT-CHECK</mark></p>
<p><span style="color:rgb(120,40,160);font-size:24px;background-color:rgb(235,220,255)">INLINE-CHECK</span></p>
<div class="internal-embed markdown-embed"><div class="markdown-embed-content"><div class="markdown-preview-view"><p>EMBED-STYLED-CHECK</p></div></div></div>
<ul><li class="task-list-item"><span class="ps-check">☑︎</span>CHECKED-STYLE</li></ul>
${Array.from({length:32},(_,i)=>`<p>STYLE-ROW-${String(i).padStart(2,'0')} A paragraph with <strong>bold text</strong>, <em>italic text</em>, and <mark>highlighting</mark>. ${'Every styled word must survive wrapping and page boundaries. '.repeat(4)}</p>`).join('\n')}
<div class="ps-page-break"></div><p>FORMATTING-END</p>`;
