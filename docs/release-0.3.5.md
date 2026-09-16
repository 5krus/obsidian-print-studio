Print Studio 0.3.5 adds flexible space for bottom-aligned covers.

- Put `&&&&` on its own line before your cover title and other text to push that content to the bottom of the printed page, up to the next `====` or the end of the note.
- The spacer stays hidden in the note editor until the cursor or selection reaches its line. It adds no blank space to the ordinary note.
- Alignment respects paper size, orientation, margins, and first-page headers, and is preserved in HTML and PDF exports.
- Content longer than a page flows normally, with its last page aligned to the bottom. Code examples and frontmatter remain untouched.

Requires **desktop Obsidian 1.13.0 or newer**. Existing presets and page-break markers remain compatible.

Validation: lint, 36 unit tests, TypeScript/build, and 19 browser/PDF tests, including bottom-aligned covers and overflowing content. The release workflow attests `main.js`, `manifest.json`, and `styles.css`. Native Obsidian visual checks and physical printing remain manual checks.
