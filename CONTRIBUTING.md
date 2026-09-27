# Contributing to Print Studio

Thanks for helping improve Print Studio. For everyday use, install it through [Obsidian’s Community plugins](https://obsidian.md/plugins?id=print-studio).

## Report a problem or suggest a feature

Search [existing issues](https://github.com/5krus/obsidian-print-studio/issues) first. For a bug, include:

- Your operating system, Obsidian version and Print Studio version.
- Steps to reproduce, what you expected, and what happened.
- A screenshot or a small sample note, with personal information removed.
- For output problems, the preset, paper size, appearance mode and affected action: preview, Save PDF, Print or Export HTML.

For feature requests, describe what you are trying to achieve and a useful example. Please discuss substantial changes in an issue before starting a pull request.

## Make a change

Use Node.js 22+ and run `npm ci`, then `npm run check`. Keep pull requests focused, describe the user-visible result, and include the checks you ran. Add regression coverage when fixing a bug; include before/after screenshots for visible changes.

Use a separate test vault with synthetic notes. Changes to layout, formatting or printing should also be checked in exported files, not just the preview. See [development and testing](docs/DEVELOPMENT.md) for browser/PDF checks, a ready-made test vault and native Obsidian testing. Keep any untested platforms or physical printers explicit.

Keep user documentation short and illustrate controls with screenshots from Obsidian. Preserve the print renderer’s isolation and review the [source review notes](docs/REVIEW_NOTES.md) before changing file access, rendering or printing.
