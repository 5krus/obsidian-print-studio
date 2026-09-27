# Development and testing

These instructions are for contributors. To use Print Studio, install it through [Obsidian’s community plugins](https://obsidian.md/plugins?id=print-studio).

[User guide](GUIDE.md) · [Validation report](VALIDATION.md) · [Source review notes](REVIEW_NOTES.md) · [Release process](COMMUNITY_SUBMISSION.md) · [Third-party notices](../THIRD_PARTY_NOTICES.md)

## Build and check

Requires Node.js 22+ and npm.

```sh
npm ci
npm run check
```

This runs lint, unit tests, TypeScript checks, the plugin build, and PDF/desktop-boundary tests bundled with the production PDF-Lib source build. To watch plugin-source changes, run `npm run dev`; restart it after changes to the print-frame runtime.

Browser/PDF checks require Chromium, Poppler (`pdfinfo`, `pdftotext`, `pdftoppm`) and Ghostscript:

```sh
CHROMIUM_PATH=/path/to/chromium npm run test:browser
```

Tests check pagination, text retention, paper dimensions, formatting, image conversion, HTML export and UI interactions. Generated outputs are stored in `test-results/` and are excluded from Git. Run browser and native suites separately on machines with limited memory.

`npm run package` creates an installable development folder and local ZIP after running the checks. Published installer files are built and attested by the [release workflow](COMMUNITY_SUBMISSION.md).

## Use an isolated test vault

After building, create a new lab:

```sh
node scripts/create-formatting-lab.mjs /path/to/print-studio-lab
```

The script refuses to overwrite a nonempty directory. It installs the current build and creates a sample note, a CSS snippet and appearance presets. Open that folder as a vault in Obsidian and enable Print Studio. Install **Fast Text Color** from Community plugins and enable the **study-styles** snippet under **Appearance → CSS snippets**.

For an existing lab, replace only `main.js`, `manifest.json` and `styles.css` in its `.obsidian/plugins/print-studio/` directory, then reload the plugin. Preserve its `data.json`, which holds presets and logos.

## Check the formatting output

1. Open **Formatting study** in reading view. Confirm red bold text, blue italics, yellow highlights and Fast Text Color spans. The note’s `ftcTheme: default` exercises per-note theme selection.
2. Open Print Studio. Compare **Essential**, **Prototype — text**, **Prototype — reading** and **Prototype — custom**. These are synthetic lab presets, not installed user defaults.
3. Save a PDF and export HTML for each. Open the saved files independently and compare the first page, a page boundary and the final page. The note contains **ROW-00** through **ROW-23**, followed by **END-OF-STUDY**; each must appear once.
4. Check both Obsidian light and dark themes. Click **Refresh note** after changing a theme or snippet. Also test inline HTML styles, note `cssclasses`, embedded notes and images, A4/Letter and portrait/landscape.
5. Test custom CSS on a paragraph and `.ps-content`: ordinary nested text should inherit it, while more specific accents remain where expected. Unsupported CSS such as `p { position: fixed; }` should show an inline error and block export until corrected or disabled.

Inspect generated PDFs visually and test text selection/copying. Page counts may change with typography, margins and CSS. Physical printer submission is a separate manual check.

## Check preset management

Duplicate and customise a built-in preset. Rename an original and delete another, then choose **Restore built-in presets** from the gear menu.

Cancel and Escape must leave settings unchanged. Confirming must reset/recreate the three originals while retaining custom and imported presets. Check Undo/Redo and persistence after reopening. At the 30-preset limit, restoration must ask for room instead of deleting custom presets.

Check keyboard navigation and focus return for the menu and confirmation dialogs. Verify the close button at wide and narrow window sizes.

## Verify native PDF output

Start a separate desktop Obsidian profile and open the lab vault:

```sh
obsidian --user-data-dir=/path/to/isolated-profile --remote-debugging-port=9227
```

Use the desktop launcher if `obsidian` on your PATH is the separate CLI. Then run:

```sh
node scripts/validate-formatting-native.mjs
# Run after the browser suite has generated its baseline snapshots:
PRINT_STUDIO_CDP_URL=http://127.0.0.1:9227 node scripts/validate-native.mjs
```

These CDP validators require a vault named `print-studio-lab`. The formatting validator uses the sample note and plugins, edits test preset/view state, and writes to `test-results-native-formatting/`. The baseline validator writes to `test-results/`. They use Electron’s real PDF engine while substituting filename dialogs and physical printer submission.

Windows/macOS dialogs and physical printing remain manual checks. Keep their status explicit in the validation report.

## Documentation screenshots

Images in the user docs come from the released plugin in an isolated Obsidian vault, using a synthetic study note. Capture the actual controls and preview; use cropped screenshots for small interactions such as the preset menu. Keep examples free of personal vault content and wait for **Ready to print** before capture.

The README is also shown on Obsidian’s plugin pages. Keep installation centred on Community plugins, use absolute image and navigation URLs there, give images descriptive alt text, and check the result at narrow reading widths. Keep implementation details and test recipes on this page.
