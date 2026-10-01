# Implementation Plan: Help Assistant Coverage Expansion, Phase A (Knowledge and Navigation)

**Branch**: `3615-help-registry-expansion` | **Date**: 2026-10-01 | **Issue**: #3615 (also advances #3611) | **Builds on**: [`specs/3427-contextual-ai-help-assistant`](../3427-contextual-ai-help-assistant/spec.md)

No separate spec: the #3427 spec already fixes the behaviour, privacy rules, action allow-list and success criteria, and this work extends that system with data and small contract changes. The requirements and acceptance checks for this increment are below, in place of a second spec.

## Summary

Make the help assistant answer well about **Canvas, entity editing, generators, VTT/map, and import/export**, and take the user to the right place, without adding highlight targets or editing heavy UI files (that is phase B, filed separately).

Findings from reading the code that shape the plan:

- The knowledge mostly exists: about 24 in-app help articles cover the five areas. Two are missing: a dedicated **export and backup** article (it is one note in `offline-sync.md`) and a basic **create and edit an entity** article.
- **"Import and export" is two different features.** Backup and restore lives in Settings → Vault → Portable Backup (`VaultBackupSettings`: export a zip, import a zip). Archive import (notes, CIF, Thread Weaver) is the separate `/import` page (`ImportSettings`). The assistant must tell them apart.
- **Settings is a modal**, not a route, with eight tabs (`vault, intelligence, schema, templates, theme, publishing, about, help`). The screen description has no way to say "Settings, Vault tab" today.
- There are **29 generators** with an id, label and description each, exposed by `listGenerators()`. The assistant's action only knows `campaign`, and the runner ignores the id.
- The help package may import only `schema` (architecture rule), so it cannot read the generator registry directly.

## Requirements and acceptance

| #   | Requirement                                                                                                                                                                                                    | Acceptance                                                                                                                                                                                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Registry entries for canvas, entity editing, VTT/map, backup and restore, archive import, and generators, each referencing existing help articles and never copying them                                       | Registry validator passes against the real articles; each entry has areas, routes, workflows and actions                                                                                                                                                                                                                      |
| R2  | The screen description recognises canvas, map, import and Settings (with its tab), with no new keys and no vault content or identifiers                                                                        | Key-set test unchanged; strict-schema tests cover the new values; privacy request-shape test passes with Settings and canvas screens                                                                                                                                                                                          |
| R3  | All 29 generators are known to the assistant from a list kept in sync with the generator registry                                                                                                              | Drift test fails if a generator is added, removed or renamed without regenerating; every generator is findable by its plain name in the top 3                                                                                                                                                                                 |
| R4  | Navigation guides: graph, tables, canvas, map, import; open a Settings tab; open the generator workflow on a chosen generator; open a help article                                                             | Validator and runner tests for each; no highlight steps added                                                                                                                                                                                                                                                                 |
| R5  | Guides are offered only where they work: no generator or Settings guide in a guest or not-ready vault                                                                                                          | Validator negative tests; context-store tests                                                                                                                                                                                                                                                                                 |
| R6  | Two new help articles: export and backup, creating and editing entities, written from the real UI                                                                                                              | Articles exist, referenced by the registry, accurate against the components (checked in review)                                                                                                                                                                                                                               |
| R7  | Evaluation grown to 100+ questions with a held-out split                                                                                                                                                       | At least 8 new in-scope questions per area (canvas, entity editing, generators, VTT/map, backup, archive import); at least 12 confusion questions; at least 25 out-of-scope in all; at least 30% held out; recall@3 at least 90% on the tuning set and on the held-out set separately; 100% of undocumented questions refused |
| R8  | Server metrics cover every area                                                                                                                                                                                | Test that every screen area is a valid metric area                                                                                                                                                                                                                                                                            |
| R9  | Everything carried over from #3427 holds: no content or identifiers sent, no client analytics, no mutating actions, off by default, hidden when AI Disabled, staging only, offline fallback, five action types | Existing guard tests unchanged and passing; runner no-mutation test extended to the new steps                                                                                                                                                                                                                                 |
| R10 | No regression on the 30 questions from the spike                                                                                                                                                               | Same or better recall@3, 100% refusal                                                                                                                                                                                                                                                                                         |

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 2, Bun 1.3.14; Cloudflare Worker.
**Dependencies**: none new. Reads existing `generator-engine` (`listGenerators`) only from a repo script.
**Storage**: none new. Knowledge still ships as the build-time bundle.
**Testing**: `bun test` (package), Vitest (web, Worker), the offline evaluation (now with a held-out split).
**Constraints**: help package may import only `schema`; Settings state is read, never written, except by an accepted guide through the existing store; no new action type.

## Constitution Check

| Principle                  | Status | How                                                                                                      |
| -------------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| I Library-first            | PASS   | Logic stays in `packages/help-engine`; web only maps IDs to existing stores                              |
| II TDD                     | PASS   | Tests first per task, including failure paths                                                            |
| III Simplicity             | PASS   | No sixth action type, no D1/Vectorize, no new dependency; generator list is a committed generated module |
| V Privacy                  | PASS   | Screen description gains values, not keys; Settings tab is an enum                                       |
| VII Documentation          | PASS   | Two articles added                                                                                       |
| XIII Discovery intent      | N/A    | No public discovery page. The public `/answers` pages are neither read nor changed                       |
| XIV Bounded responsibility | PASS   | No existing file over 500 lines is edited (see below)                                                    |

Existing files this plan edits, all under 500 lines or data-only: `help-engine/src/{context,actions}`, `registry/features/index.ts`, `help-metrics.ts`, `help-context.svelte.ts`, `help-runtime.ts`, `help-action-runner.ts`, eval files. No phase-B UI file is touched.

## Design decisions

1. **Settings tab uses the existing `tab` field.** Entity tabs (`status, connections, lore, map, chats, family, stats, timeline`) and Settings tabs (`vault, intelligence, schema, templates, theme, publishing, about, help`) do not overlap, and `area` says which set applies. A schema refinement makes a mismatch invalid. Rejected: a new `settingsTab` key, which would change the pinned key set and need a version bump for no gain.
2. **Settings guides reuse `openPanel`** with Settings panel IDs (`settings-vault`, `settings-intelligence`, `settings-schema`, `settings-templates`, `settings-theme`, `settings-publishing`). The allow-list stays five types. They are valid when the screen is the in-vault app, not a guest vault.
3. **Area precedence**: Settings modal open, then generator workflow open, then an entity open, then route (`canvas`, `map`, `import`, `tables`, graph). New areas: `canvas`, `map`, `import`, `settings`.
4. **Generators: a committed generated list plus a sync script plus a drift test.** The help package cannot import `generator-engine`, so `scripts/sync-help-generators.ts` (repo scripts, like `sync-answers.ts`) writes `packages/help-engine/src/registry/generators.generated.ts` (id, label, description). A web-side test imports both and fails if they differ. `GeneratorId` becomes the generated union, so `openGenerator` accepts any real generator.
5. **One chunk per generator in the bundle**, so "how do I make a quest" retrieves the quest generator. **Open-generator actions are offered only for generators actually retrieved** (at most three), never all 29, to keep the prompt small and the choice meaningful.
6. **Two entries for import and export, not one**: `backup-and-restore` (Settings → Vault → Portable Backup) and `archive-import` (the `/import` page), each with a workflow that says what the other one is for. Phase A has no export of notes or entities beyond backup and publishing; the entries say so.
7. **Evaluation gets a `split` field** (`tune` or `holdout`). Thresholds and the floor are chosen on `tune` only; CI asserts both. The held-out set is never used to pick values.
8. **Knowledge ships inside the Worker bundle, so merging needs a Worker redeploy** (manual, real database ID, as for #3609) before staging shows the new answers. This is the cost #3620 (D1 + Vectorize) would remove; noted, not changed.

## Source changes

```text
packages/help-engine/
├── src/context/index.ts                    # +areas canvas/map/import/settings; Settings tab ids; area↔tab refinement
├── src/actions/catalogue.ts                # +destinations canvas/map/import; +settings panel ids; GeneratorId from generated list
├── src/actions/validate.ts                 # settings panels (in-vault, not guest); any listed generator
├── src/registry/generators.generated.ts    # NEW generated: 29 × {id, label, description}
├── src/registry/features/{canvas,entity-editing,vtt-map,backup-and-restore,archive-import}.ts   # NEW
├── src/registry/features/{campaign-generator,index}.ts   # generator entry extended; registry list
├── src/bundle/build.ts                     # one chunk per generator; generator action refs
├── src/retrieval/text.ts                   # small synonym additions only if the eval shows a need
└── tests/…                                 # context, actions, registry, bundle, generators, eval split
scripts/sync-help-generators.ts             # NEW repo script
apps/workers/oracle-proxy/src/help-metrics.ts  # metric areas cover the new areas (+ drift test)
apps/web/src/lib/
├── stores/help-assistant/help-context.svelte.ts  # areas, Settings tab, available settings panels, generator flag
├── stores/help-assistant/help-runtime.ts         # destination paths for canvas/map/import
├── services/help-assistant/help-action-runner.ts # settings panels, generator by id
├── content/help/{export-and-backup,creating-and-editing-entities}.md   # NEW
└── content/help/…test                            # drift test: generated list vs generator registry
```

## Work breakdown (test first; each group is a commit)

**Commit 1: screen description and actions (engine)**

1. Tests then implementation for new areas, Settings tab ids and the area↔tab refinement; key set unchanged.
2. Tests then implementation for new destinations, Settings panels (valid in-vault, not guest), and generator IDs from a list; `then` chaining and the five-type allow-list unchanged.

**Commit 2: generators** 3. `scripts/sync-help-generators.ts` and the generated module (29 entries). 4. Drift test in web: generated list equals `listGenerators()`, ids, labels and descriptions. 5. Bundle: one chunk per generator, per-generator open-action refs; test that retrieving "quest" offers the quest generator and at most three are offered.

**Commit 3: registry entries and documentation** 6. Write `export-and-backup.md` and `creating-and-editing-entities.md` from `VaultBackupSettings`, the entity create/edit flow and the entity detail components (read them first; do not write from memory). 7. Registry entries: canvas, entity-editing, vtt-map, backup-and-restore, archive-import, generators; validator passes against real articles.

**Commit 4: web wiring** 8. Context store: areas, Settings tab from the modal state, available Settings panels, generator flag in guest or not-ready vaults; tests incl. precedence and privacy request shape. 9. Runtime and runner: destination paths, `openSettings(tab)`, `openGeneratorWorkflow(id)`; extend the no-vault-mutation test to every new step. 10. Worker metric areas plus a test that every screen area is a valid metric area.

**Commit 5: evaluation and tuning** 11. Add the `split` field and per-split reporting; CI asserts recall and refusal on both. 12. Write 48+ new in-scope questions (8 per area), 12+ confusion questions (import vs generate vs restore backup; canvas vs graph vs map; export backup vs publish), and out-of-scope cases to reach 25+; at least 30% held out. 13. Run it; tune the floor and any synonyms on `tune` only; record both splits' numbers. If a threshold cannot be met, change the knowledge or the retrieval, not the threshold, and report what moved.

**Commit 6: docs and rollout** 14. Update the #3427 contracts and an addendum to `findings.md` (areas, settings tab, generator list, numbers). 15. After merge: rebuild the bundle, deploy the Worker with the real D1 ID, then check on staging.

## Adjustments after review

Found on a second read of the plan against the code:

- **An existing bug to fix here (R5).** The `generators` flag is computed from `isVaultReadyForGenerators(vault)` alone, but the workflow itself refuses to open in guest mode (`canOpenGenerators` is `!isGuestMode && ready`). In a guest vault the assistant can offer an "open the generator" guide that silently does nothing. The flag must use the same condition as the workflow, with a test.
- **Settings guides in guest mode.** Offered only when not in guest mode, using the same session-mode source; a negative test.
- **Settings is not a route.** The registry entries that live in Settings use route `/(app)` (the modal opens over any screen) and `areas: ["settings"]`, and name their tab in `tabs`.
- **Bundle size is asserted, not assumed.** A test fails if the bundle passes 600 KB (it is 141 KB now; the stated ceiling is about 1 MB), so growth from per-generator chunks cannot creep in.
- **Evaluation questions are written in a user's words, not the article's.** Questions copied from article phrasing inflate recall. Each area's questions mix wordings (including a misspelling or two and one-word queries) and are written before looking at what retrieval returns.
- **Tuning has a stop rule.** At most two tuning rounds on the `tune` split. If a threshold is still missed, the knowledge or retrieval is fixed and the miss reported; the threshold is not weakened and the held-out set is not used to choose values.
- **Commit 0** is this plan, so each later commit can be reviewed on its own.

## Risks

- **Retrieval confusion grows with coverage.** The floor had an 0.08 margin on 30 questions; more topics means more near-neighbours. Mitigated by the held-out split and the confusion set, with an explicit "fix the knowledge, not the threshold" rule.
- **Documentation accuracy.** The two new articles are the assistant's only source for export and entity editing; a wrong article becomes a confident wrong answer. They are written from the components and reviewed against them.
- **Prompt growth** from per-generator chunks: bundle size is checked (currently 140 KB, limit about 1 MB) and the candidate-action cap bounds the prompt.
- **Generated list going stale.** Covered by the drift test, which fails in CI rather than shipping stale data.
- **Settings over another screen.** The modal can open over canvas or an entity; precedence puts Settings first, and a test pins it.

## Not in this phase

Highlight targets and "Show me" guides for canvas, VTT, Settings and generators (phase B); the public marketing generator pages and the public `/answers` articles; mutating or proactive assistance; D1 + Vectorize; the Gemini fallback run; human review of live answers.

## Status after implementation

| #   | Result                                                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Met. Five new entries plus the generator chunks; the validator passes against the real articles.                                                                                                                                                                                |
| R2  | Met. Key set unchanged; strict-schema and privacy tests cover canvas, map, import and Settings.                                                                                                                                                                                 |
| R3  | Met. 29 generators from a generated list with a drift test; each is findable from its plain name.                                                                                                                                                                               |
| R4  | Met. Navigation to canvas, map, import; Settings tabs through `openPanel`; open a chosen generator; no highlight steps added.                                                                                                                                                   |
| R5  | Met. Settings panels and generators are not offered in a guest or not-ready vault. This also fixed a spike bug: the generators flag ignored guest mode.                                                                                                                         |
| R6  | Met. `export-and-backup` and `creating-and-editing-entities`, written from the components' labels.                                                                                                                                                                              |
| R7  | **Partly met.** 122 questions, 8+ per new area, 13 confusion questions, 29 out of scope, over 30% held out. recall@3 is **89% on tune and 75% on held-out, against a 90% target on each**. Unrelated questions are 100% refused; near-miss questions cannot be refused offline. |
| R8  | Met. Metric areas come from the engine's list, so they cannot drift.                                                                                                                                                                                                            |
| R9  | Met. Existing guard tests pass; the runner's no-mutation test now covers Settings and import.                                                                                                                                                                                   |
| R10 | Met. 96% on the spike's 24 questions, the same single miss as before (#3617), and 100% refusal of the spike's unrelated questions.                                                                                                                                              |

R7's gap, its causes and what was and was not tuned are in the phase A addendum of [`findings.md`](../3427-contextual-ai-help-assistant/findings.md).
