# Community submission preparation

Print Studio is an independent community plugin, not an official Obsidian product. This repository is currently private. The 0.2.0 release is prepared for personal testing; no directory submission has been made.

## Prepared

- README with installation instructions, native-interface screenshots, functionality, and limitations.
- MIT license and regenerated notices for bundled runtime dependencies.
- Desktop-only manifest, a short action-oriented description, and minimum Obsidian 1.13.0 based on the native APIs used.
- Versioned release ZIP plus individual `main.js`, `manifest.json`, and `styles.css` attachments.
- Obsidian’s recommended lint rules, with no warnings. Shared browser/iframe modules deliberately use standard DOM creation because Obsidian helpers are unavailable there.
- Automated preset, sanitization, lifecycle, message validation, browser, and PDF tests.
- Native Obsidian 1.13.7 validation on Linux.
- No `print-studio` ID collision in the community registry checked on 13 September 2026; availability must be rechecked when submitting.

## Before submitting

1. Test a physical print and the Windows/macOS print dialogs if those platforms will be claimed as tested.
2. Make the GitHub repository public when ready to share its source.
3. Sign in to [Obsidian Community](https://community.obsidian.md) with the owner’s Obsidian account and link GitHub.
4. Add repository `5krus/obsidian-print-studio` to the directory. The plugin ID is `print-studio`; recheck availability at submission time.
5. Address the directory’s automated review feedback and publish corrected, incremented releases as needed.

The release tag must match `manifest.json` exactly (`0.2.0`, without `v`). GitHub releases alone do not make a plugin appear in Obsidian’s directory.

## Source guidance

Reviewed on 13 September 2026:

- [Submit your plugin](https://docs.obsidian.md/plugins/releasing/submit-plugin)
- [Submission requirements](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins)
- [Developer policies](https://docs.obsidian.md/community-directory/developer-policies)
- [Official ESLint rules](https://github.com/obsidianmd/eslint-plugin)
