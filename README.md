# Print Studio for Obsidian

Give your notes a proper letterhead. Print Studio is a desktop Obsidian plugin that turns Markdown notes into branded, paginated documents with company logos, page borders, custom headers and footers, and reusable presets.

## Install

Requires **desktop Obsidian 1.13.0 or newer**.

1. Download `print-studio-0.2.0.zip` from the [0.2.0 release](https://github.com/5krus/obsidian-print-studio/releases/tag/0.2.0), or run `npm run package` and extract the `print-studio` folder.
2. Put that folder in `<your-vault>/.obsidian/plugins/print-studio/`.
3. In Obsidian, reload the app and enable **Print Studio** under **Settings → Community plugins**. If Restricted mode is on, enable community plugins first.
4. Open a Markdown note. Run **Print Studio: Preview & print current note** from the command palette, click the printer ribbon icon, or right-click a note and select **Open in Print Studio**.

The installed folder must contain `manifest.json`, `main.js`, and `styles.css` directly. This independent plugin is not yet listed in Obsidian’s community directory. The repository is currently private; sign in to GitHub with an account that has access to download the release. When updating, replace the plugin files while keeping your existing `data.json`.

![Print Studio in Obsidian dark mode](docs/print-studio-dark.png)

## Design your document

The interface uses Obsidian’s native controls, icons, interface font, and theme colors, including light and dark mode and your chosen accent color. The printed document uses your preset’s own typography and colors.

The left sidebar controls your layout; the preview shows the actual paginated document. Edits to a preset save automatically in this vault. Duplicate a preset to create a separate company, client, or document style.

- **Identity:** company name and a PNG, JPG, WebP, or SVG logo. Logos are embedded in the preset so the document is self-contained. SVG logos are sanitized and rasterized when imported.
- **Paper & typography:** A4 or US Letter, portrait or landscape, page margins, serif or sans-serif typography, font size, and line spacing.
- **Borders & color:** no border, fine line, double line, or dashed border; adjustable thickness and accent color.
- **Header and footer:** independent left, center, and right text, plus optional dividing rules. Content repeats on every physical page.
- **Dynamic text:** note title, company, date, vault, note properties, and actual page numbers.

### Move or back up presets

Use **Import presets** to choose a Print Studio JSON export. Imports add independent copies and select the first imported preset; they never overwrite an existing preset. Duplicate names receive an “imported” suffix.

The **Export…** menu offers **Current preset** and **All presets**. Exports include logos and layout settings, without note contents. Files are limited to 10 MB and the vault can hold up to 30 presets. For a larger backup, export presets individually.

### Preview navigation

Use the previous/next arrows or type a page number to jump through the preview. Choose **Fit width** or a zoom level from **50% to 200%**. Scrolling updates the page number. Zoom affects only the preview; exported HTML and printed pages retain their actual paper size.

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
- Obsidian renders the note before the isolated print frame is created. Obsidian and enabled Markdown plugins may load remote resources during that initial rendering stage. Print Studio adds no network service of its own. The generated print frame itself blocks network access and receives sanitized static content.
- Interactive plugin blocks, delayed Dataview output, embedded notes/PDFs, and complex MathJax/Mermaid rendering are not guaranteed to match Obsidian. Check the preview; support for those is not claimed in this MVP.
- Very long unbreakable table rows or unusual HTML blocks may need manual page breaks or simpler formatting. Oversized images are constrained to the printable area.
- Very long header/footer values can be clipped by the reserved band. Keep the text short or increase its corresponding margin.
- Desktop only. No cloud services, analytics, API keys, or paid dependencies are required. Presets and logos live in the plugin’s `data.json`; vault synchronization may synchronize that file according to your own setup.

## Development

Requires Node.js 22+ and npm.

```sh
npm ci
npm run check    # official Obsidian lint rules, unit tests, and build
npm run demo      # http://localhost:5184
npm run package   # installable release folder + ZIP
```

The browser demo uses the **same designer, sanitization, pagination runtime, and print styles** as the plugin, with lightweight stand-ins for Obsidian’s native UI components. Use `?theme=light` for its light appearance. Its Markdown source adapter also differs: the demo renders a bundled sample with Marked, while the plugin uses Obsidian.

`npm run dev` watches the plugin bundle. Restart the build after changing `src/frame.ts` or any of its imports because the sandbox runtime is bundled separately.

## Validation

Automated tests cover settings recovery, page geometry, templates, metadata, frontmatter, manual breaks, HTML sanitization, and frame isolation. Browser checks cover multi-page pagination, repeated branding, page totals, preset changes, and the designer interface.

Version 0.2.0 has been tested in **Obsidian 1.13.7 on Linux**, including native controls, pagination, page navigation, theme changes, and HTML export. Automated browser tests generate PDFs for A4 and Letter in both orientations and check page dimensions, complete content, image decoding, checklists, manual page breaks, and page furniture. See the [validation report](docs/VALIDATION.md).

No physical printer is configured on the development machine. Physical paper output and Windows/macOS system print dialogs remain unverified.

To run the browser/PDF suite, install Chromium and Poppler (`pdfinfo`, `pdftotext`):

```sh
npx playwright install chromium
npm run test:browser
# Or use an existing Chromium binary:
CHROMIUM_PATH=/path/to/chromium npm run test:browser
```

PDF artifacts are written under `test-results/`. See [community submission preparation](docs/COMMUNITY_SUBMISSION.md) for the remaining publishing steps.

## Structure

- `src/main.ts` — Obsidian commands, modal lifecycle, note rendering, and attachment inlining.
- `src/panel.ts` — reusable designer UI and preview lifecycle.
- `src/obsidian-ui.ts` — native Obsidian settings, controls, icons, and confirmation dialog.
- `src/ui.ts`, `demo/ui.ts` — UI adapter contract and standalone demo controls.
- `src/frame.ts` — isolated Paged.js pagination, repeated page furniture, print/export actions.
- `src/document.ts` — sanitized print document and physical page CSS.
- `src/presets.ts`, `src/messages.ts` — validated preset transfers and frame communication.
- `src/settings.ts`, `src/template.ts` — portable presets, validation, and dynamic text.

Built with [Obsidian’s public plugin API](https://github.com/obsidianmd/obsidian-api), [Paged.js](https://github.com/pagedjs/pagedjs), and [DOMPurify](https://github.com/cure53/DOMPurify). See `THIRD_PARTY_NOTICES.md` for bundled dependency licenses.
