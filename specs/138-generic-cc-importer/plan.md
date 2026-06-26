# Implementation Plan: Generic CC Import Format and Import Engine

**Branch**: `138-generic-cc-importer` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/138-generic-cc-importer/spec.md`

## Summary

Define a versioned, plain-data **CC import package** (the shared intermediate format every mechanical source adapter targets) and a **deterministic import engine** that validates a package, applies deterministic type mapping, resolves explicit links by exact source-id match, produces a curatable preview, commits approved drafts into the vault through an injected writer port, and emits an import report. No AI calls, no prose inference, no fuzzy duplicate merging.

Technical approach: ship as a new `cc/` module inside the existing `@codex/importer` package (alongside the Oracle path, not replacing it). Use `zod` for the package schema and validation, reuse `@codex/schema` (`EntitySchema`, `ConnectionSchema`, `discoverySource`) for the vault-facing model, and keep the engine fully decoupled from the web layer behind a `VaultWriter` port injected per the project's DI principle. All processing is client-side.

## Technical Context

**Language/Version**: TypeScript (strict, ES modules), targeting the browser and Bun for tests
**Primary Dependencies**: `zod` (package schema + validation), `@codex/schema` (Entity/Connection models), existing `@codex/importer` utilities; no new runtime deps
**Storage**: No new storage. Commit goes through an injected `VaultWriter` port; production binding is the existing OPFS-backed `VaultRepository` (`packages/vault-engine`) via the web vault store. Assets route through the existing `AssetManager`.
**Testing**: `vitest` / `bun test` (matches `@codex/importer` today)
**Target Platform**: Client-side (browser); WASM-free, no network
**Project Type**: Library package (`packages/importer`) with a thin web UI layer added later under `apps/web`
**Performance Goals**: Validate + map + resolve + preview a package of a few thousand drafts without blocking the UI thread perceptibly; commit streams progress per item
**Constraints**: No AI calls; no source data leaves the client; deterministic and repeatable output for identical input + mapping rules
**Scale/Scope**: This feature is the engine + format only. Source adapters (#1536–#1544) and the production preview UI are out of scope; a minimal harness/fixtures stand in for adapters in tests.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                   | Status                  | Notes                                                                                                                                                          |
| --------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Library-First            | ✅ PASS                 | Engine implemented in `packages/importer/src/cc/`; web app is a thin layer over it.                                                                            |
| II. Test-Driven Development | ✅ PASS                 | Red-Green-Refactor: schema/validation/mapping/resolution/commit each get failing tests first; fixtures replace adapters.                                       |
| III. Simplicity & YAGNI     | ✅ PASS                 | Reuse `zod` and existing entity/connection models; no new storage, no adapter abstractions beyond the package contract.                                        |
| IV. AI-First Extraction     | ⚠️ JUSTIFIED DIVERGENCE | This path is intentionally no-AI; it complements the Oracle importer, which is untouched. Recorded in Complexity Tracking and in the spec.                     |
| V. Privacy & Client-Side    | ✅ PASS                 | All processing client-side; no network or AI transmission.                                                                                                     |
| VI. Clean Implementation    | ✅ PASS                 | `bun run lint` + `bun run test` gate; `_`-prefix unused; full types.                                                                                           |
| VII. User Documentation     | ✅ PASS (planned)       | Help-content entry + FeatureHint deferred to the UI subissue; engine ships with `quickstart.md`. Tracked as a task, not a gate blocker for the engine package. |
| VIII. Dependency Injection  | ✅ PASS                 | Engine takes a `VaultWriter` port via constructor with a production default; exports class + singleton factory.                                                |
| IX. Natural Language        | ✅ PASS                 | User-facing report/preview wording uses plain terms ("Skipped", "Unresolved link", "Already in vault").                                                        |

**Result**: PASS with one justified divergence (IV), documented below.

## Project Structure

### Documentation (this feature)

```text
specs/138-generic-cc-importer/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── cc-import-package.md
│   ├── vault-writer-port.md
│   └── import-engine.md
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
packages/importer/
├── src/
│   ├── cc/                     # NEW — generic CC importer (this feature)
│   │   ├── package.ts          # Zod schemas + types: CCImportPackage, EntityDraft, RelationshipDraft, AssetDraft, Warning
│   │   ├── validate.ts         # validatePackage(): full error collection, version gate, contract checks
│   │   ├── mapping.ts          # deterministic source-type → entity-type mapping + rule config; `note` fallback
│   │   ├── resolve.ts          # exact-match link resolution (in-package, then vault by discoverySource)
│   │   ├── source-ref.ts       # build/parse `<system>:<type>:<id>` discoverySource refs
│   │   ├── session.ts          # ImportSession: per-item include/ignore + match decision (skip/create/update)
│   │   ├── engine.ts           # ImportEngine.prepare(pkg) → session; engine.commit(session) → report
│   │   ├── report.ts           # ImportReport types + builder
│   │   ├── ports.ts            # VaultWriter port interface (DI seam)
│   │   └── index.ts            # public surface for the cc module
│   └── index.ts                # re-export `./cc`
└── tests/
    └── cc/
        ├── fixtures/           # hand-written CC import packages (stand in for adapters)
        ├── validate.spec.ts
        ├── mapping.spec.ts
        ├── resolve.spec.ts
        ├── session.spec.ts
        ├── engine-commit.spec.ts
        └── report.spec.ts

apps/web/                       # OUT OF SCOPE for this feature (separate UI subissue)
└── src/lib/.../import/         # production VaultWriter binding + preview UI added later
```

**Structure Decision**: Extend the existing `@codex/importer` package with a self-contained `cc/` module rather than creating a new package. The Oracle path and the mechanical path are two faces of "importing", share file/utility helpers, and keeping them in one package honours Simplicity/YAGNI while preserving clear internal separation. The engine never imports from `apps/web`; the web app binds the `VaultWriter` port at runtime.

## Complexity Tracking

> Only the one constitutional divergence requires justification.

| Violation                                                                                    | Why Needed                                                                                                                                                                    | Simpler Alternative Rejected Because                                                                                                                                                        |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Divergence from Principle IV (AI-First Extraction) — this engine performs zero AI extraction | Epic #1534's core principle is deterministic, repeatable, no-AI import; AI inference would make imports non-repeatable and risk fabricating structure the source never stated | Using the Oracle path was rejected because it cannot guarantee determinism, exact source-id link resolution, or repeat-import idempotency; the two paths coexist and serve different inputs |
