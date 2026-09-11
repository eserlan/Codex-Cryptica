---
name: write-release-entry
description: Prepare a Codex Cryptica release - write the user-focused releases.json changelog entry, sync the roadmap, and set up the promotion so the GitHub release notes generate themselves. Use when asked to "do a release", "write release notes", "update the changelog", or "prepare a release".
---

# Write Release Entry

The in-app changelog (`apps/web/src/lib/content/changelog/releases.json`) is
the single source of truth for release communication. The GitHub release body
is generated from it automatically (`scripts/generate-release-notes.mjs`
diffs the file against its content at the previous release tag), so writing
one good entry here is the entire editorial job of a release.

## Workflow

1. **Determine what shipped.** Read the top entry of `releases.json` (its
   date marks the last covered point). Gather everything user-visible since:
   - `git log --format="%as %s" --since=<top entry date> staging` — merged
     PRs; ignore internal-only work (Bolt/Palette/Binder bots, `refactor`,
     `chore`, `perf`, deps, docs) unless it changes what users see.
   - The "shipped since" / recent release sections of `specs/roadmap.md` and
     any new `specs/NNN-*/spec.md` directories.

2. **Pick the version.** One minor step above the highest of the top
   `releases.json` entry and `apps/web/package.json` — e.g. if the top entry
   is 0.29.0 and the package is 0.28.0, the new entry is 0.30.0. Never reuse
   a number already present in the file. Use `"type": "minor"`.

3. **Write the entry** (prepend to the array):
   - Shape: `{ version, title, date, type, highlights: [] }` — match the
     existing entries exactly.
   - Title in house style: "The X & Y Update" or a short benefit phrase.
   - 5–8 highlights, each `"Feature Name: benefit sentence."` — written for
     players and GMs, not developers.
   - **User-focused only** (Constitution IX): no implementation vocabulary
     (no PeerJS, WebAudio, R2, worker, refactor, DI…), no PR/spec numbers.
     Describe formats by what they do ("an exported world file"), not their
     acronyms. Say "Labels", never "Tags" (Constitution XII).

4. **Sync `specs/roadmap.md`.** Convert the "shipped since" section (or
   create a release section) titled `### vX.Y.0 — Title (date)` listing the
   associated specs. Roadmap entries MAY be technical; releases.json MUST NOT.

5. **Validate.** Run `bunx vitest run src/lib/components/modals/ChangelogModal.test.ts`
   from `apps/web`. Prettier runs via the commit hooks.

6. **Set up the release mechanics** (do NOT do the automation's job):
   - NEVER bump `apps/web/package.json`, the `VERSION` fallback in
     `config/index.ts`, or the service-worker `CACHE_VERSION` by hand —
     `merge-staging-to-main.yml` runs `scripts/bump-web-version.mjs` on main
     after promotion and owns all three.
   - Ensure the **most recently merged PR into `staging` carries the `minor`
     label** at promotion time — that is what makes the auto-bump minor and
     triggers the formal GitHub release (`X.Y.0` versions only).
   - Commit as `🔖 release: vX.Y.0 — <Title>` and push to `staging` (confirm
     with the user if they haven't already said where to push).
   - The user then runs the `Promote Staging to Production` workflow
     manually; everything downstream (merge to main, version bump, GitHub
     release with these notes, Discord notification) is automatic.

## Reference

- Process map: `docs/CI_DEPLOYMENT.md`
- Release-note generation: `scripts/generate-release-notes.mjs` (newest 1–2
  new entries in full, older bundled entries as a recap line, compare link)
- Known history: changelog versions ran ahead of package versions between
  June and July 2026 (entries 0.28.0/0.29.0 both shipped under tag v0.28.0);
  the max() rule in step 2 absorbs this.
