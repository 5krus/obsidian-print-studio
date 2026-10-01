# Print Studio 0.4.3 — mobile and Vision Pro compatibility

- Enables installation in Obsidian's mobile app, including the iPad app on Apple Vision Pro. Desktop-only Electron and Node modules load only when desktop output is requested.
- Mobile **Save PDF** creates a PDF in **Print Studio Exports** in the vault. **Open PDF** also opens the result for sharing or printing from a supported app. Existing exports are preserved with numbered filenames.
- Mobile HTML and preset exports save into the vault, and vault images no longer depend on Node's Buffer API.
- Touch actions wrap in narrow windows. Existing presets, logos, desktop PDF output and native printing remain supported.

Mobile PDFs contain high-resolution page images, so their text is not selectable. Complex CSS may differ from the preview; inspect important exports. Requires Obsidian 1.13.0 or newer.

Chromium and WebKit checks cover mobile PDF output, including page borders, paper sizes and cancellation. Installation and file sharing inside Obsidian on a physical Vision Pro still require device testing.

Update through **Settings → Community plugins → Check for updates**, then restart Obsidian. On the Vision Pro, install or enable Print Studio after version 0.4.3 becomes available.

## Manual installation or a synced vault

1. Disable Print Studio on the device/vault you are updating.
2. Copy `main.js`, `manifest.json` and `styles.css` from this package into the vault's plugin folder, normally `.obsidian/plugins/print-studio/`. Keep your existing `data.json`; it contains presets and logos.
3. If your Vision Pro uses a synced vault, ensure those plugin files have reached that device. With Obsidian Sync, enable **Installed community plugin list** and **Active community plugin list** on both devices ([sync settings](https://help.obsidian.md/sync/settings)). A different configuration-folder setting means the plugin must be placed in that device's configuration folder.
4. Restart Obsidian on the Vision Pro, enable Print Studio, and open a note through the command palette: **Print Studio: Preview & print current note**.
5. Test **Save PDF**, **Open PDF**, a logo and a preset export. PDFs and exports should appear in **Print Studio Exports** without replacing earlier copies.

Updating the laptop alone does not update a separate, unsynced Vision Pro vault.
