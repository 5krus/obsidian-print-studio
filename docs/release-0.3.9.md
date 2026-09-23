Print Studio 0.3.9 fixes saved PDFs using US Letter dimensions when A4 is selected.

- **Save PDF** now saves directly with the preview’s selected A4 or Letter paper size and portrait or landscape orientation. Printer defaults and preview zoom no longer affect PDF dimensions.
- **Print** opens the system print dialog with the selected paper size and orientation, 100% scale, no added margins, and background graphics.
- Keep existing presets and the self-contained HTML export.

Requires **desktop Obsidian 1.13.0 or newer**. Update through **Settings → Community plugins → Check for updates**.

Validation: lint, 46 unit tests, TypeScript/build, and all 21 browser/PDF tests passed. Eight additional native Obsidian PDF checks on Linux verified every page’s dimensions and page counts across both paper sizes, orientations, and letterhead layouts. Physical printing and Windows/macOS dialogs remain unverified; check printer settings if you change printers.
