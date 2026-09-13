# Community submission

Print Studio **0.3.0** has been submitted and is under review. **0.3.1** passed release provenance and build verification. **0.3.2** addresses the source and CSS review follow-up. It is an independent desktop plugin, not an official Obsidian product. Preparing or publishing a GitHub release does not itself create a directory listing.

## Repository and listing details

| Field | Value |
| --- | --- |
| Repository | `https://github.com/5krus/obsidian-print-studio` |
| Default branch | `main` |
| Plugin ID | `print-studio` |
| Name | Print Studio |
| Version / release tag | `0.3.2` (no `v` prefix) |
| Minimum app version | `1.13.0` |
| Platform | Desktop only |
| Payment | Free |
| License | MIT |
| Owner | Your personal Obsidian Community profile, linked to GitHub account `5krus` |

Short description (also in `manifest.json`):

> Turn notes into branded, print-ready documents with page borders, logos, reusable presets, headers, and footers.

The README supplies the longer listing description. The plugin name and ID had no exact collision in the published GitHub registry when checked on 13 September 2026; the directory performs the authoritative check at submission time.

Source-review exceptions for the standalone demo and sandboxed print runtime are explained in [REVIEW_NOTES.md](REVIEW_NOTES.md).

## Prepared

- Root README, MIT license, valid desktop manifest, and matching package/version metadata.
- Installation, upgrade, usage, rendering limitations, network behavior, and selected-file access documented.
- Release notes in `docs/release-0.3.2.md`.
- Release attachments contain only `main.js`, `manifest.json`, and `styles.css`, with build provenance attestations. Convenience ZIPs are available as local builds and Actions artifacts.
- Read-only CI for lint, unit tests, build, browser/PDF validation, and packaging. A separate manual release workflow has narrowly scoped signing/release permissions and creates drafts only.
- Validation report with an explicit distinction between automated checks and native/physical printing.

## Before publishing

1. Smoke-test 0.3.2 in desktop Obsidian: open a multi-page note, edit a preset on page 3, undo/redo, insert a note property, enable a different first-page header, export HTML, and open **Print / Save PDF**. Check that existing presets survive an update. Native validation recorded for 0.2.0 does not automatically validate the new version.
2. Confirm that GitHub's **Validate plugin** check is green for the exact commit being released.
3. The repository is already public. `"private": true` in `package.json` only prevents accidental npm publication and should remain unchanged.
4. Publish the prepared **0.3.2** draft from **GitHub → Releases** as a normal release, not a prerelease. Confirm the tag targets the prepared commit on `main`, and the release includes `main.js`, `manifest.json`, and `styles.css` as individual attachments. Do not attach the convenience ZIP to the installer release; the directory flags extra attachments as unsupported.

Physical output and Windows/macOS print dialogs are useful follow-up checks. They are not listed as separate submission prerequisites in Obsidian's requirements; keep untested platforms and printer behavior disclosed rather than claiming verification.

## Submit with your Obsidian account

For the existing submission, publish the corrected release and return to its current listing. Review the results for **0.3.2** and its new commit when they appear; the earlier 0.3.0 review describes the older files. Do not create a duplicate plugin entry. The initial account/setup steps below are retained for reference.

1. Visit [Obsidian Community](https://community.obsidian.md) and sign in with your **Obsidian account**.
2. In your community profile, select **GitHub → Connect** and authorize the link to `5krus`.
3. Select **Plugins → New plugin**. Enter `https://github.com/5krus/obsidian-print-studio` and choose yourself as owner.
4. Read the developer policies and confirm your maintenance commitment, then select **Submit**.
5. Review the automated scanner results. Correct any errors with a new commit and incremented release. Complete the listing and select **Publish** when the checks allow it.

The directory reads `manifest.json` at the default branch's HEAD. Its version must have a matching published GitHub release. Future versions only need new matching releases; you do not resubmit the plugin each time.

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
