# Releasing Codex Cryptica

Codex Cryptica uses an automated versioning and release pipeline. The in-app changelog in `apps/web/src/lib/content/changelog/releases.json` is the source for user-facing GitHub release notes.

## Release flow

1. Work on a feature branch; do not make feature changes directly on `main` or `staging`.
2. Before merging to `staging`, label the latest PR with the intended version bump:
   - `minor`: set the version to `X.Y.0` and create a formal GitHub release.
   - `major`: set the version to `X.0.0` and create a formal GitHub release.
   - No bump label: increment the patch version; no formal release is created.
3. Merge to `staging` and wait for CI and the staging deployment to succeed.
4. Manually run **Promote Staging to Production**. On success, automation merges `staging` into `main`, bumps the version, syncs `staging`, and triggers the formal release for major/minor versions.

## What a formal release contains

- The in-app changelog highlights, formatted as user-facing release notes, plus a full-changelog comparison link.
- A Discord release announcement linking to the GitHub release.
- **No packaged application ZIP.** Codex Cryptica does not offer the release ZIP as an installer or supported self-hosting package, so announcements should not describe releases as portable or promise that the app runs entirely offline.
- GitHub may show automatically generated source-code archives for the public repository tag. These are repository snapshots, not packaged application downloads; the repository's `LICENSE` applies.

Do not manually bump `apps/web/package.json`, the fallback version, or the service-worker cache version. Promotion automation owns those values.

## Before and after promotion

- Write the release entry to `releases.json` and sync the historical section in `specs/roadmap.md` before promoting.
- Ensure the latest merged PR targeting `staging` has the correct `minor` or `major` label for a formal release.
- After promotion, verify the production site, the GitHub release notes and version, and the Discord announcement. The GitHub release should have no custom application ZIP attached.

_Last Updated: September 2026_
