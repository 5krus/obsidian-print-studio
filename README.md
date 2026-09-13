# Print Studio for Obsidian

Give your notes a proper letterhead. Print Studio is a desktop Obsidian plugin that turns Markdown notes into branded, paginated documents with company logos, page borders, custom headers and footers, and reusable presets.

## Install locally

1. Download or build `print-studio-0.1.0.zip` and extract the `print-studio` folder.
2. Put that folder in `<your-vault>/.obsidian/plugins/print-studio/`.
3. In Obsidian, reload the app and enable **Print Studio** under **Settings → Community plugins**. If Restricted mode is on, enable community plugins first.
4. Open a Markdown note. Run **Print Studio: Preview & print current note** from the command palette, click the printer ribbon icon, or right-click a note and select **Open in Print Studio**.

The installed folder must contain `manifest.json`, `main.js`, and `styles.css` directly. This is a local development release, not yet listed in Obsidian’s community directory.

## Design your document

The left sidebar controls your layout; the preview shows the actual paginated document. Edits to a preset save automatically in this vault. Duplicate a preset to create a separate company, client, or document style.

- **Identity:** company name and a PNG, JPG, WebP, or SVG logo. Logos are embedded in the preset so the document is self-contained. SVG logos are sanitized and rasterized when imported.
- **Paper & typography:** A4 or US Letter, portrait or landscape, page margins, serif or sans-serif typography, font size, and line spacing.
- **Borders & color:** no border, fine line, double line, or dashed border; adjustable thickness and accent color.
- **Header and footer:** independent left, center, and right text, plus optional dividing rules. Content repeats on every physical page.
- **Dynamic text:** note title, company, date, vault, note properties, and actual page numbers.

### Placeholders

| Placeholder | Value |
| --- | --- |
| `{{company}}` | Preset’s company name |
| `{{title}}` | Note’s `title` property, or its filename |
| `{{date}}` | Date when the preview is generated, in your locale |
| `{{vault}}` | Current vault name |
| `{{page}}` | Current physical page number |
| `{{pages}}` | Total number of physical pages |
| `{{meta:client}}` | A scalar frontmatter property; replace `client` with your property name |

For example, set a footer to `Prepared for {{meta:client}}` and the opposite footer to `{{page}} / {{pages}}`. Missing note properties render as empty text. Unknown placeholders remain visible so typos are easy to notice. Header/footer values are plain text, never executable HTML.

### Page breaks

Enable **Start each top-level heading on a new page** to make each subsequent `#` heading start a new page, inspired by the supplied Python template. Content also flows automatically onto additional pages when needed.

For an explicit break, put this on its own line outside a code fence:

```md
<!-- pagebreak -->
```

Frontmatter is omitted from the printed body. Notes are rendered with Obsidian’s Markdown renderer; there is no substitute Markdown parser in the plugin.

## Print and export

Choose **Print / Save PDF** after pagination finishes. Select a printer or your system’s PDF destination in the print dialog. Use the same paper size and orientation as the preview, **100% scale**, **no additional margins**, disable browser-generated headers/footers, and enable background graphics for the closest match.

**Export HTML** downloads the finished pages as one self-contained document with embedded styles and images. It contains no JavaScript. Open it in a desktop Chromium-based browser to print or save a PDF if your Obsidian/Electron environment does not expose a usable system print dialog.

**Refresh note** re-reads the note, including current unsaved editor text when that note is active. The original note and Obsidian’s built-in PDF export are not changed.

## Rendering scope

- Standard headings, paragraphs, emphasis, lists, tables, blockquotes, task states, code blocks, links, and vault image attachments are supported. Print typography is intentionally independent of the active Obsidian theme.
- Remote, missing, or attachments larger than 10 MB become labeled placeholders in the self-contained document. Use image attachments in the vault for reliable offline output. The preview reports omitted images.
- Obsidian renders the note before the isolated print frame is created. Existing Markdown plugins may execute their own rendering logic at this stage. The generated print frame itself blocks network access and receives sanitized static content.
- Interactive plugin blocks, delayed Dataview output, embedded notes/PDFs, and complex MathJax/Mermaid rendering are not guaranteed to match Obsidian. Check the preview; support for those is not claimed in this MVP.
- Very long unbreakable table rows or unusual HTML blocks may need manual page breaks or simpler formatting. Oversized images are constrained to the printable area.
- Very long header/footer values can be clipped by the reserved band. Keep the text short or increase its corresponding margin.
- Desktop only. No cloud services, analytics, API keys, or paid dependencies are required. Presets and logos live in the plugin’s `data.json`; vault synchronization may synchronize that file according to your own setup.

## Development

Requires Node.js 22+ and npm.

```sh
npm install
npm test
npm run build
npm run demo      # http://localhost:5184
npm run package   # installable release folder + ZIP
```

The browser demo uses the **same designer, sanitization, pagination runtime, and print styles** as the plugin. Only its Markdown source adapter differs: the demo renders a bundled sample with Marked, while the plugin uses Obsidian.

`npm run dev` watches the plugin bundle. Restart the build after changing `src/frame.ts` or any of its imports because the sandbox runtime is bundled separately.

## Validation

Automated tests cover settings recovery, page geometry, templates, metadata, frontmatter, manual breaks, HTML sanitization, and frame isolation. Browser checks cover multi-page pagination, repeated branding, page totals, preset changes, and the designer interface.

This release has not yet been tested inside a live Obsidian vault or against a physical printer. Browser preview checks do not substitute for an Obsidian/system print test on the target OS.

## Structure

- `src/main.ts` — Obsidian commands, modal lifecycle, note rendering, and attachment inlining.
- `src/panel.ts` — reusable designer UI and preview lifecycle.
- `src/frame.ts` — isolated Paged.js pagination, repeated page furniture, print/export actions.
- `src/document.ts` — sanitized print document and physical page CSS.
- `src/settings.ts`, `src/template.ts` — portable presets, validation, and dynamic text.

Built with [Obsidian’s public plugin API](https://github.com/obsidianmd/obsidian-api), [Paged.js](https://github.com/pagedjs/pagedjs), and [DOMPurify](https://github.com/cure53/DOMPurify). See `THIRD_PARTY_NOTICES.md` for bundled dependency licenses.
