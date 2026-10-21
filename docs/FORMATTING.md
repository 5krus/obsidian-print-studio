# Keep your note’s colours and highlights

[← Print Studio](../README.md) · [Layout and printing guide](GUIDE.md)

Open **Content → Note appearance** and choose how your note should look on paper.

![The Content section with Preserve text formatting selected, alongside the formatted print preview.](images/formatting.png)

| Appearance | What it keeps |
| --- | --- |
| **Studio styles** | Print Studio’s preset-driven look. This is the default. |
| **Preserve text formatting** | Supported colours, highlights, relative text sizes, bold, italics and other text accents, on white paper. |
| **Reading appearance (experimental)** | The text styling plus the note’s base font, foreground and background. Print Studio still controls the page layout. |

Supported styling can come from CSS snippets, inline formatting and plugins such as Fast Text Color. Note `cssclasses` and per-note Fast Text Color themes are supported.

### The same note, two appearances

**Studio styles**

![A note in Studio styles, with dark text and the preset’s heading colour.](images/appearance-studio.png)

**Preserve text formatting**

![The same note with red bold text, blue italics and a soft yellow highlight preserved from its CSS snippet.](images/appearance-text.png)

Appearance choices save with the preset. **Font size** and **Line spacing** scale the captured typography. After changing a theme or snippet, click **Refresh note**.

## Add a little print-specific CSS

Open **Custom CSS**, enter rules in **Print CSS**, and turn on **Enable custom CSS**. For example:

```css
strong { color: #b42318; }
em { color: #175cd3; }
mark { background-color: #fef08a; color: #262727; }
```

These rules apply after the selected appearance and save with the preset. Your source note is unchanged. Turn the switch off to stop applying the rules without deleting them.

CSS affects the note body, including its headings; it does not change page headers, footers or the Print Studio interface. Use `.ps-content` to target the whole note body:

```css
.ps-content { font-family: Georgia, serif; }
p { margin-bottom: 1em; }
```

Text, spacing, borders, white-space and flex layouts are supported. Supported `display` values are `block`, `inline`, `inline-block`, `flex` and `inline-flex`. Use literal colours and installed fonts. Page rules, `@media`, `@import`, CSS variables, resource URLs and positioning are unsupported. `!important` is ignored; selector specificity and rule order decide which styles win.

Empty `::before` and `::after` decorations are supported with `content: ""`; generated text, counters and other pseudo-elements are unsupported. For a table of contents, this CSS works both as an Obsidian snippet and in **Print CSS**:

```css
.toc-line {
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
}
```

Use two spans per row, for example `<div class="toc-line"><span>Introduction</span><span>3</span></div>`. Page numbers are entered manually. Enable this CSS in the print preset as well as the Obsidian snippet: the appearance modes capture text styles, not flex layouts or pseudo-elements.

If a rule is unsupported, an inline message explains the problem. Correct it, disable custom CSS or use **Undo change** to resume exporting.

## What to check in the preview

- **Contrast:** pale colours may be hard to read on white paper. Dark backgrounds retain your chosen text colours too.
- **Fonts:** fonts available only through a theme’s web stylesheet are not embedded; use an installed font for consistent results.
- **Layout:** reading appearance preserves supported text styling, not every theme layout or interactive plugin widget.

Snippets that use CSS variables can still work through **Preserve text formatting**, because Print Studio captures their resolved values. Snippets that depend on a particular workspace layout may differ. Use **Refresh note** if a plugin’s styling has not appeared yet.
