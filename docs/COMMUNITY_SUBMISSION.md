# Community releases

Print Studio is published in Obsidian's community directory. Users can install and update it through **Settings → Community plugins**. It is an independent, free desktop plugin under the MIT license.

The plugin ID is `print-studio`, the repository is `5krus/obsidian-print-studio`, and the minimum Obsidian version is `1.13.0`. Release tags use the manifest version without a `v` prefix.

## Prepare an update

1. Update `manifest.json`, `package.json`, `package-lock.json`, `versions.json`, and the matching `docs/release-VERSION.md` notes.
2. Run the checks below and smoke-test in desktop Obsidian, including existing presets, preview navigation, HTML export, Save PDF, and Print.
3. Push to `main` and confirm **Validate plugin** passes for the intended commit.
4. Run the attested release workflow, verify the assets, then publish its draft as a normal release. Use the existing community listing to review the new version's scan results.

Only `main.js`, `manifest.json`, and `styles.css` belong on the installer release. The local-install ZIP is available through packaging and Actions artifacts. See [review notes](REVIEW_NOTES.md) for the isolated print runtime and [validation](VALIDATION.md) for test coverage and remaining manual checks.

## Reproduce the release locally

```sh
npm ci
npm run package
CHROMIUM_PATH=/path/to/chromium npm run test:browser
```

After committing and pushing the intended source and matching versioned release notes to `main`, run **Actions → Prepare attested release → Run workflow**, selecting `main`. Or use:

```sh
gh workflow run release.yml --repo 5krus/obsidian-print-studio --ref main
```

The workflow checks the source, builds the assets, signs provenance attestations, and creates a draft at that exact source commit. It will not replace an existing release. Publish the completed draft only after the workflow succeeds.

Before publishing, download its assets and verify them:

```sh
gh attestation verify main.js --repo 5krus/obsidian-print-studio \
  --signer-workflow 5krus/obsidian-print-studio/.github/workflows/release.yml
```

Repeat for `styles.css` and `manifest.json`. The draft must be published before Obsidian can install and review the new version. Do not rebuild or replace the attested files manually; generate a new version through the workflow when code changes.

## Official guidance

Checked on 13 September 2026:

- [Submit your plugin](https://docs.obsidian.md/plugins/releasing/submit-plugin)
- [Set up and claim](https://docs.obsidian.md/community-directory/set-up-and-claim)
- [Submission requirements](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins)
- [Developer policies](https://docs.obsidian.md/community-directory/developer-policies)
- [Manifest reference](https://docs.obsidian.md/Reference/Manifest)
