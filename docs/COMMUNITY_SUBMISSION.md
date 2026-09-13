# Community submission

Print Studio is prepared for an initial community-directory submission as **0.3.0**. It is an independent desktop plugin, not an official Obsidian product. Preparing or publishing a GitHub release does not itself create a directory listing.

## Repository and listing details

| Field | Value |
| --- | --- |
| Repository | `https://github.com/5krus/obsidian-print-studio` |
| Default branch | `main` |
| Plugin ID | `print-studio` |
| Name | Print Studio |
| Version / release tag | `0.3.0` (no `v` prefix) |
| Minimum app version | `1.13.0` |
| Platform | Desktop only |
| Payment | Free |
| License | MIT |
| Owner | Your personal Obsidian Community profile, linked to GitHub account `5krus` |

Short description (also in `manifest.json`):

> Turn notes into branded, print-ready documents with page borders, logos, reusable presets, headers, and footers.

The README supplies the longer listing description. The plugin name and ID had no exact collision in the published GitHub registry when checked on 13 September 2026; the directory performs the authoritative check at submission time.

## Prepared

- Root README, MIT license, valid desktop manifest, and matching package/version metadata.
- Installation, upgrade, usage, rendering limitations, network behavior, and selected-file access documented.
- Release notes in `docs/release-0.3.0.md`.
- Installable `print-studio-0.3.0.zip`, plus the separate `main.js`, `manifest.json`, and `styles.css` files required by the installer.
- CI for lint, unit tests, build, browser/PDF validation, and packaging, with retained artifacts. CI has read-only repository permissions and does not publish releases.
- Validation report with an explicit distinction between automated checks and native/physical printing.

## Before publishing

1. Smoke-test 0.3.0 in desktop Obsidian: open a multi-page note, edit a preset on page 3, undo/redo, insert a note property, enable a different first-page header, export HTML, and open **Print / Save PDF**. Check that existing presets survive an update. Native validation recorded for 0.2.0 does not automatically validate the new version.
2. Confirm that GitHub's **Validate plugin** check is green for the exact commit being released.
3. Make this repository public in **GitHub → Settings → General → Danger Zone → Change repository visibility**. This exposes the source and its history. `"private": true` in `package.json` only prevents accidental npm publication and should remain unchanged.
4. Publish the prepared **0.3.0** draft from **GitHub → Releases** as a normal release, not a prerelease. Confirm the tag targets the prepared commit on `main`, and the release includes `main.js`, `manifest.json`, and `styles.css` as individual attachments. The ZIP is an additional convenience, not a substitute for those three files.

Physical output and Windows/macOS print dialogs are useful follow-up checks. They are not listed as separate submission prerequisites in Obsidian's requirements; keep untested platforms and printer behavior disclosed rather than claiming verification.

## Submit with your Obsidian account

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

After committing and pushing the intended source to `main`, prepare a draft without publishing it:

```sh
gh release create 0.3.0 main.js manifest.json styles.css print-studio-0.3.0.zip \
  --repo 5krus/obsidian-print-studio \
  --target "$(git rev-parse HEAD)" \
  --title 'Print Studio 0.3.0' \
  --notes-file docs/release-0.3.0.md \
  --draft
```

The draft must be published before Obsidian can install it.

## Official guidance

Checked on 13 September 2026:

- [Submit your plugin](https://docs.obsidian.md/plugins/releasing/submit-plugin)
- [Set up and claim](https://docs.obsidian.md/community-directory/set-up-and-claim)
- [Submission requirements](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins)
- [Developer policies](https://docs.obsidian.md/community-directory/developer-policies)
- [Manifest reference](https://docs.obsidian.md/Reference/Manifest)
