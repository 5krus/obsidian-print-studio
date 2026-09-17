export const TEST_IMAGE='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAABQCAIAAADnUzvSAAABxUlEQVR4nO3TwQmAQBAEwU3KIATzf/kTjMMwjj4LJoEa6LnfZ8mO61wyXt6dvPM3MC/vTl4B8/KGvQLm5Q17BczLG/YKmJc37BUwL2/YK2Be3rBXwLy8Ya+AeXnDXgHz8oa9AublDXsFzMsb9gqYlzfsFTAvb9grYF7esFfAvLxhr4B5ecNeAfPyhr0C5uUNewXMyxv2CpiXN+wVMC9v2CtgXt6wV8C8vGGvgHl5w14B8/KGvQLm5Q17BczLG/YKmJc37BUwL2/YK2Be3rBXwLy8Ya+AeXnDXgHz8oa9AublDXsFzMsb9gqYlzfsFTAvb9grYF7esHcczcvb9QqYlzfsFTAvb9grYF7esFfAvLxhr4B5ecNeAfPyhr0C5uUNewXMyxv2CpiXN+wVMC9v2CtgXt6wV8C8vGGvgHl5w14B8/KGvQLm5Q17BczLG/YKmJc37BUwL2/YK2Be3rBXwLy8Ya+AeXnDXgHz8oa9AublDXsFzMsb9gqYlzfsFTAvb9grYF7esFfAvLxhr4B5ecNeAfPyhr0C5uUNewXMyxv2CpiXN+wVMC9v2CtgXt6wV8C8vGGvgHl5w14B8/KGvQLm5Q17P+g3uAaAzZngAAAAAElFTkSuQmCC';
export function validationMarkdown(logo:string):string {
return `---
title: Print validation
---
# Print validation
**Introduction** with *emphasis*, [a link](https://obsidian.md), and Unicode: café, £25, —.

- [x] Completed checklist item
- [ ] Pending checklist item
- A normal list item

> A blockquote should remain readable.

![Embedded test image](${logo})

\`\`\`ts
const answer = 42;
console.log(answer);
\`\`\`

## Table across pages
| Reference | Description | Amount |
| --- | --- | --- |
${Array.from({length:65},(_,i)=>`| ROW-${String(i+1).padStart(3,'0')} | A table entry that must not disappear between pages. | £${i+1} |`).join('\n')}

====

# MANUAL-BREAK-START
This section must begin on a separate physical page.

${Array.from({length:12},(_,i)=>`## Section ${i+1}\n\nPARAGRAPH-${String(i+1).padStart(3,'0')}. A longer paragraph tests normal content flow, wrapping, and page boundaries. ${'Every sentence should survive printing without a missing or duplicated line. '.repeat(4)}\n`).join('\n')}

END-OF-DOCUMENT
`;
}
// Mirrors Obsidian's note-embed wrappers, including a preview root that itself
// has mod-frontmatter. Removing that wrapper would lose the embedded body.
export const embeddedNoteHtml = `<h1>Main document heading</h1>
<p>Main body <a class="tag" href="#main-tag">#main-tag</a></p>
<div class="internal-embed markdown-embed inline-embed is-loaded">
  <div class="embed-title markdown-embed-title">Generated embed title</div>
  <a class="markdown-embed-link" href="note.md">Open embedded note</a>
  <div class="markdown-embed-content">
    <div class="markdown-preview-view markdown-rendered mod-frontmatter mod-ui">
      <div class="mod-header mod-ui"><div class="inline-title">Generated inline title</div><div class="metadata-container">Properties panel</div></div>
      <pre class="frontmatter language-yaml">title: Generated YAML title\ntags: [generated-tag]</pre>
      <h2>Embedded body heading</h2><p>Embedded body <a class="tag" href="#body-tag">#body-tag</a></p>
      <pre><code>title: Keep this code example\ntags: [code-tag]</code></pre>
      <div class="internal-embed markdown-embed"><div class="markdown-embed-title">Nested generated title</div><div class="frontmatter-container">nested-generated-tag</div><p>Nested body survives</p></div>
    </div>
  </div>
</div>
<div class="internal-embed media-embed image-embed"><span class="inline-title">Image caption survives</span></div>
<p>End of main document</p>`;
