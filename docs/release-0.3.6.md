Print Studio 0.3.6 adds independent uppercase options for header and footer fields.

- Enable **Uppercase left**, **Uppercase center**, or **Uppercase right** below a header or footer field to print its contents in capitals.
- Uppercase applies after placeholders resolve, so titles, dates, company names, and note properties are capitalized too: `Example` becomes `EXAMPLE`.
- The separate first-page header has its own uppercase switches.
- Your note and template text retain their original casing. Uppercase appears consistently in the preview, exported HTML, and PDF output.
- Choices save with presets, survive import/export, and support undo/redo. Existing presets keep their original casing until you enable an uppercase switch.

Requires **desktop Obsidian 1.13.0 or newer**. Update through **Settings → Community plugins → Check for updates**.

Validation: lint, 39 unit tests, TypeScript/build, and 20 browser/PDF tests, including uppercase placeholders, independent field settings, preset compatibility, and unchanged document text. The release workflow attests `main.js`, `manifest.json`, and `styles.css`. Physical printing and Windows/macOS print dialogs remain manual checks.
