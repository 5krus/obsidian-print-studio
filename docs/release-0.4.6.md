# Print Studio 0.4.6 — dotted contents lines and flex layouts

Custom CSS can now render table-of-contents rows with dotted leaders and right-aligned page numbers. The same CSS can be used in an Obsidian snippet and the print preset.

- Adds flex layout properties, white-space control, and empty `::before` / `::after` decorations to Custom CSS.
- Keeps flex rows intact during export, including wrapped titles, so page numbers and dotted leaders retain their alignment.
- Preserves existing presets, text formatting, page furniture, and export behavior. CSS still applies only to the note body; resource URLs, positioning, generated text, and page rules remain unsupported.
- Adds multi-page preview, HTML, and PDF regression coverage across all three note appearance modes.

See the [formatting guide](https://github.com/5krus/obsidian-print-studio/blob/main/docs/FORMATTING.md) for the CSS and matching HTML. Enable the CSS in **Print Studio → Custom CSS** as well as your Obsidian snippet. Page numbers are entered manually.

Update through **Settings → Community plugins → Check for updates**, then restart Obsidian and reopen Print Studio. Requires Obsidian 1.13.0 or newer; existing presets and logos are preserved.
