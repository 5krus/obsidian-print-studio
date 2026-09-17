Print Studio 0.3.7 adds a toggle to hide embedded-note titles and properties when printing.

- Under **Content**, enable **Hide embedded note titles and properties** to remove generated embed titles and frontmatter, including tags.
- Hidden elements are removed before pagination, reclaiming their space in preview, PDF, and HTML output.
- Embedded body content, headings, inline tags, and code examples remain visible, including in nested notes.
- The option saves with presets and supports undo/redo and preset import/export. It is off by default, preserving existing layouts until enabled.

Requires **desktop Obsidian 1.13.0 or newer**. Update through **Settings → Community plugins → Check for updates**.

Validation: lint, 42 unit tests, TypeScript/build, and 21 browser/PDF tests. The metadata filter was also checked against a detached copy of a live native Obsidian embed: generated titles/frontmatter were removed, body content was preserved, and the original DOM was unchanged. The release workflow attests `main.js`, `manifest.json`, and `styles.css`. Physical printing and Windows/macOS print dialogs remain manual checks.
