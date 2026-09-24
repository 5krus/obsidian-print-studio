Print Studio 0.3.11 fixes paper-size mismatches and images disappearing from printed PDFs.

- **Linux Print** now lets you choose a system printer and copy count inside Obsidian. It submits the selected A4/Letter size and orientation directly, fits pages to the printable area, and prints single-sided. It avoids the native-dialog crash and PDF viewer paper-size overrides.
- **Save PDF** uses exact standard page dimensions and includes paper-selection hints. If printing from another PDF app, select the matching paper size there.
- PDF exports correct a Chromium colour-profile incompatibility that caused images to disappear during printer conversion. Text stays selectable; image resolution and transparency are preserved.
- Image decoding failures now stop output instead of silently producing an incomplete document.

Requires **desktop Obsidian 1.13.0 or newer**. Linux direct printing requires a configured CUPS printer and its `lp`/`lpstat` commands. Windows/macOS retain their existing system print dialog.

Update through **Settings → Community plugins → Check for updates**, then update Print Studio. Generate a fresh PDF to benefit from the export fix; existing PDFs are unchanged.
