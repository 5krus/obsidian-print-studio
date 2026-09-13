# Print Studio 0.2.0 validation

Validation performed on 13 September 2026.

## Automated checks

- Obsidian’s recommended ESLint rules: no errors or warnings.
- Unit tests: templates, settings recovery, duplicate IDs, sanitization, checklist states, removal of code-block controls, stale preview protection, theme synchronization, safe frame messages, preset import/export, format/size limits, and atomic imports.
- Browser/PDF suite: A4 portrait, A4 landscape, Letter portrait, Letter landscape, preset/navigation/theme interactions, and pagination with animation frames suspended.
- Each PDF fixture includes 65 uniquely identified table rows, 12 uniquely identified paragraphs, an image, repeated logos, code, a blockquote, Unicode text, checklists, and a manual page break.
- Checks compare preview and PDF page counts and paper dimensions; require all content markers exactly once; verify every page’s header/footer and page number; and ensure exported HTML has no scripts and no preview zoom.
- Runtime dependency audit: no reported vulnerabilities at validation time.

Run `npm run check` and `npm run test:browser`. The latter requires Chromium and Poppler. Generated PDFs are kept in `test-results/` and are not committed.

## Native Obsidian

Tested on Obsidian **1.13.7**, Linux, using its documented CLI:

- Reloaded the plugin and rendered a dedicated validation note with Obsidian’s Markdown renderer.
- Confirmed native buttons, dropdowns, toggles, page navigation, and preview readiness.
- Exported the actual native-rendered document and verified its seven-page PDF, all 65 rows, all 12 paragraphs, images, and every header/footer.
- Captured the release screenshot from the live plugin modal, using synthetic test content and presets. Light/dark theme synchronization is also covered by the browser suite.
- Confirmed no Obsidian runtime errors and preserved the original preset data.

The minimum supported version is 1.13.0, based on the native APIs used and checked by Obsidian’s API compatibility lint rule. Versions 1.13.0–1.13.6 have not been tested individually.

## Manual checks remaining

There is no configured printer on this machine, so no physical print job was submitted. Before a public launch:

- Print the validation note on A4 and Letter paper where available.
- Select the same paper size and orientation, 100% scale, no added margins or browser headers/footers, and background graphics enabled.
- Check borders, logos, first/last lines on each page, and page totals on paper.
- Exercise the system print dialog on Windows and macOS before claiming those environments as tested.

Long unbreakable rows and complex plugin-rendered content remain subject to the rendering limitations in the README.
