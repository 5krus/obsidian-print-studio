export const tocCss=`.toc-line {
  display: flex;
  align-items: baseline;
  gap: 0.5em;
}

.toc-line::after {
  content: "";
  flex: 1;
  order: 1;
  border-bottom: 1px dotted currentColor;
}

.toc-line > :last-child {
  order: 2;
  white-space: nowrap;
}`;

export const tocHtml=Array.from({length:72},(_,index)=>{
  const tag=index%2?'p':'div';
  const title=`TOC-${String(index).padStart(2,'0')} ${index%9===0?'A longer section title that wraps onto several lines while keeping its page number readable. '.repeat(2):'Section title'}`;
  return `<${tag} class="toc-line"><span>${title}</span><span>${index+3}</span></${tag}>`;
}).join('');
