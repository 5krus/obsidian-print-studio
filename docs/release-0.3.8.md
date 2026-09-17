Print Studio 0.3.8 fixes embedded-note rendering so the option to hide embedded-note titles and properties works with native Obsidian embeds.

- Preserve embedded-note titles, properties, and body content together when converting Obsidian’s rendered notes to printable HTML.
- Keep surrounding text, formatting, nested embeds, and image embeds intact.
- Avoid empty paragraphs introduced by embedded notes.

Requires **desktop Obsidian 1.13.0 or newer**. Update through **Settings → Community plugins → Check for updates**.

Validation: lint, unit tests, TypeScript/build, and all 21 browser/PDF tests passed, including the native span-embed regression fixture.
