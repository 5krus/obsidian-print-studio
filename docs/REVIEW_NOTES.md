# Source review notes

## Changes addressing the 0.4.0 scorecard

| Finding in 0.4.0 | Follow-up implementation |
| --- | --- |
| Four direct-style assignments | Captured text appearance is now a validated map of CSS declarations. Inheritance and neutral print colours are transformed as data and serialized into scoped export rules. The style-rule exemption has been removed. |
| Ten standard DOM creation calls | The host prepares content, headers, footers and line-break templates through its Obsidian element factory. The isolated renderer clones these inert templates after pagination. The DOM-helper exemptions have been removed. |
| ES5 helpers | The build compiles the pinned PDF-Lib package’s included TypeScript sources for ES2022 instead of bundling its precompiled ES5 entry point. Original assignment-style class-field semantics are retained. PDF and desktop-boundary tests also run against this source build. |
| Missing contributing guide | [CONTRIBUTING.md](../CONTRIBUTING.md) now covers bug reports, changes and output testing. |

Strict local lint checks enable both reported rules as errors with inline suppression disabled. These changes do not establish a new public score; the community service must scan the new source and release assets.

## Remaining capability disclosures

- **Direct filesystem access:** `src/native-print.ts` writes a finished PDF to the save dialog’s selected path. `src/cups-print.ts` writes and removes a private temporary PDF for Linux printing. These paths may be outside the vault, so the vault API is not an equivalent replacement. Neither module reads arbitrary filesystem content.
- **Process execution:** `src/cups-print.ts` launches the fixed programs `lpstat` and `lp` through `execFile`, with separate arguments and no shell. Linux printer selection and direct submission need access to the system printing service. Note text is never evaluated as a command.
- **Malware scan unavailable:** this is a missing scanner result, not a failed malware check; it provides no assurance that a scan passed.

File access and process execution remain real capabilities and deserve disclosure. Replacing them with an equivalent API solely to conceal their use would not improve security. Tests cover temporary-file permissions and cleanup, cancellation, separate command arguments, and blocked print-window navigation.

The directory scan can be previewed before a release with **Review branch** on the entry’s management page, using a branch, tag or commit. See the [official review FAQ](https://docs.obsidian.md/community-directory/faq). Retain asset attestations and reproducible builds for the release.

## Plugin UI

`src/obsidian-ui.ts` supplies Obsidian's `createEl` helper and native components. The panel and HTML sanitizer receive that element factory, including for logo canvases. Presets use `Plugin.loadData()` / `Plugin.saveData()`.

## Isolated print runtime

`src/frame.ts` runs inside an iframe with `sandbox="allow-scripts allow-modals"` and a network-blocking content security policy. Obsidian’s globals remain unavailable. `src/print-structure.ts` constructs content and inert page-furniture templates in the host with Obsidian’s helpers. Only serialized HTML crosses the boundary; the frame receives no host functions or parent DOM access. `src/page-snapshot.ts` clones a prepared line break when freezing the finished export DOM.

## Captured formatting and custom CSS

`src/note-formatting.ts` captures computed text styles from an offscreen Obsidian render into a detached clone; it does not rewrite the source note. Captured inline declarations pass a finite text-property allowlist and become declaration maps. Font scaling, inheritance and background defaults are applied to those maps before serialization into export CSS; they do not style the plugin interface.

`src/content-css.ts` parses user CSS with CSS Tree, scopes each selector to note content, and allows only text, spacing and border declarations. At-rules, resource URLs, variables, generated content and layout/positioning properties are rejected. Unsupported CSS blocks export until corrected or disabled. The frame and exported document retain their network-blocking CSP, and style text is escaped during HTML serialization.

## Desktop printing

`src/native-print.ts` uses Obsidian’s Electron remote bridge to load a finished snapshot in a hidden BrowserWindow. The window has Node integration disabled, context isolation and sandboxing enabled, and the snapshot retains a network-blocking CSP with scripts disabled. Links cannot open windows or navigate the print document. Images and fonts finish loading before output. The window and Blob URL are cleaned up on completion, failure, or studio close.

PDF output uses an explicit paper size and `preferCSSPageSize: true`; Linux Print prepares the same PDF and shows an Obsidian printer/copies dialog, avoiding the crashing native print dialog. The desktop-only CUPS adapter discovers queues with `lpstat` and submits confirmed jobs with `lp`, explicit media/orientation, fit-to-page, and single-sided options. Commands use `execFile` argument arrays, bounded output/timeouts, and no shell. Temporary directories are private and the PDF is removed on success or failure. On other desktop platforms, the physical print dialog receives matching paper size, orientation, scale, and margins. These are separate actions because system printer defaults must not determine saved PDF dimensions. See [Electron’s printing API](https://www.electronjs.org/docs/latest/api/web-contents#contentsprinttopdfoptions).

## Automated tests

`tests/support` provides browser controls and CSS for unit and Chromium/PDF tests without requiring a running Obsidian app. The test fixture contains synthetic content and is a separate build entry point, excluded from `main.js` and installer assets. These test adapters necessarily use standard browser DOM APIs.

The standalone sample demo and its browser preference storage were removed from the tracked project in 0.3.3. Building, testing and releasing from a fresh checkout requires no local demo files. Earlier releases and their source history retain the code reviewed for those versions.

`src/pdf-output.ts` uses PDF-Lib to normalize Chromium’s rounded paper dimensions and add viewer print preferences. It replaces only the known Skia sRGB image profile with DeviceRGB; image samples, transparency masks, text, and other profiles are retained. [CUPS option documentation](https://openprinting.github.io/cups/doc/options.html) defines the submitted media and scaling options.
