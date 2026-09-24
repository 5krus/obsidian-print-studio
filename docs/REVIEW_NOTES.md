# Source review notes

## Plugin UI

`src/obsidian-ui.ts` supplies Obsidian's `createEl` helper and native components. The panel and HTML sanitizer receive that element factory, including for logo canvases. Presets use `Plugin.loadData()` / `Plugin.saveData()`.

## Isolated print runtime

`src/frame.ts` runs inside an iframe with `sandbox="allow-scripts allow-modals"` and a network-blocking content security policy. Standard DOM creation is intentional because Obsidian's globals are unavailable. Giving this frame access to the parent app to satisfy a DOM-helper recommendation would undermine its isolation. This is the only production source file exempted from the local DOM-helper lint rule; the community scanner may still report these calls.

## Desktop printing

`src/native-print.ts` uses Obsidian’s Electron remote bridge to load a finished snapshot in a hidden BrowserWindow. The window has Node integration disabled, context isolation and sandboxing enabled, and the snapshot retains a network-blocking CSP with scripts disabled. Links cannot open windows or navigate the print document. Images and fonts finish loading before output. The window and Blob URL are cleaned up on completion, failure, or studio close.

PDF output uses an explicit paper size and `preferCSSPageSize: true`; Linux Print prepares the same PDF and shows an Obsidian printer/copies dialog, avoiding the crashing native print dialog. The desktop-only CUPS adapter discovers queues with `lpstat` and submits confirmed jobs with `lp`, explicit media/orientation, fit-to-page, and single-sided options. Commands use `execFile` argument arrays, bounded output/timeouts, and no shell. Temporary directories are private and the PDF is removed on success or failure. On other desktop platforms, the physical print dialog receives matching paper size, orientation, scale, and margins. These are separate actions because system printer defaults must not determine saved PDF dimensions. See [Electron’s printing API](https://www.electronjs.org/docs/latest/api/web-contents#contentsprinttopdfoptions).

## Automated tests

`tests/support` provides browser controls and CSS for unit and Chromium/PDF tests without requiring a running Obsidian app. The test fixture contains synthetic content and is a separate build entry point, excluded from `main.js` and installer assets. These test adapters necessarily use standard browser DOM APIs.

The standalone sample demo and its browser preference storage were removed from the tracked project in 0.3.3. Building, testing and releasing from a fresh checkout requires no local demo files. Earlier releases and their source history retain the code reviewed for those versions.

`src/pdf-output.ts` uses PDF-Lib to normalize Chromium’s rounded paper dimensions and add viewer print preferences. It replaces only the known Skia sRGB image profile with DeviceRGB; image samples, transparency masks, text, and other profiles are retained. [CUPS option documentation](https://openprinting.github.io/cups/doc/options.html) defines the submitted media and scaling options.
