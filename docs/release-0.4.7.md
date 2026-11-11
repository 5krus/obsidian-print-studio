# Print Studio 0.4.7 — Mermaid, Dataview and screen-only content

- **Mermaid diagrams:** fixes solid black nodes and missing labels in preview and exports. Node colors, borders, connecting arrows and multiline labels now retain their rendered appearance, including custom Mermaid themes and classes. Fixes [#3](https://github.com/5krus/obsidian-print-studio/issues/3).
- **Dataview inline fields:** resolves enabled inline queries before capturing the print document, so headings such as `=this.name` print their values. Supports expressions, configured prefixes and embedded-note context, with a bounded wait and a warning if queries remain unresolved. Fixes [#4](https://github.com/5krus/obsidian-print-studio/issues/4).
- **Screen-only content:** add `class="print-hide"` to an element to keep it visible in Obsidian while omitting it from preview, PDF, Print and HTML export. For example: `<span class="print-hide">internal note</span>`. Implements [#5](https://github.com/5krus/obsidian-print-studio/issues/5).

Thanks to @alby1976 and @uxdiva for the reports and examples, and to @uxdiva for contributing the print-hide feature and initial Dataview fix.

Update through **Settings → Community plugins → Check for updates**, then restart Obsidian and reopen Print Studio. Requires Obsidian 1.13.0 or newer; existing presets and logos are preserved.
