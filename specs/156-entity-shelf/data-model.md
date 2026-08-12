# Phase 1 Data Model: Entity Shelf

**Feature**: 156-entity-shelf | **Date**: 2026-08-12

Two new IndexedDB object stores, neither vault-scoped. This is the one structural departure
from every other store in `CodexCryptica`: the shelf deliberately has no `vaultId` key and no
`by-vault` index, because being readable from every vault is the feature.

---

## Store: `shelf_entries`

**Key**: `id` (entry id, not entity id)
**Index**: `by-group` → `groupId`

One record is one snapshot of one entity, self-contained: after it is written, nothing it needs
lives anywhere else, and it survives its source vault being deleted (FR-005, FR-007, US3-3).

| Field                  | Type                           | Notes                                                                                                        |
| ---------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `id`                   | `string`                       | Entry identity. Fresh per shelving.                                                                          |
| `groupId`              | `string`                       | Shelving action that produced it (FR-008). A single entity shelved alone still gets a group of one.          |
| `entityRecord`         | `string`                       | Output of `stringifyEntity()` — YAML frontmatter plus body. The complete entity, losslessly (FR-004).        |
| `sourceEntityId`       | `string`                       | Entity id in the source vault. Used only for replace-on-re-shelve (FR-009); never reused as an id on import. |
| `sourceVaultId`        | `string`                       | Source vault. May refer to a vault that no longer exists.                                                    |
| `sourceVaultName`      | `string`                       | Captured at shelving time, retained after that vault is deleted (FR-007).                                    |
| `title`                | `string`                       | Denormalised for list display without parsing the record (FR-022).                                           |
| `type`                 | `string`                       | Denormalised likewise.                                                                                       |
| `shelvedAt`            | `number`                       | Epoch ms, from the injected clock. Orders the list, newest first.                                            |
| `assets`               | `ShelfAsset[]`                 | Copies of every referenced file (FR-005).                                                                    |
| `statSheetTemplate`    | `StatSheetTemplate \| null`    | Full record, `vaultId` stripped.                                                                             |
| `presentationTemplate` | `PresentationTemplate \| null` | Full record, `vaultId` stripped.                                                                             |
| `byteSize`             | `number`                       | Sum of asset sizes plus record length. Powers the storage display in FR-025 without reading blobs.           |

### `ShelfAsset`

| Field          | Type                                    | Notes                                                                           |
| -------------- | --------------------------------------- | ------------------------------------------------------------------------------- |
| `role`         | `"image" \| "thumbnail" \| "soundBite"` | Which frontmatter reference this satisfies.                                     |
| `sourcePath`   | `string`                                | Vault-relative path as it appeared in the record, e.g. `audio/x_soundbite.wav`. |
| `bytes`        | `Blob`                                  | Stored natively; IndexedDB holds blobs without encoding.                        |
| `mimeType`     | `string`                                |                                                                                 |
| `originalName` | `string`                                |                                                                                 |

> **Sound bites are a third asset type.** `SoundBiteSchema` stores audio at a vault-relative
> path (`audio/{id}_soundbite.wav`) alongside `image` and `thumbnail`. An implementation that
> collects only the two image references ships entities whose voice clips break on arrival.

### Invariants

- **I1** — An entry is complete: every path referenced by `entityRecord` has a matching
  `assets` element, or the reference was already absent in the source.
- **I2** — At most one entry per `(sourceVaultId, sourceEntityId)`. Re-shelving replaces
  (FR-009).
- **I3** — Templates are stored without `vaultId`; that field is vault-scoped bookkeeping and
  is reapplied on import.
- **I4** — Entries are immutable once written. Changing an entity means shelving it again.

---

## Store: `shelf_journal`

**Key**: `importId`

Exists only while an import is in flight. A record found at application start is a crashed
import and its listed artifacts are deleted (R1).

| Field                | Type                                           | Notes                                                                                                                           |
| -------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `importId`           | `string`                                       |                                                                                                                                 |
| `vaultId`            | `string`                                       | Target vault.                                                                                                                   |
| `startedAt`          | `number`                                       |                                                                                                                                 |
| `plannedEntityPaths` | `string[][]`                                   | OPFS paths the import intends to create.                                                                                        |
| `plannedAssetPaths`  | `string[][]`                                   | Likewise for assets.                                                                                                            |
| `plannedTemplateIds` | `{ schema: string[]; presentation: string[] }` | Only templates this import will _create_. Templates reused from the target vault are never listed and so are never rolled back. |
| `written`            | `string[]`                                     | Artifact keys confirmed written, so rollback deletes only what exists.                                                          |

### Invariants

- **J1** — The journal is written before the first artifact and deleted after the last.
- **J2** — Nothing listed in a journal pre-exists this import. Rollback is therefore pure
  deletion of newly created things and cannot destroy authored data. This rests on FR-013
  (import never overwrites) and FR-013a (import never reuses a title).
- **J3** — Rollback is idempotent: deleting an already-absent artifact is not an error.

---

## In-memory shapes (package, not persisted)

### `ImportPlan`

Produced before any write, so that FR-016a's single conflict step has everything it needs and
the write phase can run unattended.

| Field                   | Notes                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `entries`               | Entries being imported.                                                                                 |
| `titleAssignments`      | Per entry: final title, and whether it was renamed (FR-013a).                                           |
| `templateDecisions`     | Per template: `reuse-existing`, `bring-in`, or `conflict` awaiting a choice (FR-015/016).               |
| `connectionResolutions` | Per connection: resolved target, or a reason it could not be — `not-found` or `ambiguous` (FR-017/018). |
| `parentResolutions`     | Same treatment for `parent` references.                                                                 |

### `ImportOutcome`

What FR-019 reports: entities created, entities renamed and to what, templates reused, brought
in, or chosen between, and every connection and parent reference dropped with its reason.

---

## Lifecycle

```text
Shelve    entity + assets + templates ──> ShelfEntry ──> shelf_entries
                                                          │
                                          (replaces any entry with the
                                           same sourceVaultId + sourceEntityId)

Import    entries ──> ImportPlan ──> [conflict step, if any] ──> journal
                                                                   │
                            assets ─> entity files ─> templates ───┤
                                                                   │
                          success: journal deleted ────────────────┤
                          failure: journal replayed as deletes ────┘

                          entry remains on the shelf either way (FR-021)
```

Entries leave only by explicit removal or clear-all (FR-023), or with browser site data.

---

## Requirements traceability

| Requirement                         | Where it lives                                               |
| ----------------------------------- | ------------------------------------------------------------ |
| FR-004 lossless entity              | `entityRecord` via `stringifyEntity`                         |
| FR-005 own copies of assets         | `assets[]`, blobs stored inline                              |
| FR-006 template dependencies        | `statSheetTemplate`, `presentationTemplate`                  |
| FR-007 source provenance            | `sourceVaultName` captured at shelving                       |
| FR-008 group shelving               | `groupId` + `by-group` index                                 |
| FR-009 replace on re-shelve         | Invariant I2                                                 |
| FR-013 / FR-013a identity and title | `titleAssignments` in `ImportPlan`                           |
| FR-015 / FR-016 / FR-016a templates | `templateDecisions`, resolved before the write phase         |
| FR-017 / FR-018 connections         | `connectionResolutions` with explicit failure reasons        |
| FR-019 reporting                    | `ImportOutcome`                                              |
| FR-020 atomicity                    | `shelf_journal` + invariants J1–J3                           |
| FR-021 non-consuming import         | No delete on the success path                                |
| FR-022 list display                 | Denormalised `title`, `type`, `sourceVaultName`, `shelvedAt` |
| FR-025 storage display              | `byteSize`                                                   |
