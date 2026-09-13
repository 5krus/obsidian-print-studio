# Source review notes

The plugin, standalone demo and print preview run in different environments. The source scanner may report browser APIs even where Obsidian APIs are unavailable.

- **Plugin UI:** `src/obsidian-ui.ts` supplies Obsidian's `createEl` helper and native components. The shared panel and HTML sanitizer receive that element factory, including for logo canvases. Plugin presets use `Plugin.loadData()` / `Plugin.saveData()`.
- **Isolated print runtime:** `src/frame.ts` runs inside an iframe with `sandbox="allow-scripts allow-modals"` and a network-blocking content security policy. It intentionally uses standard DOM APIs; Obsidian's globals are unavailable. Giving this frame access to the parent app to satisfy a DOM-helper recommendation would undermine its isolation.
- **Standalone demo:** `demo/ui.ts` supplies browser DOM controls and a modal HTML dialog. `demo/demo.ts` stores demo preferences in origin-scoped `localStorage`; there is no vault or Obsidian `App` in this environment. These demo modules are separate build entry points and are not bundled into the plugin's `main.js`.

Local lint includes both `src` and `demo`. The DOM-helper exception is limited to `src/frame.ts` and `demo/ui.ts`; only the demo entry point permits the `localStorage` global. Other recommended global restrictions remain enabled. The community scanner may still report these intentional uses if it applies its own configuration.

Version 0.3.2 also removes the unused demo import, qualifies the demo timer with `window`, replaces browser confirmation with a keyboard-accessible dialog, corrects the removal text to mention session undo, and hides the accessible modal title without `clip-path`.
