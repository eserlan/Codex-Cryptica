# Implementation Plan: CIF Mechanical Importer — Phase 1, Text-Only Core

**Branch**: `143-cif-importer` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/143-cif-importer/spec.md`
**Source**: GitHub issue #1722

## Summary

Add a CIF adapter to the existing `@codex/importer` CC pipeline: pure parse → validate → normalize modules under `packages/importer/src/cif/` turn a `.cif.json` package into the existing `CCImportPackage`, which then flows through the already-shipped `ImportEngine` review/commit machinery (create/update/skip, entities-before-relationships, abort support). The web app's import controller gains CIF detection and a `.cif.zip` "not yet" message; the review UI gains a field diff for matched entities. Six small, backward-compatible CC-layer extensions carry the spec's identity and update semantics: a source-ref builder hook (kind-independent, injective identity), an update-patch policy (prose replace / labels union / category preserved), an optional `getEntityFields` port (diff display + merge computation), date/alias fields on drafts and ports, an `appendConnection` return value for duplicate reporting, and a writer flag disabling title-fallback matching on the CIF path.

## Technical Context

**Language/Version**: TypeScript 6.0.3 (repo-pinned, tsgo via `lint:types`), Svelte 5 (runes) for the thin UI layer
**Primary Dependencies**: `zod` (already the importer's validation library), existing `@codex/importer` CC core (`package.ts`, `engine.ts`, `session.ts`, `mapping.ts`, `source-ref.ts`, `report.ts`, `ports.ts`), `schema` workspace types, `schemas/cif/1.0/manifest.schema.json` + published example fixtures. **No new external dependencies.**
**Storage**: None new — imports write through the existing `WebVaultWriter` → vault store; CIF adds no persisted model (spec FR-012: derived staging only)
**Testing**: `bun test` for `packages/importer` (pure functions + fixtures), vitest for `apps/web` controller/UI tests; `bun run lint` + `bun run test` gates (Constitution VI.3)
**Target Platform**: Web, fully client-side (Constitution V); no network request in the import path (FR-018)
**Project Type**: Monorepo — `packages/importer` library + `apps/web` thin UI/adapter layer
**Performance Goals**: 1,000-entity manifest parses + validates in < 5 s with responsive UI (SC-006); validation is O(records) with prebuilt key maps
**Constraints**: Untrusted input end to end; manifest size guard (default 20 MB) rejects oversized files before parsing huge payloads; matching never by title (FR-014) — the writer's legacy title-fallback must be disabled on the CIF path
**Scale/Scope**: One new library module family (~5 source files + tests), 4 small backward-compatible CC-core extensions, controller detection + review-diff UI, help-content entry

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #    | Principle                | Status | Notes                                                                                                                                                                                                          |
| ---- | ------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I    | Library-First            | ✅     | All parsing/validation/normalization in `packages/importer/src/cif/`; the app only detects files, renders review, and supplies the vault writer.                                                               |
| II   | TDD                      | ✅     | Everything new in the library is a pure function over fixtures (including the published valid/invalid examples); tests written first per task plan.                                                            |
| III  | Simplicity & YAGNI / DRY | ✅     | Reuses `CCImportPackage`, `ImportEngine`, session, report, review UI, and `WebVaultWriter` wholesale; zod (existing) instead of adding a JSON-Schema runtime; CC-core extensions are options/ports, not forks. |
| IV   | AI-First Extraction      | N/A    | Explicitly a _mechanical_ importer; FR-018 forbids sending package content to the Oracle.                                                                                                                      |
| V    | Privacy & Client-Side    | ✅     | Fully client-side; no fetch in the import path; no content logging (FR-018).                                                                                                                                   |
| VI   | Clean Implementation     | ✅     | Svelte 5 runes in UI delta; `bun run lint`/`test` before completion.                                                                                                                                           |
| VII  | User Documentation       | ✅     | Help-content entry for CIF import planned (+ pointer to the public format doc).                                                                                                                                |
| VIII | Dependency Injection     | ✅     | Engine/writer already constructor-injected via ports; new capabilities added as optional ports/options with defaults.                                                                                          |
| IX   | Natural Language         | ✅     | Error copy is plain-language, names the record and rule ("Two entities share the key 'characters/lyra'").                                                                                                      |
| X    | Coverage                 | ✅     | New `cif/` modules target ≥ 70% on introduction (engine-level goal).                                                                                                                                           |
| XI   | Karpathy Rules           | ✅     | CC-core changes are surgical, optional, and default to current behavior so chronica/scabard paths are untouched.                                                                                               |
| XII  | Labels over Tags         | ✅     | CIF `labels` → `labels`; the legacy `tags` draft field stays empty; no public "tags" concept introduced.                                                                                                       |

**Gate result**: PASS — no violations; Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/143-cif-importer/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── cif-importer.md  # Library API + port-extension contract
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
packages/importer/src/
├── cif/
│   ├── package.ts           # NEW: zod schemas + public CIF types (mirrors published JSON Schema)
│   ├── parse.ts             # NEW: container handling — size guard, .cif.zip refusal, JSON parse
│   ├── validate.ts          # NEW: cross-record validation (keys, refs, self-links, cycles)
│   ├── normalize.ts         # NEW: CIF → CCImportPackage (+ source-ref builder, warnings)
│   ├── report.ts            # NEW: CIF warning codes/messages (unmapped kind, extensions, media, dates)
│   ├── index.ts             # NEW: public exports
│   └── *.test.ts            # NEW: unit tests incl. published-fixture parity
├── cc/
│   ├── package.ts           # MODIFIED: optional startDate/endDate on EntityDraft
│   ├── engine.ts            # MODIFIED: sourceRefBuilder option; update-patch policy; existing-field
│   │                        #           snapshot on PreviewItem; duplicate-connection reporting
│   ├── session.ts           # MODIFIED: PreviewItem gains optional `existing` field snapshot
│   ├── ports.ts             # MODIFIED: optional getEntityFields(); appendConnection → {created}
│   └── (mapping/report)     # MODIFIED: date fields pass-through; report gains duplicates bucket
└── index.ts                 # MODIFIED: export ./cif

apps/web/src/lib/
├── components/settings/
│   ├── import-settings-controller.svelte.ts  # MODIFIED: CIF detection (.cif.json / format field),
│   │                                          #           .cif.zip refusal, CIF engine wiring
│   └── (review component)                     # MODIFIED: field diff for matched items (FR-015)
├── features/importer/web-vault-writer.ts      # MODIFIED: getEntityFields impl; exact-match-only
│                                              #           flag disabling title fallback (FR-014)
└── config/help-content.ts                     # MODIFIED: CIF import help entry (Constitution VII)
```

**Structure Decision**: CIF is a sibling of the `chronica`/`scabard` adapters but promoted to its own directory (it is a public contract with its own schema, validation, and report vocabulary, not a single-file adapter). The CC core stays the single staging pipeline; every CC change is an optional extension defaulting to today's behavior.

## Design Decisions (summary — full rationale in research.md)

1. **Validation with zod, parity-tested against the published JSON Schema** — no ajv dependency; a fixture test imports both published examples (valid passes, invalid fails with the documented reason) so the zod schemas and the public contract cannot drift silently.
2. **Injective, kind-independent source refs**: `cif:entity:` + `encodeURIComponent`-escaped `system`/`worldKey`/`key` components via a new optional `ImportEngineOptions.sourceRefBuilder`. Missing `worldKey` → empty component + review warning (clarification Q2). Kind is deliberately excluded so a producer changing an entity's kind never breaks identity.
3. **Title-fallback matching disabled on the CIF path**: `WebVaultWriter` gains a constructor flag (`titleFallback: false` for CIF); chronica/scabard keep today's behavior. Without this, FR-014 ("never by title") is violated by the writer's existing fallback.
4. **Update semantics via engine policy + `getEntityFields` port** (FR-015/FR-016): a new optional port returns the matched entity's current fields; `prepare()` snapshots them onto `PreviewItem.existing` (powers the review diff), and commit builds the CIF update patch as: prose/scalars (title, summary field, body, dates) replaced; labels = union(existing, package); `type` never sent for CIF updates (category preserved; kind change → informational warning); `parent` replaced only when present in the package, never cleared by absence.
5. **Field mapping** (clarification Q3): CIF `summary` → draft `content` (player-facing short description), CIF `content.body` → draft `lore` (long-form). CIF `kind` → `sourceType` for mapping rules with `defaultType: "note"` (clarifications Q1/Q5 — matches the existing mapping default).
6. **Dates**: optional `startDate`/`endDate` added to `EntityDraft`/`NewEntityInput`/`EntityPatch`, mapped by the writer into the vault's temporal metadata at supported precision (year minimum); finer CIF precision than the vault can hold → fidelity warning (FR-010).
7. **Duplicate relationships**: `appendConnection` already no-ops on identical target+type+label; extend it to return `{ created: boolean }` so the engine can report "already present" (FR-013) instead of silently succeeding.
8. **Hierarchy cycles**: iterative parent-chain walk with a visited set during cross-record validation; cycles reject the package naming the member keys (spec edge case).
9. **Size guard**: reject files above a 20 MB manifest constant (library option, app passes it) _before_ parsing; large-but-valid manifests parse in one pass (no streaming — YAGNI at this scale, revisit if SC-006 fails).
10. **UI**: controller detects CIF by filename (`.cif.json`) or parsed `format === "codex-world-interchange"`, routes to the CIF engine path; `.cif.zip` gets the FR-004 refusal message; review reuses the existing modal with a new compact diff block for matched items; report reuses the existing report rendering with the new warning buckets.
11. **Alias interaction note**: committed connections go through `vault.addConnection`, which (since #1721) normalizes family-alias labels between characters into real family links — documented as intended behavior for CIF packages containing e.g. "mother of" relationships.

## Complexity Tracking

No constitution violations — table intentionally empty.
