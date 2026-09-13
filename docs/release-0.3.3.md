Print Studio 0.3.3 updates the project for its published community listing.

- Make installation through Obsidian's Community plugins browser the primary README instructions.
- Remove the standalone sample demo, its browser preference storage, and demo build commands from the tracked project.
- Keep automated unit and browser/PDF tests self-contained, with dedicated test adapters and styles.
- Document the remaining standard DOM calls required by the isolated print runtime.

The installed plugin's runtime and styles are unchanged from 0.3.2. Requires **desktop Obsidian 1.13.0 or newer**; existing presets remain compatible.

Validation: lint, 33 unit tests, TypeScript/build and 14 browser/PDF tests. The release workflow attests `main.js`, `manifest.json`, and `styles.css`. Native Obsidian testing of 0.3.x and physical printing remain manual checks; see `docs/VALIDATION.md`.
