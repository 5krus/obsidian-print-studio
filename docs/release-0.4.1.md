Print Studio 0.4.1 improves review compliance and refreshes the documentation. Custom CSS, preserved note formatting, presets and printing options remain available.

- **Export styling:** captured appearance is now handled as validated CSS data, resolving the four direct-style findings in the 0.4.0 review.
- **Print document structure:** content and page templates use Obsidian’s element helpers before entering the isolated renderer, resolving the ten DOM-helper findings. The renderer’s sandbox stays intact.
- **Modern PDF build:** PDF-Lib’s included TypeScript source is compiled for ES2022, removing the reported ES5 helpers and reducing the plugin bundle size.
- **Clearer documentation:** shorter guides with real Obsidian screenshots, Community plugins installation instructions, a contributing guide and explicit printing/file-access disclosures.
- **Stronger validation:** checks cover temporary-file privacy and cleanup, cancelled saves, blocked print-window navigation and the production PDF library build, alongside the existing formatting and output tests.

The directory’s public score depends on its next scan. PDF saving still writes to your chosen location; Linux printing still uses private temporary files and the system `lpstat`/`lp` programs without a shell. Those capability disclosures may remain.

Update through **Settings → Community plugins → Check for updates**, then reopen Print Studio. Requires desktop Obsidian 1.13.0 or newer; existing presets and custom CSS remain compatible.

[Validation and output checks](https://github.com/5krus/obsidian-print-studio/blob/0.4.1/docs/VALIDATION.md) · [Details for reviewers](https://github.com/5krus/obsidian-print-studio/blob/0.4.1/docs/REVIEW_NOTES.md)
