# Print Studio validation

## 0.3.9 paper size and direct PDF saving

- Replaced iframe `window.print()` with separate **Save PDF** and **Print** actions. The desktop adapter receives a frozen, script-free copy of the paginated preview and its selected preset.
- PDF generation explicitly selects paper size, orientation, CSS page size, scale 1, background graphics, no browser headers/footers, and zero additional margins. Physical printing passes the equivalent settings to Electron with `silent: false`.
- Lint, 46 unit tests, TypeScript/build, and all 21 browser/PDF tests pass. Output regressions cover unsolicited, duplicate and stale frame messages, busy buttons, failure recovery, save cancellation, print cancellation, and hidden-window cleanup.
- The browser matrix now exercises the actual Save PDF and Print message paths at 150% preview zoom, verifies every PDF page’s dimensions, and compares all extracted text with the HTML export.
- Native verification on Linux, Obsidian 1.13.7 / Electron 43.3.0, runs the production desktop PDF adapter against all eight A4/Letter × portrait/landscape × normal/first-page-letterhead snapshots. All page dimensions and counts match, and all 65 table rows, 12 paragraphs, and end marker survive. Only the filename dialog is substituted with a test output path; BrowserWindow and printToPDF are real.
- Reproduce with `npm run test:browser` followed by `node scripts/validate-native.mjs` while Obsidian is running with its CLI enabled. Generated PDFs stay in `test-results/`.
- No physical print job was submitted. Printer-driver overrides and Windows/macOS dialogs remain unverified.

## 0.3.7 embedded-note metadata

- Lint, 42 unit tests, TypeScript/build, and 21 browser/PDF tests cover the release.
- A new browser test verifies that hiding generated embed titles and frontmatter reclaims vertical space, preserves body headings/inline tags/code and nested embeds, saves the option, supports undo/redo, and carries through to exported HTML and PDF.
- Unit checks cover scoped removal, preservation of note-body wrappers that carry Obsidian's `mod-frontmatter` class, unchanged media captions, frame payloads, and compatibility with older preset backups.
- The filter was checked inside native Obsidian on a detached copy of a live embedded note. Three generated title/frontmatter elements were removed; body content and the live original DOM were unchanged.
- The initial local browser run had two timeouts during preview/UI operations; the affected tests were rerun separately. Release CI must pass the complete suite before publication.
- This native check validates the metadata filter, not the full system print dialog. Physical printing and Windows/macOS print dialogs remain unverified.

## 0.3.6 uppercase fields

- Lint, all 39 unit tests, TypeScript/build, and all 20 Chromium browser/PDF tests pass.
- The uppercase test exercises all nine header, footer, and first-page field switches; resolved titles, dates, vault/company names, properties, page totals, and accented text; saved settings; independent toggling; and undo.
- Exported HTML and PDF retain uppercase header/footer text while the document body and source templates retain their original casing.
- Unit checks cover defaults for older settings and backups, malformed uppercase flags, preset round-trips, independent copies, and undo/redo snapshots.
- Physical printing and Windows/macOS print dialogs remain unverified. Native Obsidian validation below applies to 0.2.0.

## 0.3.3 repository cleanup

- The plugin build and browser test build no longer depend on the standalone demo. Test-only DOM controls and theme styles live under `tests/support`.
- Validation covers lint, 33 unit tests, TypeScript/build, and 14 browser/PDF tests from a checkout without local demo files.
- Production runtime and stylesheet output remain identical to 0.3.2; only release metadata changes in the installer assets.
- The remaining sandbox DOM-helper warning is intentional; see [REVIEW_NOTES.md](REVIEW_NOTES.md).

## 0.3.2 source and CSS review follow-up

- Local lint now covers both plugin and demo source; lint, all 33 unit tests, TypeScript and build pass.
- All 14 browser/PDF tests pass in Chromium, including the existing eight paper/orientation/letterhead export cases and a new removal-dialog test covering Cancel, Escape, initial focus, focus restoration, confirmation and undo.
- The panel and sanitizer use the host's element factory: native Obsidian helpers in the plugin and standard DOM in the standalone demo. The print iframe remains sandboxed without parent DOM access.
- A release-workflow failure exposed a timing-sensitive page-input issue. A deterministic unit regression reproduces a queued viewport report overwriting a typed page number; the input now retains uncommitted edits.
- Browser-only lint exceptions and why they are necessary are recorded in [REVIEW_NOTES.md](REVIEW_NOTES.md).
- Native Obsidian testing of 0.3.x, physical printing and Windows/macOS print dialogs remain unverified.

## 0.3.1 review follow-up

- Local lint, all 32 unit tests, TypeScript, and build pass.
- Five attachment-resolution tests cover precise resource paths, encoded names, Windows-style resource URI fixtures, relative Markdown images, unsaved wiki embeds, missing files, unsupported types, and rejection of external/out-of-vault paths. These are fixture tests, not a native Windows validation claim.
- Source no longer calls vault-wide file enumeration APIs. Images use targeted file or link lookups against the rendered note's references.
- The manual release workflow requires all 13 browser/PDF tests to pass before it attests the three installer assets and creates the draft. The workflow run records the tested source commit and provenance; published files should be verified with `gh attestation verify` as described in the README.
- Native testing of the new attachment resolver remains a manual check. The native validation below applies to 0.2.0.

## 0.3.0 submission candidate

Validated on 13 September 2026:

- Full lint, 27 unit tests, TypeScript/build, and local ZIP packaging pass.
- All 13 browser tests pass using installed Chromium, including eight PDF cases covering A4/Letter, portrait/landscape, and regular/separate first-page letterheads.
- PDF checks verify page dimensions and counts, all content markers, headers and footers, page totals, decoded images, and first-page-only branding.
- New checks exercise cached source reads, concurrent refreshes and failure recovery, retained/clamped page navigation, bounded undo/redo, placeholder selection replacement, legacy preset imports, clipped header/footer warnings, and split table row warnings.
- Standard PDF fixtures produce no layout warnings. Oversized-row and clipped-furniture fixtures produce actionable page links.
- The final submission-candidate run passes all 13 browser tests, including keyboard focus after toggling the first-page header and undo/redo interactions. The earlier browser setup timeout was resolved by rerunning after machine load returned to normal.

This build has not yet been smoke-tested in native Obsidian or on physical paper. The native validation below applies to 0.2.0. Windows/macOS print dialogs remain unverified.

## 0.2.0 validation

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

## 0.3.8 embedded-note serialization

Lint, unit tests, TypeScript/build, and all 21 browser/PDF tests passed. Regression tests construct native-style span embeds through DOM operations and verify that serialization preserves metadata scope, nested content, surrounding text and formatting, image embeds, and the original DOM. Browser tests use the same native-style fixture to verify the metadata toggle through pagination and export.
