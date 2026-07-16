# Data Model: CIF Mechanical Importer, Phase 1 (143)

No persisted data changes: the CIF package and everything derived from it are transient staging structures (spec FR-012 analogue — the vault's standard entities/connections remain the only store). Two existing structures gain optional fields, defaulting to today's behavior.

## CIF package types (new, `packages/importer/src/cif/package.ts` — zod-derived)

Mirrors `schemas/cif/1.0/manifest.schema.json`; the published examples are parity fixtures.

### `CifManifest`

| Field           | Type                        | Rules                                                                             |
| --------------- | --------------------------- | --------------------------------------------------------------------------------- |
| `format`        | `"codex-world-interchange"` | exact literal; anything else → not a CIF file                                     |
| `version`       | `string`                    | must be in `SUPPORTED_CIF_VERSIONS = ["1.0"]`; newer → FR-004/US2 version error   |
| `source`        | `CifSource`                 | required                                                                          |
| `world`         | `CifWorld`                  | required; `title` required                                                        |
| `entities`      | `CifEntity[]`               | may be empty (friendly empty-review state)                                        |
| `relationships` | `CifRelationship[]`         | optional/empty                                                                    |
| `assets`        | `CifAsset[]`                | Phase 1: non-empty → `cif.assets-not-imported` warning, records otherwise ignored |
| `extensions`    | `Record<string, unknown>`   | preserved-in-report only                                                          |

### `CifSource`

| Field        | Type                 | Notes                                                                     |
| ------------ | -------------------- | ------------------------------------------------------------------------- |
| `system`     | `string` (non-empty) | producing tool id; identity component                                     |
| `worldKey`   | `string?`            | identity component; absent → empty component + `cif.no-world-key` warning |
| `exportedAt` | `string?` (ISO 8601) | display only                                                              |

### `CifEntity`

| Field        | Type                                    | Maps to                                                               |
| ------------ | --------------------------------------- | --------------------------------------------------------------------- |
| `key`        | `string` (non-empty, package-unique)    | identity component; `EntityDraft.sourceId` carrier                    |
| `kind`       | `string` (non-empty)                    | `EntityDraft.sourceType` → mapping rules → category (`note` fallback) |
| `title`      | `string` (non-empty)                    | `EntityDraft.title`                                                   |
| `summary`    | `string?` (plain text)                  | `EntityDraft.content` (player-facing short description)               |
| `content`    | `{ format: "markdown", body: string }?` | `EntityDraft.lore` (long-form)                                        |
| `labels`     | `string[]?` (non-empty strings)         | `EntityDraft.labels` (deduped)                                        |
| `aliases`    | `string[]?`                             | writer-mapped to entity aliases                                       |
| `parent`     | `string?` (entity key)                  | `EntityDraft.parentRef` (resolved at commit)                          |
| `dates`      | `{ start?: CifDate, end?: CifDate }?`   | `EntityDraft.startDate/endDate` (new fields)                          |
| `media`      | `{ assetKey, role }[]?`                 | Phase 1: validated for resolvability, then warned + ignored           |
| `source`     | `{ id?, url? }?`                        | provenance display only                                               |
| `extensions` | `Record<string, unknown>?`              | reported as not understood                                            |

### `CifRelationship`

| Field        | Type                                    | Maps to                                             |
| ------------ | --------------------------------------- | --------------------------------------------------- |
| `key`        | `string?` (package-unique when present) | error reporting handle                              |
| `from`, `to` | `string` (entity keys; `from !== to`)   | `RelationshipDraft.fromRef/toRef` (source-ref form) |
| `kind`       | `string` (non-empty)                    | `RelationshipDraft.type`                            |
| `label`      | `string?`                               | `RelationshipDraft.label`                           |
| `directed`   | `boolean` (default `true`)              | `false` → two reciprocal `RelationshipDraft`s       |

### `CifDate`

`{ value: string, precision: "year" | "month" | "day" }` → parsed to `{ year, month?, day? }`; precision beyond the vault's representation → `cif.date-precision` warning.

### Validation error / warning shapes

- `CifValidationError { code, message, recordKey? }` — package-blocking (FR-003); codes: `malformed-json`, `not-cif`, `unsupported-version`, `duplicate-entity-key`, `duplicate-relationship-key`, `unresolved-parent`, `unresolved-endpoint`, `unresolved-asset-ref`, `self-link`, `hierarchy-cycle`, `oversized-manifest`, `zip-not-supported`.
- Warnings reuse `ImportWarning { code, message, ref }`; CIF codes: `cif.unmapped-kind`, `cif.unknown-extension`, `cif.assets-not-imported`, `cif.no-world-key`, `cif.duplicate-relationship`, `cif.date-precision`, `cif.kind-changed` (informational on update).

## CC core extensions (modified, backward-compatible)

### `EntityDraft` (+`NewEntityInput`, `EntityPatch`)

| New field               | Type                                              | Default | Notes                                                      |
| ----------------------- | ------------------------------------------------- | ------- | ---------------------------------------------------------- |
| `startDate` / `endDate` | `{ year: number; month?: number; day?: number }?` | absent  | Writer maps to vault temporal metadata; absent = untouched |
| `aliases`               | `string[]?`                                       | absent  | Writer maps to entity aliases                              |

### `ImportEngineOptions`

| New option         | Type                                              | Default                         | Notes                                      |
| ------------------ | ------------------------------------------------- | ------------------------------- | ------------------------------------------ |
| `sourceRefBuilder` | `(system: string, draft: EntityDraft) => string`? | existing `buildEntitySourceRef` | CIF passes the kind-independent builder    |
| `updatePolicy`     | `"replace-all" \| "cif"`                          | `"replace-all"`                 | `"cif"` = FR-016 field classes (see below) |

**`"cif"` update patch construction** (given `existing` from `getEntityFields`):

- replace: `title`, `content` (summary), `lore` (body), `startDate`/`endDate`
- union: `labels = dedupe([...existing.labels, ...draft.labels])`; same for `aliases`
- omit always: `type` (category preserved; if mapped kind ≠ existing type → `cif.kind-changed` warning)
- include only when the package provides one: `parent`
- never in patch: connections (add-only via phase-2 commit stage)

### `VaultWriter` port

| Change              | Signature                                                    | Notes                                                                                                              |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| New optional method | `getEntityFields(id): Promise<ExistingEntityFields \| null>` | `{ title, content, lore, labels, aliases, type, parent, startDate?, endDate? }` — powers review diff + union merge |
| Return type change  | `appendConnection(...): Promise<{ created: boolean }>`       | `false` = identical link already present → `report.duplicatesSkipped`                                              |

### `PreviewItem` (session)

| New field  | Type                    | Notes                                                                                                              |
| ---------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `existing` | `ExistingEntityFields?` | populated for matched items when the writer supports `getEntityFields`; renders the FR-015 current-vs-package diff |

### `ImportReport`

| New field           | Type                              | Notes                            |
| ------------------- | --------------------------------- | -------------------------------- |
| `duplicatesSkipped` | `Array<{ fromRef, toRef, type }>` | FR-013 "already present" entries |

### `WebVaultWriter` (app adapter)

| New option               | Default | Notes                                                                    |
| ------------------------ | ------- | ------------------------------------------------------------------------ |
| `titleFallback: boolean` | `true`  | CIF flow passes `false` → `findBySourceRef` is exact-match only (FR-014) |

## Identity derivation

```text
sourceRef = "cif:entity:" + e(source.system) + ":" + e(source.worldKey ?? "") + ":" + e(entity.key)
e = encodeURIComponent
```

- Injective: `:` and `%` cannot appear unescaped inside components (FR-014).
- Kind-independent: producer kind changes never break matching (clarified update semantics).
- Missing `worldKey` → empty middle component (schema forbids empty present keys, so unambiguous) + `cif.no-world-key` warning.
- `RelationshipDraft.fromRef/toRef` carry the same full sourceRef form, so the engine's `_resolveRef` finds them via `committedIds` (created/updated/matched-skipped entities alike — the FR-008 rule).

## State flow

```text
File → parse (size guard, zip refusal, JSON) → CifManifest
     → validate (structural + cross-record)   → errors? block (FR-003) : proceed
     → normalize (mapping, identity, dedupe)  → CCImportPackage (+ warnings)
     → ImportEngine.prepare()                 → CCImportSession (+ existing snapshots)
     → review (create/update/skip, diff, cancel = zero mutations)
     → ImportEngine.commit(signal)            → entities → connections → ImportReport
```
