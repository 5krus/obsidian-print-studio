Print Studio 0.2.0 adds portable presets and easier navigation while keeping the interface native to Obsidian.

- Import preset JSON files as independent copies; export the current preset or a full backup, including logos.
- Navigate directly to a page, move backward or forward, and choose Fit width or 50–200% zoom. Preview zoom does not change exported or printed page sizes.
- Finish pagination even when Obsidian is unfocused and Chromium pauses animation frames.
- Preserve checklist states and remove code-block copy icons from printed notes.
- Use searchable native plugin settings and validate messages crossing the isolated preview boundary.

If you assigned a custom hotkey to the old preview command, reassign it after upgrading; its ID is now `print-studio:preview`.

Requires **desktop Obsidian 1.13.0 or newer**.

To install, extract `print-studio-0.2.0.zip` and copy its `print-studio` folder into `<vault>/.obsidian/plugins/`. Restart Obsidian and enable Print Studio. For an existing installation, replace the plugin files while keeping `data.json`.

Validation covers native Obsidian 1.13.7 on Linux, A4 and Letter PDFs in portrait and landscape, long tables, images, checklists, manual page breaks, headers, footers, and page totals. No physical printer is configured on the development machine; paper output and Windows/macOS print dialogs remain manual checks.

This release is available to people with access to this GitHub repository. Print Studio has not been submitted to Obsidian’s community directory.
