Print Studio 0.3.1 addresses the community review recommendations for file access and release provenance.

- Resolve image attachments directly from the current note's rendered references. Print Studio no longer builds a list of every file in the vault. External, missing, and unsupported images still become placeholders.
- Build the installer assets in GitHub Actions and generate signed GitHub artifact attestations for `main.js`, `manifest.json`, and `styles.css`.
- Attach only those three supported installer files to the release. The convenience ZIP remains available through local packaging and the release workflow's artifacts.

Requires **desktop Obsidian 1.13.0 or newer**. Existing presets remain compatible.

To install manually, create `<vault>/.obsidian/plugins/print-studio/`, download the three files below into that folder, reload Obsidian, and enable **Print Studio**. When updating, replace those files and keep `data.json`.

To verify a downloaded asset's provenance with GitHub CLI:

```sh
gh attestation verify main.js --repo 5krus/obsidian-print-studio \
  --signer-workflow 5krus/obsidian-print-studio/.github/workflows/release.yml
```

The same command works for `styles.css` and `manifest.json` by replacing the filename. Attestations establish where the files were built; Obsidian's separate review still determines the directory listing status.

Validation covers lint, build, 32 unit tests, and 13 browser/PDF tests. Attachment tests cover encoded filenames, Windows-style resource paths, relative Markdown images, wiki embeds, missing images, external URLs, and vault-boundary checks. Native validation of Print Studio 0.3.x, physical printing, and Windows/macOS print dialogs remain manual checks; see `docs/VALIDATION.md`.
