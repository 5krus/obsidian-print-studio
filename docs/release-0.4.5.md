# Print Studio 0.4.5 — reliable wrapping at tight line spacing

- Fixes paragraphs collapsing into one long line when a font's character bounds are taller than the selected line spacing. This was reported with Reem Kufi; the correction uses each text run's line spacing and applies to all fonts.
- Preserves wrapping, text colors, inline formatting, and justification in previews, HTML exports, and PDFs.
- Adds regression coverage using the actual Reem Kufi font and generic sans-serif, serif, and monospace fonts with overlapping character bounds, plus coverage for superscripts and subscripts with zero line height.

Update through **Settings → Community plugins → Check for updates**, then restart Obsidian and reopen Print Studio. Existing presets and logos are preserved.
