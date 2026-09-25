Print Studio 0.3.13 keeps printed and exported text consistent with the preview.

- Preserve the preview's line breaks when opening its pages in the PDF or print window, including when Obsidian uses a different display scale or zoom.
- Remove pagination-only overflow columns from finished pages so text near a page boundary cannot silently move off-page.
- Keep inline formatting, links, explicit line breaks, lists, tables, images, and selectable PDF text.

This fixes paragraph endings disappearing from Save PDF and Print despite being visible in the preview. The same finished pages are used for HTML export, Save PDF, and Print.

Requires **desktop Obsidian 1.13.0 or newer**.

Update through **Settings → Community plugins → Check for updates**, then update Print Studio. Reopen Print Studio and generate a fresh PDF; existing PDFs are unchanged.
