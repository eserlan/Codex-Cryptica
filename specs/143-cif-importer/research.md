# Research: CIF Mechanical Importer, Phase 1 (143)

All Technical Context unknowns resolved. Decisions reference the current codebase (verified 2026-07-16 on branch `143-cif-importer`) and the published contract (`docs/CODEX_INTERCHANGE_FORMAT.md`, `schemas/cif/1.0/manifest.schema.json`).

## Decision 1: Extend the existing CC pipeline; CIF is an adapter, not a new engine

- **Decision**: `packages/importer/src/cif/` produces a `CCImportPackage`; review and commit run through the existing `ImportEngine`. No parallel import pipeline.
- **Rationale**: The engine already implements almost everything the spec's US1/US3 need — source-ref matching in `prepare()`, create/update/skip decisions, entities-before-relationships commit, _matched-skip registers the existing entity id so links to it still resolve_ (exactly the FR-008 clarification), self-link rejection at commit, `AbortSignal`, progress callbacks, and failure buckets in `ImportReport`. Rebuilding any of that would violate Constitution III.
- **Alternatives considered**: A standalone CIF engine — rejected (duplicates ~500 lines of battle-tested commit logic). Extending `chronica.ts`-style single-file adapter — rejected: CIF is a public multi-file contract (schema, cross-record validation, its own report vocabulary) and warrants its own directory.

## Decision 2: zod schemas, parity-tested against the published JSON Schema

- **Decision**: `cif/package.ts` defines zod schemas mirroring `manifest.schema.json`; a test asserts the published `valid-text-only.cif.json` parses and `invalid-missing-entity-title.cif.json` fails with the documented reason.
- **Rationale**: zod is the repo-wide validation standard (`cc/package.ts`, `schema` package); adding a JSON-Schema runtime (ajv) is a new dependency for no user-visible gain. The parity test pins the zod schemas to the public contract so they cannot drift silently — the fixtures are the shared source of truth.
- **Alternatives considered**: ajv against the schema file directly — rejected (new dependency, worse error messages for FR-003's plain-language requirement, and cross-record rules need code anyway). Hand-rolled validation — rejected (zod gives structured paths for error reporting).

## Decision 3: Source-ref encoding — injective, kind-independent

- **Decision**: New optional `ImportEngineOptions.sourceRefBuilder(sourceSystem, draft)`. CIF supplies one producing `cif:entity:<e(system)>:<e(worldKey)>:<e(key)>` with `e = encodeURIComponent`; a missing `worldKey` becomes an empty component (schema forbids empty _present_ keys, so empty is unambiguous) plus the clarified review warning.
- **Rationale**: The existing `buildEntitySourceRef` embeds `draft.sourceType` — for CIF that is the _kind_, and the spec (clarified) requires kind changes to be informational, not identity-breaking. Percent-encoding makes the mapping injective (`:` and `%` cannot be forged inside components), satisfying FR-014, while staying `parseSourceRef`-compatible (it already rejoins trailing segments).
- **Alternatives considered**: Hashing the identity tuple — injective but opaque in reports/debugging; rejected. Reusing `buildEntitySourceRef` with `sourceType: "entity"` hardcoded in drafts — rejected: `sourceType` must carry the CIF kind for mapping rules and kind-change detection.

## Decision 4: Disable the writer's title fallback on the CIF path

- **Decision**: `WebVaultWriter` gains a constructor option (`titleFallback: boolean`, default `true`); the CIF flow constructs its writer with `false`.
- **Rationale**: `findBySourceRef` currently falls back to title / sanitized-id matching (`web-vault-writer.ts:74–83`) — useful for legacy chronica/scabard re-imports but a direct FR-014 violation for CIF ("matching MUST never use titles"; US3 requires rename-safety, and a title fallback would _mis-match_ renamed entities to unrelated same-titled ones).
- **Alternatives considered**: Removing the fallback globally — rejected: would silently change chronica/scabard re-import behavior (Karpathy rule 3).

## Decision 5: Update semantics — `getEntityFields` port + per-adapter update policy

- **Decision**: (a) New optional port `VaultWriter.getEntityFields(id)` returning the matched entity's current comparable fields (title, content, lore, labels, parent, type, dates). (b) `prepare()` snapshots the result onto `PreviewItem.existing` — this powers the FR-015 review diff. (c) A new `ImportEngineOptions.updatePolicy` (default `"replace-all"` = today's behavior) with CIF using `"cif"` policy: prose/scalars replaced; `labels` = union(existing, package); `type` omitted from the patch entirely (category preserved; changed kind → informational report entry); `parent` included only when the package provides one.
- **Rationale**: The engine's current update patch overwrites `type`, `labels`, and `parent` wholesale (`engine.ts:242–253`) — that contradicts FR-016 (category never changed, labels additive) and would stomp the Q1 "re-categorize after import" workflow on every re-import. The union and the diff both need current field values, which only the writer can supply; one optional port serves both. Defaults keep chronica/scabard byte-identical.
- **Alternatives considered**: Writer-side merge flag — rejected: splits update semantics across layers and the review diff still needs the values in the session. Storing a last-import snapshot for three-way merge — explicitly deferred by the spec (provenance storage, outset decision #6).

## Decision 6: Field mapping (summary/body/kind/labels/aliases)

- **Decision**: CIF `summary` → `EntityDraft.content` (the vault's player-facing short description), CIF `content.body` → `EntityDraft.lore` (long-form). CIF `kind` → `sourceType`, consumed by the existing `MappingRuleSet` with built-in rules for the documented kinds (`character`, `location`, `faction`, `event`, `item`, `creature`, `document`, `note`) and `defaultType: "note"` for everything else (`typeFallback: true` drives the FR-011 warning — the existing mechanism). CIF `labels` → `labels` (deduped); `aliases` → the entity's aliases via draft metadata → writer mapping; legacy `tags` stays empty (Constitution XII).
- **Rationale**: Matches the clarified two-field mapping (Q3) and the existing `mapDraftToType`/`typeFallback` machinery — FR-011 falls out of code that already exists (`DEFAULT_MAPPING_RULES.defaultType` is already `"note"`, matching Q5 exactly).

## Decision 7: Dates

- **Decision**: Add optional `startDate`/`endDate` (`{ year, month?, day?, precision }`) to `EntityDraft`, `NewEntityInput`, and `EntityPatch`; the web writer maps them to the vault's temporal metadata at the precision it supports (year guaranteed; finer precision passed through where the schema allows). CIF date precision the vault cannot hold → `cif.date-precision` fidelity warning per entity (FR-010).
- **Rationale**: `NewEntityInput` currently has no date fields, so CIF core `dates` would otherwise be silently dropped — an FR-017 violation. The vault's `DateSelection`/legacy temporal shapes are numeric-year-based; the writer owns the final representation so the library stays schema-agnostic.
- **Alternatives considered**: Stuffing dates into `metadata` — rejected: invisible to the timeline features, which is silent loss in spirit.

## Decision 8: Cross-record validation algorithm

- **Decision**: `cif/validate.ts` builds key maps once (entity keys, relationship keys, asset keys), then checks in O(records): duplicate keys; every `parent`, `from`, `to`, `media.assetKey` resolves; `from !== to`; hierarchy acyclicity via iterative parent-chain walk with a visited set (cycle → error naming the member keys); `format`/`version` support. Errors carry `{ code, message, recordKey }` for FR-003's plain-language reporting.
- **Rationale**: Single-pass maps keep SC-006 comfortably (1,000 entities ≪ 5 s); iterative walk avoids recursion limits on deep hierarchies (same reasoning as the lineage engine's traversal).

## Decision 9: Container handling & size guard

- **Decision**: `cif/parse.ts` takes `{ fileName, size, text() }`-shaped input: rejects `.cif.zip` (and ZIP magic bytes) with the FR-004 message; rejects files over a `maxManifestBytes` option (default 20 MB) _before_ reading/parsing; otherwise `JSON.parse` with a friendly wrapper on syntax errors. Non-empty `assets` in a text-only manifest → `cif.assets-not-imported` warning, import proceeds (FR-004).
- **Rationale**: Size-check-before-parse is the cheap half of the outset's zip-bomb posture that applies to text too; 20 MB of JSON text is far beyond any realistic 1,000-entity world while still parsing in well under a second. No streaming parser — YAGNI (Constitution III), revisit only if SC-006 fails on real data.

## Decision 10: Duplicate-relationship reporting

- **Decision**: `appendConnection` (already idempotent on target+type+label) returns `{ created: boolean }`; the engine counts `created: false` into a new `report.duplicatesSkipped` bucket, and `cif/normalize.ts` also dedupes identical records _within_ the package before staging (with a `cif.duplicate-relationship` warning).
- **Rationale**: FR-013 requires "already present" be _reported_, not just avoided; in-package dedupe keeps the review counts honest.

## Decision 11: UI integration & report surface

- **Decision**: `import-settings-controller.svelte.ts` detects CIF before the chronica/scabard checks (filename `.cif.json`/`.cif.zip`, or parsed JSON with `format === "codex-world-interchange"`), routes to `parseCifFile` → `normalizeCifPackage` → existing engine `prepare()`; the review modal shows the world title/description (from `sourceLabel`/session warnings) and, for matched items, a compact current-vs-package diff from `PreviewItem.existing`; the final report view renders the new warning buckets. Guest sessions never reach the flow (existing import gating, FR-019).
- **Rationale**: The controller already owns multi-format detection and locked-mode messaging; CIF slots in as the first, most-specific check. Review/report components are reused with additive props only (SC-006's responsiveness comes from the library, not the UI).

## Decision 12: Family-alias interaction (documentation, not code)

- **Decision**: No special handling — CIF relationships committed via `vault.addConnection` participate in #1721's family-alias normalization (a character→character link labeled "mother of" becomes a real reciprocal family link with cycle protection).
- **Rationale**: This is the app's now-standard behavior for _all_ connection creation surfaces; exempting CIF would reintroduce the inconsistency #1720 fixed. Noted in the help entry so it isn't surprising.

## Resolved unknowns

| Unknown                                    | Resolution                                                                                                       |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Source-ref encoding & escaping (outset #1) | `cif:entity:` + percent-encoded components via `sourceRefBuilder` (Decision 3)                                   |
| `summary` storage (outset #2)              | `content` field (short description); body → `lore` (Decision 6, clarified)                                       |
| Parent resolution (outset #3)              | Engine's existing committedIds resolution; patch includes parent only when present (Decisions 1, 5)              |
| Update reconciliation (outset #6)          | `updatePolicy: "cif"` — replace scalars, union labels, preserve category, add-only links (Decision 5, clarified) |
| Modules/fidelity (outset #8)               | Deferred; core dates via new draft fields with warnings (Decision 7)                                             |
| Manifest size limit                        | 20 MB library default, app-configurable (Decision 9)                                                             |
| Unknown-kind fallback                      | Existing `defaultType: "note"` + `typeFallback` warning (Decision 6, clarified Q1/Q5)                            |
