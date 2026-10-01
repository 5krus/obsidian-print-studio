Print Studio 0.4.2 fixes formatting loss in long paragraphs and preserves justified spacing in exported documents.

- **Whole-paragraph formatting:** fonts, colors and highlights now stay intact on every wrapped line, including across page boundaries and when using nested inline spans or Fast Text Color.
- **Justified text:** wrapped lines retain their spacing in PDF and HTML output. Explicit line breaks and the final paragraph line keep natural spacing, and first-line indentation remains limited to the first line.
- **Regression coverage:** browser/PDF checks cover colored and highlighted paragraphs, justification, blank lines, page splits and zoomed exports. Native Linux Obsidian checks cover light/dark appearances, custom CSS, Save PDF and captured Linux Print output.

Update through **Settings → Community plugins → Check for updates**, then reopen Print Studio. Requires desktop Obsidian 1.13.0 or newer; existing presets and custom CSS remain compatible.

[Validation and output checks](https://github.com/5krus/obsidian-print-studio/blob/0.4.2/docs/VALIDATION.md)
