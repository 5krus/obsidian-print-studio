Print Studio turns Markdown notes into branded, paginated documents with reusable layouts, logos, headers, footers, and page borders.

Version 0.3.0 makes designing longer documents easier:

- Keep your current page and zoom when changing layouts or refreshing the note.
- Reuse rendered Markdown and embedded attachments during layout edits; **Refresh note** picks up note and attachment changes.
- Jump from layout warnings to clipped headers/footers and overflowing or split table rows, with advice on correcting them.
- Undo and redo up to 20 preset changes, including imports, duplication, and removal.
- Use a larger first-page letterhead with separate header text, margins, and logo sizing, plus an option to show the logo only on page 1.
- Insert built-in placeholders and available note properties at the cursor in any header/footer field.

Existing presets and version 1 preset backups remain compatible. First-page overrides are off by default.

Requires **desktop Obsidian 1.13.0 or newer**. Print Studio is free, MIT-licensed, and requires no account, API key, or paid service.

For manual installation, extract `print-studio-0.3.0.zip` into `<vault>/.obsidian/plugins/`, then enable **Print Studio** in Community plugins. When updating, replace the plugin files and keep your existing `data.json`.

Choose **Print / Save PDF** for the system print dialog or **Export HTML** for a self-contained document. Use the matching paper size, 100% scale, no added margins or browser headers/footers, and background graphics enabled.

Automated validation covers 27 unit tests and 13 browser tests, including eight PDF cases across A4/Letter, portrait/landscape, and regular/first-page letterheads. Native Obsidian 1.13.7 on Linux was validated for 0.2.0; a native smoke test of 0.3.0, physical printing, and Windows/macOS print dialogs remain manual checks. See `docs/VALIDATION.md` for scope and limitations.

This release prepares Print Studio for community-directory submission. It will appear in Obsidian's installer only after directory review and publication.
