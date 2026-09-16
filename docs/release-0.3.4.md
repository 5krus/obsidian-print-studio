Print Studio 0.3.4 makes manual page breaks easier to write and less distracting while editing.

- Use `====` on its own line, with blank lines around it, to start a new printed page.
- Page-break markers stay hidden in the note editor until the cursor or selection reaches their line.
- Existing `<!-- pagebreak -->` markers continue to work.
- Markers inside fenced code examples and note properties remain untouched.

Requires **desktop Obsidian 1.13.0 or newer**. Existing presets remain compatible.

Validation: lint, 35 unit tests, TypeScript/build, and 14 browser/PDF tests. The release workflow attests `main.js`, `manifest.json`, and `styles.css`. Native Obsidian visual checks and physical printing remain manual checks.
