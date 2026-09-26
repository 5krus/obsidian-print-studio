# Note appearance, custom CSS and preset restoration

Print Studio 0.4.0 adds two optional appearance modes, a per-preset print CSS field, and built-in preset restoration. Existing presets keep Studio styles until you choose another appearance.

## Validation

See [the validation report](VALIDATION.md) for the release checks and browser/PDF coverage. In Obsidian 1.13.7 with Fast Text Color 1.1.12, 12 formatting PDFs and 16 baseline paper/layout PDFs passed through the actual Electron engine. Generated PDFs were also visually reviewed. Physical printing and Windows/macOS dialogs remain manual checks.

## Start with the sample note

Developers can generate a separate `print-studio-lab` vault using the instructions below. It contains a synthetic **Formatting study** note, a **study-styles** CSS snippet, and three sample presets. Install Fast Text Color separately to test its formatting.

1. In Obsidian's vault switcher, choose **Open folder as vault** and select the `print-studio-lab` folder beside the Print Studio source checkout.
2. If prompted, enable the plugins in this test vault. Confirm **Print Studio** and **Fast Text Color** are enabled under Community plugins, and **study-styles** is enabled under Appearance → CSS snippets.
3. Open **Formatting study** in reading view. You should see red bold text, blue italics, yellow highlights, Fast Text Color red/blue/green text, and a larger purple inline span. The note sets `ftcTheme: default`, deliberately different from Fast Text Color's global built-in theme.
4. Run **Print Studio: Preview & print current note**.
5. Compare **Essential** (ordinary Studio output), **Prototype — text**, **Prototype — reading**, and **Prototype — custom**.
6. Use **Save PDF** and **Export HTML** for each. Open the saved files independently. Compare the first page, at least one page boundary, and the last page with the preview.

The sample note has rows **ROW-00** through **ROW-23** and ends with **END-OF-STUDY** on a new page. Every row and the end marker should appear exactly once. Page counts can change when you alter typography, margins, or CSS.

## What the options do

Under **Content → Note appearance**:

| Option | Expected behavior |
| --- | --- |
| Studio styles | The existing preset-driven appearance. Custom source styles are omitted. |
| Preserve text formatting | Keeps resolved text colors, highlights, relative sizes, weight, italics, decorations and alignment. Uses white paper, dark base text, and the preset's base font. |
| Reading appearance (experimental) | Also keeps the note's base font, foreground and background. Headers, footers and borders use the note foreground. Page geometry remains controlled by Print Studio. |

**Font size** and **Line spacing** scale the captured typography. A custom CSS rule can override those values. Theme/snippet changes are picked up by **Refresh note**, or by reopening Print Studio.

Existing presets default to Studio styles. Appearance and custom CSS save automatically with each preset and travel in preset exports.

## Try your own styling

After the synthetic note, copy a few representative study notes and their snippets into the test vault. Enable their required plugins there. Include:

- Nested bold/italic/color spans, headings, lists, tables, and highlights across a page boundary.
- Notes with `cssclasses`, per-note Fast Text Color themes, and ordinary inline HTML styles.
- Long notes, embedded notes and images, portrait/landscape, and A4/Letter.
- Both Obsidian light and dark themes. After changing a theme, use **Refresh note**.

For each, compare reading view → Print Studio preview → saved PDF → exported HTML. In the PDF, select/copy text as well as looking at it; check that nothing disappears near page bottoms. Print a representative page on your physical printer if available.

## Custom print CSS

Open **Custom CSS**, enter rules in **Print CSS**, and turn on **Enable custom CSS**. This is separate from capturing existing snippets. For example:

```css
strong { color: #b42318; }
em { color: #175cd3; }
mark { background-color: #fef08a; color: #262727; }
.ftc-color-default-blue { font-size: 1.35em; }
.ps-content { font-family: Georgia, serif; }
```

Rules target the note body. `.ps-content` targets its root; `.markdown-preview-view`, `.markdown-rendered`, and the note's `cssclasses` are available too. Headers, footers, page size, and Print Studio's interface are outside this scope.

Supported properties cover text colors, background colors, fonts, line spacing, letter/word spacing, text decoration/transform/alignment, indentation, vertical alignment, margins, padding, and borders. Use literal colors and fonts installed on your computer. `!important` is normalized away; normal selector specificity and rule order apply.

The CSS field rejects `@media`, `@page`, `@import`, `@font-face`, CSS variables, generated content/pseudo-elements, positioning, display, and resource URLs. Existing snippets using variables can still work through **Preserve text formatting**, because their resolved values are captured in Obsidian. The CSS field itself does not import the vault's stylesheet context.

Try an unsupported rule such as `p { position: fixed; }`: an inline error should appear and exports should remain disabled while that CSS is enabled. Correct the rule, disable custom CSS, or use Undo to recover. Disabling the switch retains your CSS text.

Check that a rule on a paragraph or `.ps-content` also affects ordinary nested text, and that more specific formatting still wins where expected.

## Restore the built-in presets

Preset management actions are in the **Preset settings** gear beside the preset selector: duplicate, import, export current/all, restore, and remove. Undo and redo stay directly below the selector.

1. Duplicate **Essential**, rename the copy **My test preset**, and customize it.
2. Edit an original preset; optionally rename it. Delete another original preset.
3. Open the gear and choose **Restore built-in presets**. First try Cancel or Escape: nothing should change.
4. Repeat and confirm Restore. **Studio letterhead**, **Editorial**, and **Essential** should return to their original definitions. Deleted originals should return. **My test preset** and imported presets should remain unchanged.
5. Try Undo and Redo. Close and reopen Print Studio: the selected result should persist. Undo history itself lasts only for the current session.

Restoration replaces original presets by identity, including renamed originals. Duplicate first if you want to retain a modified original. At the 30-preset limit, restoration asks you to make room if a missing original would exceed that limit; it does not delete custom presets to make room.

## Compatibility limits

- Reading appearance preserves text styling and a solid background, not an exact copy of all reading-view layout. Grids, positioning, generated content, gradients, interactive widgets and arbitrary plugin layouts are outside the current capture.
- Colors remain the chosen colors. Pale accents can be hard to read on white paper; dark accents can be hard to read on a dark background. Check your chosen palette, or override it with print CSS.
- Fonts supplied only by a theme's web-font stylesheet are not embedded. An unavailable font falls back to an installed font.
- Snippets requiring particular workspace ancestors or state may not match the offscreen rendering container. Reading-view and note class selectors are supported.
- Dynamic plugins that finish after Markdown rendering may still require Refresh note. Embedded documents retain the existing compatibility limitations.
- Physical printing and Windows/macOS dialogs still need manual checks. The automated Linux Print tests generate the real print PDF but substitute file capture for printer submission.

## Install or update

In Obsidian, open **Settings → Community plugins**, check for updates, and update Print Studio. Reopen Print Studio after updating. To retain a customized built-in preset before restoring defaults, duplicate it from the gear menu or export a backup.

For a manual installation, use the release's `main.js`, `manifest.json` and `styles.css` in the vault's `.obsidian/plugins/print-studio/` directory, then reload the plugin. Keep the vault's existing `data.json`; it contains your presets and logos.

## Reproducing developer checks

```sh
npm run check
CHROMIUM_PATH=/path/to/chromium npm run test:browser
node scripts/notices.mjs
node scripts/package.mjs
```

Chromium, Poppler (`pdfinfo`, `pdftotext`, `pdftoppm`) and Ghostscript are needed for the output tests. Run native and browser suites separately on machines with limited memory.

To prepare a new empty lab after building:

```sh
node scripts/create-formatting-lab.mjs /path/to/print-studio-lab
```

The script refuses to overwrite a nonempty directory. Install Fast Text Color in that vault separately. Native validation requires the synthetic lab note and plugins, a separate Obsidian profile, and a local debugging port:

```sh
obsidian --user-data-dir=/path/to/isolated-profile --remote-debugging-port=9227
# Open print-studio-lab in that instance, then:
node scripts/validate-formatting-native.mjs
# After the full browser suite, verify its 16 baseline native outputs too:
PRINT_STUDIO_CDP_URL=http://127.0.0.1:9227 node scripts/validate-native.mjs
```

Use the desktop Obsidian launcher for that command if `obsidian` on your PATH is the separate CLI. The validator refuses a vault named anything other than `print-studio-lab`, edits only its test presets/view, and writes PDFs/HTML/first-page images to `test-results-native-formatting/`. It substitutes only the filename dialog and physical printer submission; Electron's actual PDF engine is used.

When reporting an issue, include the appearance mode, light/dark theme, enabled snippet or CSS rule, plugin versions, and a minimal sample note. Attach the preview and saved output if the difference is visual.
