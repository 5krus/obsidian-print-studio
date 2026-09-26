Print Studio 0.4.0 adds preserved note formatting, custom print CSS, and a simpler way to manage presets.

## Keep your note's text styling

Open **Content → Note appearance** and choose:

- **Studio styles** — the existing preset-driven appearance, still the default for existing presets.
- **Preserve text formatting** — keep supported text colors, highlights, relative sizes, bold, italics, and other text accents on white paper. This includes styles from CSS snippets, inline formatting, and plugins such as Fast Text Color.
- **Reading appearance (experimental)** — also retain the note's base font, foreground and background. Print Studio still controls page size, margins and pagination; this is not a complete copy of every reading-view layout.

These options apply to the preview, Save PDF, Print and exported HTML. Use **Refresh note** after changing a theme or CSS snippet. Per-note `cssclasses` and Fast Text Color theme selection are respected during rendering.

## Add print-specific CSS

Open **Custom CSS**, enter your rules, and turn on **Enable custom CSS**. For example:

```css
strong { color: #b42318; }
em { color: #175cd3; }
mark { background-color: #fef08a; color: #262727; }
```

The CSS applies to note content after the chosen appearance, without editing the note. It saves with each preset and is included in preset exports. Invalid or unsupported CSS shows an inline error; correct it, disable the switch, or use Undo to resume exporting.

Supported rules cover text, spacing and borders. Page rules, CSS variables, external resources, positioning and generated content are not supported in this field. Existing snippets with CSS variables can still contribute their resolved text styles through **Preserve text formatting**.

## Manage presets from one menu

- A **gear beside the preset selector** now contains duplicate, import, export current/all, restore, and remove. Undo and redo remain directly below the selector.
- **Restore built-in presets** resets Studio letterhead, Editorial and Essential, including renamed originals, and brings back deleted originals. Custom, duplicated and imported presets stay intact.
- Restoration asks for confirmation and supports Undo/Redo while Print Studio remains open. Duplicate a customized original first if you want to keep it.
- The **close button** now aligns with the header controls, including on narrow screens.

## Compatibility and updating

Existing presets and older preset backups remain supported. Appearance changes are opt-in, and custom CSS starts disabled. Reading appearance is experimental: complex plugin layouts, generated content and externally supplied fonts may differ from reading view. Check pale text colors on white paper and review the preview before exporting.

Requires **desktop Obsidian 1.13.0 or newer**. Update through **Settings → Community plugins → Check for updates**, then reopen Print Studio.

See the [formatting guide](https://github.com/5krus/obsidian-print-studio/blob/0.4.0/docs/FORMATTING.md) for examples and testing instructions, and the [validation report](https://github.com/5krus/obsidian-print-studio/blob/0.4.0/docs/VALIDATION.md) for coverage and remaining platform checks.
