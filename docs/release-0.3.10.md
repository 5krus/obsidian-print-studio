Print Studio 0.3.10 avoids an Obsidian crash when using Print on Linux.

- On Linux, **Print** now asks where to save the PDF and opens it in your default PDF viewer. Print the document from that viewer.
- This bypasses Electron’s native print dialog, which can terminate the whole application.
- **Save PDF** retains the selected A4/Letter paper size and orientation. Windows and macOS keep their existing Print flow.

Requires **desktop Obsidian 1.13.0 or newer**. Update through **Settings → Community plugins → Check for updates**.

Regression tests cover the Linux PDF handoff, save cancellation, invalid PDF output, viewer-opening errors, and preservation of Save PDF behavior. Physical printing and Windows/macOS dialogs remain unverified.
