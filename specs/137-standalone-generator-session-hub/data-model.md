# Phase 1 Data Model: Standalone Generator Session Hub

All entities are **client-side, in-`sessionStorage`** state. None are persisted server-side. Types are TypeScript-shaped but framework-agnostic where they live in the `generator-engine` package; the live store wraps them with Svelte 5 runes.

## SessionEntity

A single generated result held in the current standalone session. Supersedes today's anonymous `SessionDraft` (which lacked an id, reuse flag, and order).

| Field          | Type                  | Notes                                                                                                                     |
| -------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `id`           | `string`              | Stable unique id (generated client-side). Primary key; enables duplicate titles and reliable provenance references.       |
| `type`         | `string`              | Entity/category type (`character`, `faction`, `settlement`/`location`, `item`, `event`, `note`, …). Drives the list icon. |
| `title`        | `string`              | Display title; also the token matched for provenance.                                                                     |
| `summary`      | `string \| undefined` | One-line summary when present.                                                                                            |
| `content`      | `string`              | Rich rendered body (review view).                                                                                         |
| `lore`         | `string \| undefined` | Vault-markdown body carried into save.                                                                                    |
| `labels`       | `string[]`            | Labels (never "tags", Principle XII).                                                                                     |
| `status`       | `"active" \| "draft"` | Carried from `GeneratorOutput`.                                                                                           |
| `reuseEnabled` | `boolean`             | Whether this entity is offered as context to future generations (FR-005/006/007). Default `true` (Decision 1).            |
| `pinned`       | `boolean`             | Optional. Force-keep in context when budgeting trims the set (FR-011). Default `false`.                                   |
| `createdOrder` | `number`              | Monotonic creation index; drives "Generated so far" ordering and recency-first budgeting.                                 |

**Validation / rules**:

- `id` unique within a session; `title` need not be unique.
- Adding a generated result that duplicates an existing `(type,title)` may dedupe or create a distinct id — existing code dedupes by case-insensitive title; preserve that default but key state by `id`.
- `reuseEnabled` is independently togglable and does NOT control list membership (an entity stays visible when paused).

## ContextSelection (derived)

Not stored; **derived** from the session each generation run.

- Input: all `SessionEntity` where `reuseEnabled === true`.
- Budgeting (FR-011): if the selection exceeds the bounded budget, keep all `pinned` first, then most-recent by `createdOrder`, up to the budget; mark the remainder as "not used this run".
- Output: the ordered list of entities offered to the generator as context, plus a `trimmed: boolean` flag for the UI notice.

## ProvenanceRecord

The per-result record of which session entities **actually** influenced a given generated result (FR-008/017/018). Immutable once written.

| Field              | Type       | Notes                                                                          |
| ------------------ | ---------- | ------------------------------------------------------------------------------ |
| `resultEntityId`   | `string`   | The `SessionEntity.id` this provenance describes (the newly generated one).    |
| `usedEntityIds`    | `string[]` | Ids of earlier session entities detected as used (subset of what was offered). |
| `offeredEntityIds` | `string[]` | Ids offered as context for this run (for debugging / "trimmed" explanation).   |
| `trimmed`          | `boolean`  | True when budgeting excluded some reuse-flagged entities from the offer.       |

**Rules**:

- A record is created for every generation. The UI shows a "Used: …" line **only when `usedEntityIds` is non-empty** (FR-010 — no empty/confusing provenance).
- Immutable with respect to later reuse-flag changes or edits (FR-017): toggling/pausing/removing an entity later does not rewrite past records.
- `usedEntityIds` entries are clickable to open/review the referenced entity (FR-018) — resolved via `id`, robust to duplicate titles.

## GeneratorSession (the store aggregate)

The live container (one per tab/browsing session), wrapping the collections above.

| Field        | Type                               | Notes                                 |
| ------------ | ---------------------------------- | ------------------------------------- |
| `entities`   | `SessionEntity[]`                  | Ordered by `createdOrder`.            |
| `provenance` | `Record<string, ProvenanceRecord>` | Keyed by `resultEntityId`.            |
| `nextOrder`  | `number`                           | Monotonic counter for `createdOrder`. |

**Persistence**: serialized to `sessionStorage` under `SESSION_DRAFTS_KEY` (with a versioned shape so older `SessionDraft[]` payloads can be migrated/upgraded on load). Graceful degradation to in-memory when storage is blocked.

**Lifetime**: single browsing session (FR-012). No cross-tab sync required.

## Relationships

```text
GeneratorSession 1───* SessionEntity
GeneratorSession 1───* ProvenanceRecord
ProvenanceRecord *───* SessionEntity   (via usedEntityIds / offeredEntityIds; by id)
ContextSelection  = filter(entities, reuseEnabled) |> budget()   (derived, not stored)
```

## Save / Import mapping (FR-014/015)

When saving to a vault, the selected `SessionEntity` subset maps onto the existing `ImportDraft` shape consumed by `SeoImportService`:

- `SessionEntity.{type,title,content,lore,labels,status}` → `ImportDraft` fields (already compatible with today's `SessionDraft`).
- Relationships among the saved subset (which entity _used_ which, per `ProvenanceRecord.usedEntityIds`) are emitted as connections for the import handler to create, scoped to entities present in the saved subset (FR-015). Entities referencing others not included in the subset simply omit those edges.

## Migration note

The existing persisted shape is `SessionDraft[]` (`{type,title,content,lore?,labels,status}`). On load, upgrade each to a `SessionEntity` by assigning an `id`, `createdOrder`, `reuseEnabled = true`, `pinned = false`. No provenance for pre-existing drafts (records only exist going forward).
