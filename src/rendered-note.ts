import type {ElementFactory} from './ui';

/** Preserve block note embeds when Obsidian's live DOM is serialized as HTML. */
export function serializeRenderedNote(source:HTMLElement, createElement:ElementFactory):string {
  const root=source.cloneNode(true) as HTMLElement;
  // Obsidian can render div/pre/p children inside a span inside a paragraph.
  // An HTML parser moves those children outside the span, losing embed scope.
  for(const embed of root.querySelectorAll('span.markdown-embed')) {
    const block=createElement('div');
    for(const attribute of embed.attributes)block.setAttribute(attribute.name,attribute.value);
    block.append(...embed.childNodes);embed.replaceWith(block);
  }
  // Block embeds also need to sit outside paragraphs. Split surrounding inline
  // content into valid paragraphs, omitting empty ones so no blank space remains.
  let embed:Element|null;
  while((embed=root.querySelector('p .markdown-embed'))) {
    const paragraph=embed.closest('p')!;
    const before=paragraph.cloneNode(false) as HTMLElement;
    const after=paragraph.cloneNode(false) as HTMLElement;
    const range=root.ownerDocument.createRange();
    range.selectNodeContents(paragraph);range.setEndBefore(embed);before.append(range.cloneContents());
    range.selectNodeContents(paragraph);range.setStartAfter(embed);after.append(range.cloneContents());
    const hasContent=(part:HTMLElement)=>Boolean(part.textContent?.trim() || part.childElementCount);
    paragraph.replaceWith(...(hasContent(before)?[before]:[]),embed,...(hasContent(after)?[after]:[]));
  }
  return root.innerHTML;
}
