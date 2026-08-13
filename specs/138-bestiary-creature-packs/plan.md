# Implementation Plan: Bestiary & Creature Catalogue Packs

**Branch**: `138-bestiary-creature-packs` | **Date**: 2026-06-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/138-bestiary-creature-packs/spec.md`
**Source Issue**: [#1545](https://github.com/eserlan/Codex-Cryptica/issues/1545)

## Summary

Let users bootstrap a sparse vault by importing a curated pack of creatures. Ship one fantasy pack
(P1) as static, client-side content that is mapped into the **existing** importer preview/select
flow (`DiscoveredEntity[]` → `ReviewList` → vault write). No new import UI and no AI dependency for
the base flow. Pack content + the mapper live in a framework-free workspace package (Library-First);
the web app stays a thin UI layer that injects a pack into the importer's `review` step and exposes
an empty-vault call-to-action.

## Technical Context

**Language/Version**: TypeScript 6, Svelte 5 (Runes)
**Primary Dependencies**: `@codex/importer` (`DiscoveredEntity`), `vault` store, `ReviewList` /
`ImportSettings` (existing importer UI), Zod (existing import schemas)
**Storage**: Client-side vault (OPFS/Dexie); pack content bundled as static TS data (no network, no
server)
**Testing**: `bun test` for the new package; `vitest` for web component/unit tests
**Target Platform**: Browser (SvelteKit static), offline-capable, Lite/no-AI mode supported
**Project Type**: Monorepo — web app (`apps/web`) over workspace packages (`packages/*`)
**Performance Goals**: Inject + preview a 12–20 entry pack with no perceptible delay; zero AI calls in
the base flow
**Constraints**: Must work with AI disabled; must not flood the vault (preview + per-item selection);
imported origin tracked via Labels (not Tags)
**Scale/Scope**: 1 pack of ~12–20 creatures at launch; design supports N genre packs without import-
flow changes

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                  | Status   | Notes                                                                                                                                                                                                      |
| -------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Library-First           | ✅       | Pack content + `packToDiscoveredEntities` mapper live in a standalone package; web app is a thin injector.                                                                                                 |
| II. TDD                    | ✅       | Red-Green-Refactor for pack integrity + mapper (type, labels, match detection). Tests precede impl.                                                                                                        |
| III. Simplicity & YAGNI    | ✅       | Reuses the existing import rail; only fantasy pack now (P2–P4 deferred). No new catalogue UI.                                                                                                              |
| IV. AI-First Extraction    | ✅ (N/A) | Packs are already-structured curated data; no extraction needed. AI adaptation is a deferred P3 enhancement, not a base dependency.                                                                        |
| V. Privacy / Client-Side   | ✅       | Static bundled content, all processing client-side.                                                                                                                                                        |
| VI. Clean Implementation   | ✅       | STYLE*GUIDE, `*`-prefixed unused, `bun run lint`+`bun run test` before done.                                                                                                                               |
| VII. User Documentation    | ✅       | Add a help article to `help-content.ts` (task).                                                                                                                                                            |
| VIII. Dependency Injection | ✅       | The package exposes **pure functions** (registry/mapper), not services/stores, so the class+singleton DI rule does not apply; the vault lookup is still passed in as an argument (no hidden store access). |
| IX. Natural Language       | ✅       | User-facing label is "Creature Packs" / "Populate Vault" (approachable); "bestiary" stays an internal code name.                                                                                           |
| X. Quality & Coverage      | ✅       | New package logic meets the 70% goal.                                                                                                                                                                      |
| XI. Karpathy Rules         | ✅       | Surgical: widen one union + one `mapType` line, add one package, one importer section, one CTA.                                                                                                            |
| XII. Labels Over Tags      | ✅       | Pack origin recorded as a **Label** (e.g. `creature-pack`) via `frontmatter.labels`, never a "tag".                                                                                                        |

**Result**: PASS — no violations; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/138-bestiary-creature-packs/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── content-packs-api.md
│   └── import-integration.md
├── checklists/
│   └── requirements.md  # from /speckit-specify
└── tasks.md             # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
packages/content-packs/                     # NEW — framework-free pack content + mapper (Library-First)
├── src/
│   ├── index.ts                            # public exports
│   ├── types.ts                            # CreaturePack, CreaturePackEntry
│   ├── packs/
│   │   └── fantasy-bestiary.ts             # P1 curated fantasy pack data
│   ├── creature-pack-registry.ts           # listPacks(), getPack(id)
│   └── pack-to-discovered.ts               # packToDiscoveredEntities(pack, existingTitles)
├── tests/
│   ├── fantasy-bestiary.test.ts            # pack integrity
│   └── pack-to-discovered.test.ts          # mapper: type=creature, labels, match detection
└── package.json

apps/web/src/
├── lib/components/settings/ImportSettings.svelte   # MOD — "Creature Packs" section in upload step;
│                                                   #       inject pack → step="review"; mapType += creature
├── lib/components/ui/EmptyState.svelte             # MOD — add optional secondaryCta / onSecondaryCta
├── lib/components/GraphView.svelte                 # MOD — "Populate with a pack" secondary CTA on the
│                                                   #       empty-vault EmptyState (graph-empty-state)
└── lib/config/help-content.ts                       # MOD — help article (Constitution VII)

packages/importer/src/
└── types.ts                                # MOD — DiscoveredEntity.suggestedType += "Creature"
```

**Structure Decision**: New workspace package `@codex/content-packs` owns all curated content and the
pure mapper, satisfying Library-First and keeping the data unit-testable without the UI. The web app
changes are thin: widen the import rail to express `creature` (option A from design review), add a
"Creature Packs" section to the existing importer, and an empty-vault CTA. The importer's
preview/select/write path is reused unchanged.

## Complexity Tracking

> No constitution violations — section intentionally empty.
