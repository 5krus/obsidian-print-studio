Print Studio 0.3.2 addresses the source and CSS review follow-up.

- Use Obsidian's element helpers for the plugin panel, sanitized document preparation and logo canvases.
- Replace the demo's browser confirmation with a keyboard-accessible modal dialog; correct preset-removal text to describe session undo.
- Remove an unused demo import and qualify its notification timer with `window`.
- Replace `clip-path` on the accessible modal title with broadly supported offscreen positioning.
- Include the standalone demo in lint checks and document the intentional browser-only DOM and storage exceptions in `docs/REVIEW_NOTES.md`.

Requires **desktop Obsidian 1.13.0 or newer**. Existing presets remain compatible. Install or update using the three attached files (`main.js`, `manifest.json`, `styles.css`), keeping your existing `data.json`.

Validation: lint, 32 unit tests, TypeScript/build, and 14 browser/PDF tests, including dialog cancellation, Escape, focus restoration, confirmation and undo. Native Obsidian testing of 0.3.x and physical printing remain manual checks; see `docs/VALIDATION.md`.

The release workflow attests the three installer assets. Verify any downloaded asset with `gh attestation verify main.js --repo 5krus/obsidian-print-studio` (substitute its filename as needed).
