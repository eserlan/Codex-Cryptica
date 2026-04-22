# Releasing Codex Cryptica

Codex Cryptica uses an automated versioning and release pipeline. Follow these guidelines to ensure successful deployments and high-signal community updates.

## 🚀 The Release Flow

1.  **Work on a Feature Branch**: Never work directly on `main` or `staging`.
2.  **Label your Pull Request**: Before merging to `staging`, apply one of the following labels to your PR:
    - `minor`: (Recommended) Bumps the version to `X.Y.0` and triggers a formal GitHub Release. Use this for new features (e.g., Blog, Maps, Canvas).
    - `major`: Bumps the version to `X.0.0` and triggers a formal GitHub Release. Use this for breaking changes or massive milestones.
    - **No Label (Default)**: Automatically bumps the **Patch** version (`X.Y.Z+1`). This **does not** trigger a GitHub Release. Use this for bug fixes and internal chores.
3.  **Merge the PR to `staging`**: CI runs and a staging deployment is created.
4.  **Promote to Production**: Trigger the `Promote Staging to Production` workflow. This deploys to prod, then automatically:
    - Merges `staging` into `main`
    - Reads the label from the latest merged staging PR to determine bump type
    - Commits the version bump to `main`
    - Triggers the `Deploy` and `Release` workflows

## 📦 What happens during a Release?

When a `minor` or `major` label is detected:

- **Version Rollover**: The version is set to `X.Y.0` (patch is reset to zero).
- **GitHub Release**: A new formal Release is created at [eserlan/Codex-Cryptica/releases](https://github.com/eserlan/Codex-Cryptica/releases).
- **Portable Codex**: A `.zip` artifact of the production build is automatically attached to the release. This allows GMs to run the app entirely offline.
- **Categorized Changelog**: Pull requests are automatically grouped into:
  - ✨ New Features
  - ⚡ Performance (Bolt)
  - 🎨 User Experience (Palette)
  - 🐛 Bug Fixes
- **Discord Ping**: The `#releases` channel receives an automated announcement with a link to the new version.

## ⚠️ Important Reminders

### 1. Labeling is Key

The release process is entirely dependent on the **PR Label**. Labels must be applied **before merging to `staging`** — the bump reads the label of the most recently merged staging PR at promotion time. If you forget to add the `minor` label before merging, you will only get a patch bump and no formal release.

### 2. High-Signal PR Titles

The automated changelog uses your **Pull Request Titles**. Ensure they are descriptive and follow the project convention (e.g., `:sparkles: feat(canvas): Interactive Spatial Canvas`). Avoid generic titles like "fixed some stuff."

### 3. Build Secrets

The "Portable Codex" build requires `VITE_GOOGLE_CLIENT_ID` and `VITE_GEMINI_API_KEY` to be correctly set in GitHub Secrets. If these are changed or missing, the offline version will have disabled features.

### 4. Verification

After a release, always verify:

1.  The live site at [codexcryptica.com](https://codexcryptica.com) reflects the new version.
2.  The GitHub Release exists and has the `codex-cryptica-vX.Y.Z.zip` attached.
3.  The Discord announcement was sent to the correct channel.

---

_Last Updated: April 2026_
