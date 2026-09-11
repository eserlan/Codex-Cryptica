# Phase 0 Research: Entity Shelf

**Feature**: 156-entity-shelf | **Date**: 2026-08-12

Five unknowns carried into planning. Each is resolved below with the alternatives that were
weighed and why they lost.

---

## R1: Making an import all-or-nothing across two storage systems (FR-020)

**Problem**: An import writes an entity markdown file and its assets to OPFS, and template
records plus cache entries to IndexedDB. An IndexedDB transaction cannot span OPFS writes, so
there is no single transaction to lean on. FR-020 nonetheless requires that a failed import
leave the target vault untouched.

**Decision**: Compensating rollback driven by a persisted journal.

1. Resolve every decision first. FR-016a already guarantees all template conflicts are settled
   before anything is written, so the write phase contains no user interaction and no
   indefinite pause.
2. Write a journal record to IndexedDB naming every artifact the import intends to create —
   entity file paths, asset paths, template identifiers — before creating any of them.
3. Write assets, then entity files, then template records, marking each in the journal.
4. Delete the journal on success.
5. On failure, delete every artifact the journal lists. On application start, any journal
   found is a crashed import and gets the same treatment.

**Rationale**: FR-013 is what makes this sound. Import only ever _creates_ — it never
overwrites, merges into, or deletes an existing entity, and FR-013a keeps it from even reusing
a title. Rollback is therefore pure deletion of things this import brought into existence, and
cannot destroy anything the author had before. That is a materially weaker requirement than
general transactionality, and it is met by a journal plus deletes.

**Alternatives considered**:

- _Write everything to a staging area, then move into place._ OPFS has no atomic directory
  move; the move itself would need the same journal, so this adds a copy for nothing.
- _Pre-flight quota check, then write optimistically._ The realistic failure is quota
  exhaustion mid-write, and a pre-flight check races the very thing it is checking. Also does
  nothing for a tab closed mid-import.
- _Accept partial imports and offer a cleanup tool._ Contradicts FR-020, and pushes the
  consequence of a rare failure onto the author at the worst moment.

---

## R2: Keeping the shelf live across tabs (FR-023a)

**Problem**: Every tab must see the same shelf without a reload, and no tab may offer an entry
another tab has deleted.

**Decision**: Reuse `packages/events` — emit a shelf-changed event on the existing
`AppEventBus`, which `CrossTabBroadcaster` already forwards to other tabs. Each tab reacts by
re-reading entry metadata from IndexedDB.

**Rationale**: `CrossTabBroadcaster` (`packages/events/src/CrossTabBroadcaster.ts`) is already
wired into several stores, handles loop prevention via a `remote` metadata flag, and degrades
silently where `BroadcastChannel` is unavailable. Building a second broadcast mechanism
alongside it would violate Principle III directly.

**Constraint discovered**: The broadcaster serialises events with `JSON.stringify`, and
silently drops anything that fails to serialise. Shelf entries contain `Blob`s, so **entry
payloads can never travel over the channel**. The event must be a bare notification —
"the shelf changed" — with each tab re-reading from IndexedDB. This is the right shape anyway:
IndexedDB is the single source of truth and the payload never needs duplicating.

**Alternatives considered**:

- _Broadcast entry contents._ Impossible for blobs, as above.
- _Poll IndexedDB on an interval._ Wasteful, and still leaves a stale window.
- _`storage` events on localStorage as a signal._ A second mechanism for something the event
  bus already does.

---

## R3: Where the copy engine lives

**Decision**: A new `packages/entity-shelf` workspace package holding all logic, with ports for
everything that touches the browser. `apps/web` supplies the adapters and the UI.

**Rationale**: Principle I requires major features to be standalone packages with the web app
as a thin layer, and Principle VIII requires constructor injection. The genuinely interesting
logic here — title collision resolution, connection re-resolution with ambiguity detection,
template conflict detection, and the import/rollback sequence — is pure and has no need of
OPFS or IndexedDB. Behind ports it is directly unit-testable, which is what makes the 70%
coverage goal for new packages (Principle X) reachable rather than aspirational.

**Ports required**: `ShelfStore` (entries and journal), `VaultReader` (entity record, its
assets, its templates, existing titles), `VaultWriter` (create entity, save asset, save
template, delete-for-rollback), plus injected `Clock` and id factory, matching the pattern
`AssetManager` already uses in `packages/vault-engine`.

**Alternatives considered**:

- _Put it in `apps/web/src/lib/features/shelf/`._ Faster to write, contradicts Principle I, and
  makes the logic testable only through browser-storage mocks.
- _Extend `packages/vault-engine`._ The shelf is explicitly _not_ vault-scoped; putting a
  cross-vault concern inside the vault engine inverts the ownership.

---

## R4: Why the existing importer pipeline is not reused

**Decision**: The shelf does not route through `packages/importer`. It carries the output of
`stringifyEntity()` verbatim and re-parses it with the same frontmatter convention.

**Rationale**: `EntityDraft` (`packages/importer/src/cc/package.ts:19`) carries title, content,
lore, tags, labels, aliases, image, thumbnail, metadata and start/end dates — and nothing else.
`statSheet`, `connections`, `soundBite`, `date`, `status`, `kind`, `visibility`,
`languageProfile` and `imageArtDirection` are all absent. That is correct for its actual job:
it is a _foreign_-content pipeline for Scabard, Chronica, CIF and documents, and a
lowest-common-denominator shape is what such a pipeline needs. Routing native entities through
it would silently discard exactly the data FR-004 requires to survive — most visibly the stat
sheet, which is the reported motivation for the whole feature.

Meanwhile `stringifyEntity()` (`apps/web/src/lib/utils/markdown.ts:99`) already serialises a
complete entity into YAML frontmatter losslessly, and that is precisely what the vault stores
on disk. The shelf reuses the vault's own serialisation rather than a conversion of it.

**Reuse that does apply**: `stringifyEntity` / `parseMarkdown` for the record,
`AssetManager.saveImageToVault` for asset writes, `exportPresentationTemplate` for template
comparison, `CrossTabBroadcaster` for propagation. The divergence is confined to the draft
model, and is recorded under Complexity Tracking in `plan.md`.

**Alternatives considered**:

- _Add a `native` passthrough field to `EntityDraft`._ This was the plan when the feature was
  still file-based, and it remains the right answer if file import is ever built, because a
  dropped file must enter through the review UI. The shelf has no review step and no foreign
  content, so the passthrough would be a field only one caller ever sets.

---

## R5: Matching titles — collision detection and connection resolution

**Problem**: Two requirements match entities by title: FR-013a (does this title already exist
here?) and FR-017 (which entity does this connection point at?). Neither states how strictly to
compare.

**Decision**: Both comparisons are case-insensitive and whitespace-trimmed, and FR-017
additionally considers aliases.

**Rationale**: The two must agree. If collision detection were exact but connection resolution
case-insensitive, importing "goblin" into a vault holding "Goblin" would create a second
entity _and_ leave both matching any later connection to either spelling — manufacturing the
permanent ambiguity FR-018 exists to avoid. Treating them alike keeps the invariant that after
any import, no two entities in a vault have titles that resolution cannot tell apart.

**Note**: This is a slightly stricter reading than FR-013a's literal "exactly that title", and
is deliberate. It renames in one case the literal reading would not — differing only in case
or surrounding whitespace — which is a case authors are unlikely to have created on purpose.

**Collision format**: `Title (2)`, incrementing until free.

**Alternatives considered**:

- _Exact comparison for both._ Consistent, but leaves near-duplicate titles that connection
  resolution cannot distinguish, undermining FR-017 for every subsequent import.
- _Fuzzy matching for connections._ Rejected outright: a wrongly attached connection is
  unrecoverable in practice because the author has no reason to go looking for it, which is
  the reasoning already recorded in the spec's Assumptions.

---

## R6: Detecting whether two templates are "the same" (FR-015, FR-016)

**Decision**: Compare value-free projections, not raw records. For presentation templates, use
the existing `exportPresentationTemplate()` envelope (`formatVersion`, `name`, `description`,
`schemaTemplateId`, `source`). For stat sheet templates, compare the record with `vaultId` and
any storage-level bookkeeping stripped, using a stable key ordering.

**Rationale**: Stored records carry vault-scoped and bookkeeping fields that differ between
vaults for templates that are, to the author, identical. Comparing raw records would report a
conflict on every single import and make FR-016's prompt fire constantly — turning a rare
decision into a nuisance and training authors to click through it. `exportPresentationTemplate`
already exists for exactly this projection and is reused rather than reimplemented.

**Storage note**: Both template stores are keyed by id with a `by-vault` index
(`stat_sheet_templates`, `stat_sheet_presentation_templates` in `apps/web/src/lib/utils/idb.ts`),
so "does this vault already have this id" is an index lookup, not a scan.

---

## R7: IndexedDB schema change

**Decision**: Bump `DB_VERSION` from 22 to 23, adding two stores in one upgrade step:
`shelf_entries` (keyed by entry id, indexed by group) and `shelf_journal` (keyed by import id).

**Rationale**: Neither store is vault-scoped — that is the entire point of the feature — so
neither carries a `vaultId` key or a `by-vault` index, unlike every other store in the
database. The journal is separated from the entries because its lifetime is a single import
and a crashed import must be findable without scanning shelf contents.

**Hazard noted**: The version history comment in `idb.ts` records that version 20 was consumed
as a no-op in some browsers during development, and 21 was used to skip past it. The upgrade
callback is written defensively throughout with `if (!db.objectStoreNames.contains(...))`
guards, and the new stores must follow that same pattern rather than assuming a clean upgrade
from 22.

---

## Resolved

No `NEEDS CLARIFICATION` items remain. Phase 1 design proceeds.
