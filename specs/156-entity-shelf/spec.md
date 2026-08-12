# Feature Specification: Entity Shelf

**Feature Branch**: `feat/2101-entity-shelf`  
**Created**: 2026-08-12  
**Status**: Draft  
**Input**: GitHub issue #2101 — Export a single entity to a file (and import it into another vault)

The issue asks for file-based export so an entity can be carried between vaults. This
specification addresses the underlying need — moving entities between vaults — with an
in-app transfer buffer instead of files. See **Out of Scope** for why, and what a
file-based layer would still add later.

## Clarifications

### Session 2026-08-12

- Q: When the target vault already holds an entity with the shelved entity's title, what title does the imported one get? → A: Keep the title, except on an exact collision, where a disambiguator is appended (e.g. "Goblin (2)") and the rename is reported.
- Q: What does one tab show when another tab changes the shelf? → A: The shelf is live across tabs — shelving, removing, or clearing in one tab updates every other open tab immediately.
- Q: What is the feature called in the UI? → A: "Shelf" — confirmed as the user-facing name ("Send to Shelf", "Import from Shelf"), and the canonical term throughout spec, UI copy, and code.
- Q: How are template conflicts put to the author when importing several entities at once? → A: Resolved once up front — a single step lists every conflicting template with a choice, then the import runs unattended.
- Q: What performance bar replaces SC-009's "a few seconds"? → A: Under 5 seconds for ten entities with images, with progress shown for anything exceeding 1 second.

## User Scenarios & Testing

### User Story 1 - Carry one entity to another vault (Priority: P1)

As a vault author, I want to take a finished entity — a statted monster, an NPC, a magic
item — out of one vault and bring it into another, so that work I have already done is
reusable across campaigns instead of trapped in the vault it was authored in.

**Why this priority**: This is the whole request. Everything else in this specification is
an amplification of this single loop. Shipped alone it already resolves the reported need.

**Independent Test**: In a vault containing a fully authored creature (stat sheet, image,
sound bite, labels, lore), shelve it, switch to a second vault, import it, and compare the
resulting entity field-by-field against the original.

**Acceptance Scenarios**:

1. **Given** an entity in vault A, **when** the author shelves it and then imports it while
   vault B is open, **then** vault B contains a new entity carrying that entity's title,
   body content, lore, labels, aliases, dates, status, and every other authored
   field.
2. **Given** a shelved entity that has a stat sheet, **when** it is imported into a vault
   that has never seen its stat sheet template, **then** the template and its presentation
   template are brought into the target vault and the sheet renders exactly as it did in
   the source vault, with the same field values.
3. **Given** a shelved entity with an image, thumbnail, or sound bite audio, **when** it is
   imported, **then** those files exist in the target vault and display or play there.
4. **Given** a shelved entity, **when** it is imported, **then** the new entity receives an
   identifier unique within the target vault, and no existing entity in that vault is
   modified, replaced, or removed.
5. **Given** a target vault that already contains an entity with the same title, **when**
   the shelved entity is imported, **then** both entities exist independently afterwards, the
   imported one carrying a distinguishing suffix on its title, and the author is told it was
   renamed.
6. **Given** a target vault with no entity of that title, **when** the shelved entity is
   imported, **then** its title is carried across untouched.

---

### User Story 2 - Move a connected group in one go (Priority: P2)

As a vault author, I want to select several related entities at once — a faction and its
members, a dungeon and its inhabitants — and move them together with their relationships to
each other intact, so that I am not left reconnecting a web of links by hand in the
destination.

**Why this priority**: Selecting several entities is the reporter's own framing ("mark four
entities"), and a group that arrives disconnected is materially less useful than one that
does not. It nonetheless builds on User Story 1 rather than preceding it.

**Independent Test**: Select four mutually connected entities in the graph, shelve them,
import all four into an empty vault, and verify every connection among the four survives.

**Acceptance Scenarios**:

1. **Given** several entities selected together in the graph or table, **when** the author
   shelves the selection, **then** each becomes an independently importable shelf entry and
   the group is recorded as having been shelved together.
2. **Given** a group shelved together, **when** the whole group is imported into a vault,
   **then** every connection whose two ends are both inside that group is recreated between
   the newly created entities.
3. **Given** a shelved entity with a connection to an entity that was not shelved, **when**
   it is imported into a vault that contains an entity matching that connection's target by
   title or alias, **then** the connection is recreated pointing at the matching entity.
4. **Given** a shelved entity with a connection whose target exists neither in the imported
   group nor in the target vault, **when** it is imported, **then** the import succeeds and
   the unresolved connection is reported to the author rather than silently discarded or
   treated as a failure.

---

### User Story 3 - Keep a reusable stock and understand its limits (Priority: P3)

As a vault author, I want shelved entities to stay on the shelf after I import them, labelled
with where and when they came from, so that I can build up a small stock of reusable
material and drop the same monster into several campaigns — while understanding that this
stock lives in this browser and is not a backup.

**Why this priority**: Turns a one-shot move into a reusable library, which is what makes
the feature worth returning to. Not required for the core loop to deliver value.

**Independent Test**: Import one shelf entry into three different vaults in succession,
confirming the entry survives each import and that all three vaults hold complete copies.

**Acceptance Scenarios**:

1. **Given** a shelf entry that has been imported into a vault, **when** the author opens
   the shelf again, **then** the entry is still present and importable.
2. **Given** shelf entries created from different vaults, **when** the author views the
   shelf, **then** each entry shows the name of the vault it came from and when it was
   shelved.
3. **Given** a source vault that has since been deleted, **when** the author imports an
   entry that came from it, **then** the import succeeds completely, including images and
   templates.
4. **Given** an author about to place the first entity on the shelf, **when** the action is
   offered, **then** it is made clear that shelf contents live in this browser and are not a
   backup or a way to send an entity to another person.
5. **Given** entries the author no longer wants, **when** they remove an entry or clear the
   shelf, **then** those entries are gone and the space they occupied is released.

---

### Edge Cases

- **Re-shelving the same entity**: shelving an entity that is already on the shelf from the
  same source vault replaces the earlier snapshot rather than accumulating near-duplicates.
  The shelf is a transfer buffer, not a version history.
- **Importing into the source vault**: permitted, and produces an independent duplicate of
  the entity. This is a legitimate way to clone a complex entity.
- **Template identifier collision**: the target vault already holds a template with the same
  identifier as one arriving with an entity. If the two are identical, the existing one is
  used with no prompt. If they differ, the author is asked to choose — once per template, not
  once per entity — before anything is written, and the affected sheets resolve to whichever
  they chose.
- **Author abandons the conflict step**: nothing is written and the target vault is untouched,
  the same as any other unfinished import.
- **Repeated import of the same entry into one vault**: each import produces another
  independent entity, the second and later ones carrying a distinguishing suffix. Importing
  the same monster three times gives three monsters, not one overwritten three times.
- **Ambiguous connection target**: two or more entities in the target vault match a
  connection's target by title or alias. The connection is left unresolved and reported,
  rather than attaching to an arbitrary one of them.
- **Parent references**: an entity whose parent was not shelved and does not exist in the
  target vault is imported without a parent, and the dropped reference is reported.
- **Entity with nothing attached**: an entity with no stat sheet, no image, and no
  connections shelves and imports with no warnings and no prompts.
- **Storage exhausted**: if the browser's storage limit is reached while shelving, the
  operation fails with a clear message and leaves no partially written entry behind.
- **Storage exhausted mid-import**: an import that cannot complete leaves the target vault
  as it was, with no half-written entity, orphaned image, or stray template.
- **Empty shelf**: opening the shelf with nothing on it explains what the shelf is and how
  to put something on it.
- **Entry removed in another tab mid-import**: an import already under way completes against
  the copy it started with rather than failing part-way; the entry is simply gone from the
  shelf afterwards in every tab.
- **Two tabs open on different vaults**: shelving in one and importing in the other works, and
  the entry appears in the second tab's shelf without a reload.
- **Site data cleared**: shelf contents are gone. This is expected and disclosed, not an
  error state to recover from.
- **Large selection**: shelving a selection whose images total tens of megabytes reports
  progress and can be abandoned without leaving partial entries.

## Requirements

### Functional Requirements

**Placing entities on the shelf**

- **FR-001**: Authors MUST be able to send the currently open entity to the shelf from the
  entity detail view.
- **FR-002**: Authors MUST be able to send a multi-entity selection to the shelf from both
  the graph and the table views, using the existing selection mechanism in each.
- **FR-003**: The shelf MUST be reachable from every vault, and MUST show the same entries
  regardless of which vault is currently open.
- **FR-004**: A shelf entry MUST capture the complete authored state of its entity, losing
  no field that the vault itself persists — including stat sheet values, connections, sound
  bite, aliases, labels, temporal data, art direction records, and body content.
- **FR-005**: A shelf entry MUST include its own copies of every file the entity references
  (image, thumbnail, sound bite audio), so the entry stays complete if the source vault is
  later changed or deleted.
- **FR-006**: A shelf entry MUST include complete records of the stat sheet template and
  presentation template the entity's sheet depends on.
- **FR-007**: A shelf entry MUST record the name of the vault it came from and the time it
  was shelved, and MUST retain that source vault name even after that vault is deleted.
- **FR-008**: Entities shelved together as one selection MUST be recorded as a group, so an
  import can recreate the relationships among them.
- **FR-009**: Shelving an entity already present on the shelf from the same source vault
  MUST replace the existing entry rather than create a second one.
- **FR-010**: Shelving MUST NOT modify the source entity or the source vault in any way.

**Importing from the shelf**

- **FR-011**: Authors MUST be able to import any shelf entry into the currently open vault.
- **FR-012**: Authors MUST be able to import several entries at once, and when those entries
  were shelved as a group, importing them together MUST recreate the connections among them.
- **FR-013**: Every imported entity MUST be created with an identifier unique within the
  target vault; import MUST NEVER overwrite, merge into, or delete an existing entity.
- **FR-013a**: An imported entity MUST keep its title unchanged unless the target vault
  already holds an entity with exactly that title, in which case a distinguishing suffix MUST
  be appended to make it unique. Titles MUST NOT be altered in any other circumstance.
- **FR-014**: Import MUST bring the entry's referenced files into the target vault so the
  imported entity's image, thumbnail, and sound bite work there.
- **FR-015**: Import MUST make the entry's stat sheet and presentation templates available in
  the target vault, reusing an identical template already present rather than duplicating it.
- **FR-016**: When the target vault holds a different template under the same identifier as
  an arriving template, the system MUST ask the author which to use and MUST NOT silently
  overwrite the existing one.
- **FR-016a**: All template conflicts across an import MUST be gathered and resolved in a
  single step before any entity is written, each conflicting template presented once however
  many of the imported entities depend on it. Once the author has decided, the import MUST
  run to completion without further prompting.
- **FR-017**: Import MUST resolve each connection by looking first among the entities
  imported alongside it, then among entities in the target vault matched by title or alias.
- **FR-018**: A connection that cannot be resolved unambiguously MUST be omitted and
  reported to the author; it MUST NOT cause the import to fail.
- **FR-019**: Import MUST report its outcome: what was created, any entity renamed to avoid a
  title collision, which templates were reused, brought in, or chosen between, and which
  connections and parent references were dropped.
- **FR-020**: An import that cannot complete MUST leave the target vault unchanged rather
  than partially populated.
- **FR-021**: Importing an entry MUST leave that entry on the shelf, available to import
  again into the same or another vault.

**Managing the shelf**

- **FR-022**: Authors MUST be able to view the shelf's contents, identifying each entry by
  entity title, type, source vault, and shelving date.
- **FR-023**: Authors MUST be able to remove an individual entry and to clear the shelf
  entirely, and doing so MUST release the storage those entries occupied.
- **FR-023a**: The shelf MUST show the same contents in every open tab. Shelving, removing,
  or clearing in one tab MUST be reflected in the others without requiring a reload, so no
  tab can offer an entry that no longer exists.
- **FR-024**: The system MUST disclose, at the point where entities are first placed on the
  shelf, that shelf contents are held in the current browser and are neither a backup nor a
  means of sending entities to another person.
- **FR-025**: The system MUST show how much storage the shelf is using and warn the author
  when the shelf is approaching the browser's storage limit.
- **FR-026**: The shelf MUST present its entries as a single flat list, ordered most recently
  shelved first. It MUST NOT provide search, sorting, grouping, or folders: the shelf is a
  transfer buffer authors work through and empty, not a library they curate.

### Key Entities

"Shelf" is the canonical term, in the interface and in this document alike. Authors "send to
the Shelf" and "import from the Shelf"; they do not export, save, or copy.

- **Shelf**: A single collection of shelved entities belonging to the person using this
  browser, not to any one vault. Visible and usable from whichever vault is open. Persists
  until explicitly cleared; does not survive clearing browser site data.
- **Shelf Entry**: A self-contained snapshot of one entity at the moment it was shelved —
  its complete authored state, copies of the files it references, the templates its stat
  sheet depends on, the name of its source vault, and the time it was taken. Remains valid
  and importable independently of whether the source entity or source vault still exists.
- **Shelf Group**: The record that a set of entries was shelved together in one action, used
  to reconstruct the relationships among them when they are imported together.
- **Import Outcome**: The record of what one import did — the entities created, how each
  template dependency was resolved, and every connection or parent reference that could not
  be reattached.

## Success Criteria

### Measurable Outcomes

- **SC-001**: An author can move a fully authored entity from one vault to another in under
  30 seconds, without leaving the application, opening a file manager, or handling a
  downloaded file.
- **SC-002**: An entity that has made the round trip is field-for-field identical to its
  source in everything the author wrote — 100% of stat sheet fields and values, images,
  sound bite, labels, aliases, lore, body content, and dates — differing only in its
  identifier and, where the title already existed in the target vault, its disambiguated
  title.
- **SC-003**: When four interconnected entities are shelved together and imported together,
  100% of the connections among those four are present in the destination.
- **SC-004**: Across all imports, zero pre-existing entities in the target vault are
  modified, replaced, or removed.
- **SC-005**: Zero imports fail because a connection, parent, or template dependency could
  not be resolved; every such case completes and is reported instead.
- **SC-006**: 100% of shelf entries remain fully importable — images and templates included
  — after their source vault has been deleted.
- **SC-007**: A failed or abandoned shelve or import leaves zero partial entries, orphaned
  files, or stray templates behind.
- **SC-008**: Authors are told that the shelf is browser-local and not a backup before they
  can put anything on it, and can state that limitation correctly when asked afterwards.
- **SC-009**: Shelving a selection of ten entities with images completes in under 5 seconds,
  and importing those ten into another vault completes in under 5 seconds. Any shelve or
  import lasting longer than 1 second shows progress rather than appearing frozen.

## Assumptions

- **Vaults are all local to one browser.** The shelf works because every vault this person
  has is reachable from the same application context. Moving an entity to a vault on another
  device or in another browser is not addressed here.
- **The current selection mechanisms are sufficient.** Graph and table already support
  selecting several entities and acting on the selection; shelving is a new action on that
  existing selection rather than a new way to select.
- **Title and alias are the only portable way to match a connection.** Identifiers are
  vault-local, so a connection's target is matched by name in the destination. This will
  occasionally miss a match that a human would make, which is why unresolved connections are
  reported rather than guessed at.
- **Ambiguity is reported, not resolved.** Where more than one candidate matches, the system
  declines to choose. Reporting a dropped connection is recoverable; a wrongly attached one
  is not, because the author has no reason to go looking for it.
- **Only what is selected is shelved.** Shelving an entity does not pull in its children,
  its parent, or the entities it connects to. An author who wants a group selects the group.
- **Replacement over accumulation.** Re-shelving the same entity replaces its entry, on the
  assumption that the author wants the current version, not a history of drafts.
- **Import does not consume.** Entries stay put after import, on the assumption that reuse
  across several vaults is the point.
- **The shelf stays small because authors empty it.** FR-026 commits to a flat list with no
  search or organisation, on the assumption that a transfer buffer holds a handful of entries
  at a time. Should shelves in practice grow to dozens of long-lived entries, search and
  sorting become worth revisiting — entries already record title, type, source vault, and
  date, which is everything such a view would need.

## Out of Scope

- **Files on disk.** Nothing is written to the filesystem and nothing is read from it. This
  is a deliberate departure from the literal request in issue #2101: it removes the format,
  versioning, and archive-validation burden entirely, and removes the browser-dependent
  save-location problem the issue itself flags. The cost is that the shelf cannot back
  anything up, cannot reach another device or browser, and cannot send an entity to another
  person.
- **Sharing between people.** No transfer of a shelved entity to another person, by file,
  link, or account.
- **Cross-device transfer.** No relationship to existing vault synchronisation; the shelf
  does not sync.
- **Editing on the shelf.** Entries are immutable snapshots. Changing an entity means
  changing it in a vault and shelving it again.
- **Whole-vault transfer.** Existing vault backup and restore is unaffected and remains the
  route for moving an entire vault.
- **A later file-based layer.** Should file export be built afterwards, it would reuse this
  feature's copy-and-reattach behaviour with a file as the transport. Nothing here forecloses
  that, and nothing here depends on it.
