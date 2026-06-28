# Phase 1 Data Model: Generic CC Import Format and Import Engine

All types below are the **import-side** model (pre-vault). They are plain serialisable data validated with `zod`. The vault-side targets (`Entity`, `Connection`) are the existing `@codex/schema` types and are not redefined here.

## CCImportPackage

The shared artifact every adapter emits; the contract between adapters and the engine.

| Field                | Type                              | Rules                                                                                                                   |
| -------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `version`            | string (semver-ish, e.g. `"1.0"`) | Required. Engine accepts a known set; unknown → reject (FR-006).                                                        |
| `sourceSystem`       | string                            | Required, non-empty. Machine id, e.g. `kanka`, `worldanvil`, `markdown`. Used as the `<system>` segment of source refs. |
| `sourceLabel`        | string                            | Required, non-empty. Human-readable, e.g. "Kanka — Tales of Avaris".                                                    |
| `entityDrafts`       | `EntityDraft[]`                   | Default `[]`. May be empty (empty preview is valid).                                                                    |
| `relationshipDrafts` | `RelationshipDraft[]`             | Default `[]`.                                                                                                           |
| `assetDrafts`        | `AssetDraft[]`                    | Default `[]`.                                                                                                           |
| `warnings`           | `ImportWarning[]`                 | Default `[]`. Adapter-supplied warnings carried through to the report (FR-008).                                         |

Package-level validation also flags: duplicate `sourceId` within `entityDrafts` (warning, not fatal — edge case), and any attempt to carry a direct-write/mutation directive (reject — FR-028).

## EntityDraft

| Field        | Type                                 | Rules                                                                                                                |
| ------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `sourceId`   | string \| undefined                  | At least one of `sourceId` / `sourcePath` required. Stable within the source system.                                 |
| `sourcePath` | string \| undefined                  | Folder/page path for path-based sources.                                                                             |
| `sourceType` | string \| undefined                  | Declared source type, e.g. `Character`, `Location`. Drives deterministic mapping (FR-009). Absent → fallback `note`. |
| `title`      | string                               | Required, non-empty (after trim).                                                                                    |
| `content`    | string                               | Default `""`. Markdown body → `Entity.content`.                                                                      |
| `lore`       | string \| undefined                  | → `Entity.lore`.                                                                                                     |
| `tags`       | string[]                             | Default `[]`. → `Entity.tags`.                                                                                       |
| `metadata`   | record<string, unknown> \| undefined | Source attributes preserved; mapped onto entity fields where deterministic, otherwise retained for review.           |
| `parentRef`  | string \| undefined                  | Source id/path of a parent draft (hierarchy hint).                                                                   |

Derived at map time (not authored): the **source reference** string `"<sourceSystem>:<sourceType|item>:<sourceId>"` (or `:path:<sourcePath>`), written to `Entity.discoverySource`.

## RelationshipDraft

| Field     | Type                | Rules                                                                                        |
| --------- | ------------------- | -------------------------------------------------------------------------------------------- |
| `fromRef` | string              | Required. Source id/path of the source endpoint.                                             |
| `toRef`   | string              | Required. Source id/path of the target endpoint.                                             |
| `type`    | string              | Default `related_to`. Maps to `Connection.type` (free-string allowed by `ConnectionSchema`). |
| `label`   | string \| undefined | → `Connection.label`.                                                                        |

Resolution (FR-013): match `fromRef`/`toRef` first against in-package drafts' `sourceId`/`sourcePath`, then against existing vault entities by `discoverySource`. Written one-directionally on the `from` entity only (FR-016a). Self-reference (`fromRef === toRef`) or an endpoint that resolves to an ignored/skipped/uncreated entity → **UnresolvedReference**, no connection written.

## AssetDraft

| Field          | Type                            | Rules                                                                                                                            |
| -------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | string                          | Required, unique within package.                                                                                                 |
| `bytes`        | Blob \| Uint8Array \| undefined | The asset data. Missing → skipped with warning.                                                                                  |
| `originalName` | string                          | Required.                                                                                                                        |
| `mimeType`     | string                          | Required.                                                                                                                        |
| `placementRef` | string                          | Links the asset to the entity/content that uses it (e.g. `image1.png` referenced in a draft's content, or an entity `sourceId`). |

Size guard: bytes over the configured cap (default 25 MB) → skipped with warning (FR-004 + edge case).

## ImportWarning

| Field     | Type                | Rules                                                                                |
| --------- | ------------------- | ------------------------------------------------------------------------------------ |
| `code`    | string              | Stable machine code, e.g. `DUPLICATE_SOURCE_ID`, `ASSET_TOO_LARGE`, `TYPE_FALLBACK`. |
| `message` | string              | Human-readable, natural-language (Principle IX).                                     |
| `ref`     | string \| undefined | Offending draft id/sourceId for traceability.                                        |

## ImportSession (engine working state, client-side, pre-commit)

Produced by `engine.prepare(pkg)`. Curatable; not persisted to the vault until commit.

| Field                          | Type                    | Notes                                                    |
| ------------------------------ | ----------------------- | -------------------------------------------------------- |
| `id`                           | string                  | Session UUID.                                            |
| `sourceSystem` / `sourceLabel` | string                  | Echoed from package.                                     |
| `items`                        | `PreviewItem[]`         | One per entity draft, with resolution/match annotations. |
| `relationships`                | `PreviewRelationship[]` | Resolved / unresolved status per relationship.           |
| `assets`                       | `PreviewAsset[]`        | Eligible / skipped (with reason).                        |
| `warnings`                     | `ImportWarning[]`       | Carried + engine-generated.                              |

### PreviewItem

| Field          | Type                                                                                     | Notes                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `draft`        | EntityDraft                                                                              | The source draft.                                                                          |
| `resolvedType` | string                                                                                   | Mapped entity type; `note` if fallback.                                                    |
| `typeFallback` | boolean                                                                                  | True when no rule matched (FR-019 flag).                                                   |
| `sourceRef`    | string                                                                                   | The `discoverySource` value to be written.                                                 |
| `match`        | `{ entityId: string } \| null`                                                           | Existing vault entity matched by source ref (FR-019).                                      |
| `decision`     | `"include" \| "ignore"` (default include) + for matches `"skip" \| "create" \| "update"` | User curation (FR-018, FR-021). Default for a match is no destructive action until chosen. |

### PreviewRelationship

| Field    | Type                         | Notes                                                        |
| -------- | ---------------------------- | ------------------------------------------------------------ |
| `draft`  | RelationshipDraft            | Source draft.                                                |
| `status` | `"resolved" \| "unresolved"` | Per FR-015.                                                  |
| `reason` | string \| undefined          | Why unresolved (missing target, endpoint ignored, self-ref). |

## ImportReport (post-commit)

Produced by `engine.commit(session)`. Totals MUST reconcile (SC-007).

| Field                          | Type                                 | Notes                                       |
| ------------------------------ | ------------------------------------ | ------------------------------------------- |
| `sourceSystem` / `sourceLabel` | string                               | Provenance.                                 |
| `committedAt`                  | number (epoch ms)                    | Report-only timestamp (not entity content). |
| `entitiesCreated`              | number                               |                                             |
| `entitiesUpdated`              | number                               |                                             |
| `itemsSkipped`                 | number                               | Ignored or user-skipped.                    |
| `relationshipsCreated`         | number                               |                                             |
| `unresolvedReferences`         | `{ fromRef, toRef, type, reason }[]` | FR-015/025.                                 |
| `assetsImported`               | number                               |                                             |
| `assetsSkipped`                | `{ id, reason }[]`                   | Missing bytes / too large.                  |
| `typeFallbacks`                | `{ sourceRef, sourceType }[]`        | FR-010/019.                                 |
| `warnings`                     | `ImportWarning[]`                    | All carried + generated.                    |
| `failures`                     | `{ ref, stage, message }[]`          | Per-item commit failures (FR-026).          |

Reconciliation invariant: `entitiesCreated + entitiesUpdated + itemsSkipped + failures(entity-stage) === entityDrafts.length`.

## MappingRuleSet (engine input, deterministic)

| Field         | Type                                                                         | Notes                                            |
| ------------- | ---------------------------------------------------------------------------- | ------------------------------------------------ |
| `rules`       | `{ when: { sourceType?: string; pathPrefix?: string }, thenType: string }[]` | Evaluated in order; first match wins.            |
| `defaultType` | string                                                                       | `"note"`. Applied when no rule matches (FR-010). |

Rules are pure data, supplied per import (adapters define their defaults in their own subissues). No rule → everything maps to `defaultType`.
