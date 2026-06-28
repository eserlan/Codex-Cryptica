# Phase 0 Research: Generic CC Import Format and Import Engine

All Technical Context unknowns were resolvable from the existing codebase and the clarified spec; none remain marked NEEDS CLARIFICATION. Below are the decisions that shape the design.

## R1. Where the engine lives

- **Decision**: Add a `cc/` module inside the existing `@codex/importer` package; do not create a new package.
- **Rationale**: Library-First is already satisfied by `@codex/importer`. The mechanical path shares file/utility helpers with the Oracle path and is conceptually "importing". One package, two internal modules keeps the dependency graph and tooling (vitest, eslint, tsconfig) simple (YAGNI).
- **Alternatives considered**: A new `@codex/cc-importer` package — rejected as premature separation with duplicated build config and no consumer benefit. Putting logic in `apps/web` — rejected; violates Library-First and prevents headless testing.

## R2. Package format + validation library

- **Decision**: Model the CC import package with `zod` schemas; validation = `safeParse` with full issue collection.
- **Rationale**: `@codex/schema` already defines `EntitySchema`/`ConnectionSchema` with `zod`, so the vault-facing types and the import-facing types speak the same validation dialect. `zod` gives per-field error paths (satisfies FR-007 "surface every problem with context") and a single source of truth for the type and its runtime guard.
- **Alternatives considered**: Hand-rolled validators (more code, weaker error paths); JSON Schema + ajv (extra dep, not used elsewhere). Both rejected on Simplicity.

## R3. Vault commit boundary (decoupling)

- **Decision**: Define a `VaultWriter` port (interface) that the engine depends on; the web app injects a production implementation backed by the existing vault store (`VaultRepository.saveToDisk` / `AssetManager`). Engine exports a class plus a factory; tests inject an in-memory fake.
- **Rationale**: Constitution VIII (DI) and II (TDD). The engine must commit entities/connections/assets without importing `apps/web` or `@codex/vault-engine` directly, so it stays unit-testable and reusable. The port exposes only what the engine needs: `findBySourceRef`, `createEntity`, `updateEntity`, `saveAsset`.
- **Alternatives considered**: Engine imports `VaultRepository` directly — rejected; couples the package to the web persistence stack and OPFS, breaks headless tests. Returning a plain "actions" list for the caller to apply — rejected; would scatter the create-entities-before-connections ordering (FR-024) and partial-failure handling (FR-026) into every caller.

## R4. Source reference encoding (clarified)

- **Decision**: Store the durable source reference in the entity's existing `discoverySource` field as `"<system>:<type>:<id>"` (e.g. `kanka:character:12345`). A small helper builds and parses it.
- **Rationale**: Clarification Q3 = reuse `discoverySource`; no schema change. Exact-string match makes repeat-import detection (FR-011, FR-013, US3) a simple equality lookup. `path`-based sources (Markdown/Notion) encode as `"<system>:path:<encoded-path>"`.
- **Alternatives considered**: New structured `sourceRef` field — rejected per clarification (avoid schema churn). Storing in `metadata` — rejected; less discoverable and not the field's purpose.

## R5. Link resolution strategy (clarified)

- **Decision**: Two-stage exact match — (1) against `sourceId` of other drafts in the same package, (2) against existing vault entities by `discoverySource`. Resolved links are written one-directionally on the source entity only. Unmatched endpoints become unresolved-reference records.
- **Rationale**: Clarification Q2 = one-directional. FR-013/014/015. Determinism requires exact identifiers, never fuzzy/semantic matching. Two-stage ordering lets a single package be internally consistent and also link to prior imports.
- **Alternatives considered**: Bidirectional reciprocal writes — rejected per clarification (would invent reverse labels the source never gave). Title-based matching — rejected (non-deterministic, fuzzy).

## R6. Update semantics on re-import (clarified)

- **Decision**: When the user chooses "update" for a matched draft, overwrite only fields the draft supplies; preserve all other entity fields (image, art direction, soundbite, manual edits). Never auto-merge without the explicit per-item choice.
- **Rationale**: Clarification Q1 = field-level overwrite. FR-021/022. Protects user work the source doesn't own and keeps the operation predictable.
- **Alternatives considered**: Full replace (data loss for vault-only fields) and append-merge (unbounded content growth, can't correct source errors) — both rejected per clarification.

## R7. Commit ordering & partial-failure handling

- **Decision**: Commit in phases inside `engine.commit`: (1) resolve final entity ids for all included drafts (create/update), (2) then write connections referencing those ids, (3) then assets. Track per-item outcome; if an entity write fails, skip its dependent connections and record them as failed/unresolved rather than writing dangling links.
- **Rationale**: FR-024 (entities before connections) and FR-026 (no connections pointing at uncreated entities; per-item success/failure in the report).
- **Alternatives considered**: All-or-nothing transaction — rejected; the vault store has no multi-entity transaction primitive and a single bad draft shouldn't discard a large successful import. The report makes partial success explicit instead.

## R8. Asset handling & size cap (deferred default resolved)

- **Decision**: Asset drafts carry bytes/blob + name + MIME + placement ref; engine routes them through the injected writer's `saveAsset`. Apply a conservative per-asset size cap (default **25 MB**) — oversized or byte-less assets are skipped with a warning, not fatal (edge case). The cap is a named constant, configurable via engine options.
- **Rationale**: Spec edge case flagged "too large" without a number; 25 MB comfortably covers maps/portraits while bounding memory. Skipping (not failing) keeps the rest of the import intact.
- **Alternatives considered**: No cap — rejected (memory risk on client). Hard failure on oversize — rejected (one bad image shouldn't block an import).

## R9. Package transport into the engine (deferred default resolved)

- **Decision**: The engine accepts an in-memory `CCImportPackage` object (already-parsed). Reading a serialized package file (e.g. JSON on disk/upload) is the caller's/adapter's responsibility; the engine offers a `parsePackage(json: unknown)` helper that validates and returns the typed package or errors.
- **Rationale**: Keeps the engine pure and headless-testable; adapters already hold parsed data when they emit a package. The helper covers the "user uploads a `.ccpkg`/JSON" case without coupling the engine to File/OPFS APIs.
- **Alternatives considered**: Engine takes a `File`/stream — rejected; drags browser File APIs into a pure library and complicates tests.

## R10. Determinism guarantees

- **Decision**: No `Date.now()`/random in mapping or id derivation for the deterministic result; new entity ids are generated at commit time (allowed to be unique) but the _mapping_ (type, fields, source ref, connection targets) is a pure function of (package, rules, current vault state). Report timestamps are isolated to the report object, not to entity content.
- **Rationale**: SC-005 (identical input + rules ⇒ identical vault result). Entity identity differs across runs only by generated id, which is expected; everything content-bearing is pure.
- **Alternatives considered**: Deriving ids from source refs (deterministic ids) — attractive but rejected for now to avoid collision rules with non-import entities; revisit if needed. Documented as a possible future enhancement.
