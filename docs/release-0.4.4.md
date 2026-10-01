# Print Studio 0.4.4 — consistent table columns

- Fixes ordinary table columns becoming narrower in the Vision Pro preview than on desktop. Print Studio now measures the table at the printed page width and uses the same column-sizing policy in both rendering engines.
- Keeps column widths aligned across page breaks, preview zoom, and exported documents. Long unbroken text remains constrained to the page.
- Tables with explicit column widths, merged cells, or nested tables retain their existing layout behavior. Device fonts can still produce small text differences.

Validated in Chromium and WebKit, including multipage tables, narrow preview windows, HTML export, and mobile PDF output. Desktop Save PDF was also checked in an isolated Obsidian vault. A physical Vision Pro remains untested.

Update Print Studio on **both devices** through **Settings → Community plugins → Check for updates**, then restart Obsidian and reopen the Mission preview with the same preset. Existing presets and logos are preserved.
