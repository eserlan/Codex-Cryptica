# Feature Specification: CIF Mechanical Importer — Phase 1, Text-Only Core

**Feature Branch**: `143-cif-importer`
**Created**: 2026-07-16
**Status**: Draft
**Source**: GitHub issue #1722
**Design references**: `docs/CODEX_INTERCHANGE_FORMAT.md` (public CIF contract), `docs/CIF_IMPORTER_IMPLEMENTATION_OUTSET.md` (pre-specification outset), `schemas/cif/1.0/manifest.schema.json` (structural contract) — the outset's open decisions #1–#3, #6, #8 are resolved as documented Assumptions below; #4, #5, #7 are deferred with Phase 2.
**Input**: User description: "Codex Interchange Format (CIF) mechanical importer, Phase 1: text-only core. Allow a validated .cif.json package to enter the existing review-and-merge import workflow, entirely client-side with no network request. Validate structural and cross-record integrity before any vault mutation — invalid packages never reach the review UI. Normalize valid CIF entities, hierarchy, labels, Markdown content, and relationships into the existing review flow. Derive stable source references so repeat imports match reliably (never by title). Report unmapped kinds and unknown extensions without silently dropping valid core data. Phase 2 (ZIP packages with binary assets) is explicitly out of scope."

## Clarifications

### Session 2026-07-16

- Q: When a package contains entity kinds with no built-in category mapping, how should the target category be decided? → A: Fixed fallback category — all unknown kinds map to one fixed category with a warning; users re-categorize inside the app afterwards. No per-kind mapping UI in this phase.
- Q: When a package's source has no stable worldKey, how should stable identity matching behave? → A: Fallback + warning — identity falls back to producing-system + entity key; review warns that two different worlds from the same key-less tool could collide in one vault. Confirms the existing assumption.
- Q: Where should an imported entity's optional CIF summary be stored? → A: In the entity's player-facing short-description field, with the Markdown body going to the long-form lore field — a direct two-field mapping, no prepending, no loss.
- Q: When re-importing an updated export, how should records deleted in the source world be reconciled? → A: Additive only — updates change fields and add links, nothing is ever removed; removal reconciliation (including detection/reporting of source-side deletions) is deferred to a later phase. Confirms FR-016 as written.
- Q: Which category should be the fixed fallback for unknown entity kinds? → A: "note" — the neutral catch-all category; no misleading semantics, easy to find and re-categorize after import.
- Q: What happens on a follow-up import when a new record references a previously imported (existing) entity? → A: "Skip" on a matched record means "don't modify it", not "it doesn't exist": parent and relationship references resolve to the existing vault entity. Links are omitted only when the skipped record has no vault counterpart. Relationships that already exist in the vault (same resolved endpoints, kind, and label) are not created again.
- Q: What exactly does an accepted "update" change when the source world modified an entity? → A: Per field class: prose/scalar fields (title, summary, body, dates) are replaced with the package value — shown in the review diff first, so overwriting in-app edits is explicit per-record consent and skip preserves them; list fields (labels, aliases) merge additively (user-added values never removed); the category is never changed by an update (protects post-import re-categorization; a changed package kind is reported as informational); relationships remain additive-only. True field-level three-way merging is deferred with provenance storage.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Import a world from another tool (Priority: P1)

A worldbuilder has years of campaign material in another worldbuilding tool. Using that tool's exporter (or a migration script written against the published CIF contract), they produce a text-only `.cif.json` package containing their world's characters, locations, factions, notes, hierarchy, labels, and relationships. They select the file in Codex Cryptica's importer, see every record laid out for review with a proposed action, confirm, and find their whole world — prose, labels, aliases, parent/child structure, and the relationship graph — in their vault, without an internet connection.

**Why this priority**: This is the entire reason CIF exists: a lossless, mechanical on-ramp into the app. A one-shot, correct, fully client-side import of a valid package is independently valuable even before repeat-import matching or richer diagnostics exist.

**Independent Test**: Import the published valid fixture package (`schemas/cif/1.0/examples/valid-text-only.cif.json`) into an empty vault; confirm every entity appears with correct title, category, prose, labels, aliases, and parent, and every relationship connects the right two entities — with the network disabled.

**Acceptance Scenarios**:

1. **Given** a valid text-only CIF package and an open vault, **When** the user selects the file, **Then** a review screen lists every entity in the package with its title, mapped category, and a proposed action, plus a summary of the relationships to be created.
2. **Given** the review screen for a valid package, **When** the user confirms the import, **Then** every reviewed entity is created first, then every relationship is created between the resulting entities — never the other way round, and never a relationship pointing at an entity that does not exist.
3. **Given** an entity with a `parent` reference in the package, **When** the import completes, **Then** the imported child is attached under the imported parent in the vault's hierarchy.
4. **Given** a package with an undirected relationship (e.g. two characters married to each other), **When** the import completes, **Then** the bond is recorded reciprocally so it reads correctly from both entities.
5. **Given** the device is offline, **When** the user imports a text-only package, **Then** the import completes fully — no step requires a network request.

---

### User Story 2 - Broken or hostile packages never damage a vault (Priority: P2)

A user receives a CIF file from a third-party tool, a half-finished migration script, or an untrusted source. The file may be malformed JSON, claim the wrong format or version, contain duplicate keys, reference entities that don't exist, or link an entity to itself. The importer refuses such packages up front with a plain-language explanation naming the offending record and rule — before any review screen opens and before anything touches the vault. A package that is structurally valid but contains things this phase can't map (an unknown entity kind, a producer-specific extension) still imports, with each such item clearly reported instead of silently discarded.

**Why this priority**: Every package is untrusted input, and the import boundary is a data-integrity boundary. Blocking bad packages before review — and never losing valid data silently — is what makes it safe to tell external tool authors "emit CIF and it will work."

**Independent Test**: Feed the importer each defined invalid-package class (malformed JSON, wrong `format` value, unsupported `version`, duplicate entity key, unresolvable relationship endpoint, unresolvable parent, self-linking relationship) and confirm each is rejected pre-review with an error naming the record; then import a valid package containing an unknown kind and an unknown extension, and confirm both are reported while all core data imports.

**Acceptance Scenarios**:

1. **Given** a file that is not valid JSON or does not declare the CIF format identifier, **When** the user selects it, **Then** the import stops with a plain-language error and no review screen opens.
2. **Given** a package declaring a newer, unsupported format version, **When** the user selects it, **Then** the import stops with a message naming the package's version and the version this app supports.
3. **Given** a package with two entities sharing one key, or a relationship whose endpoint key matches no entity, or an entity whose parent key matches no entity, or a relationship from an entity to itself, **When** validation runs, **Then** the import is blocked with an error identifying the offending record by key, and the vault is untouched.
4. **Given** a valid package containing an entity kind this app has no category for, **When** it enters review, **Then** the entity is present with a clearly indicated fallback category and a warning — the entity is never dropped.
5. **Given** a valid package containing producer-specific extension data, **When** it imports, **Then** the core data imports normally and the report states which extensions were not understood.
6. **Given** a `.cif.zip` package or a manifest whose asset list is non-empty, **When** the user selects it, **Then** the user is told assets and ZIP packages are not yet supported in this phase (ZIP: blocked; asset records in a text-only manifest: imported world content with a warning that media was not imported).

---

### User Story 3 - Re-import an updated export without duplicates (Priority: P3)

A month later, the same worldbuilder exports a newer version of their world from the source tool — some entities renamed, some prose expanded, a few new characters and relationships added. They import the new package into the same vault. Every previously imported entity is recognised as the same entity — even the renamed ones — and offered as an update or skip; only genuinely new records are offered as create. Nothing is duplicated, and choosing update never silently deletes relationships the user built inside Codex Cryptica in the meantime.

**Why this priority**: Repeat import is what turns a one-shot migration into an ongoing bridge between tools. It builds directly on P1's identity plumbing and is worthless without it — but P1 alone (one-time migration) already serves the most common need.

**Independent Test**: Import a fixture package; rename one entity and add one new entity in a second version of the package; re-import. Confirm the renamed entity matches its existing counterpart (offered update/skip, not create), the new entity is offered as create, and after choosing "update all" the vault contains no duplicate entities.

**Acceptance Scenarios**:

1. **Given** a vault containing entities from a previous import of the same source world, **When** the user imports a newer export, **Then** each returning entity is matched to its existing counterpart by stable identity — never by title — and offered as update or skip.
2. **Given** a returning entity whose title changed in the source tool, **When** it is re-imported, **Then** it still matches its existing counterpart (rename-safe matching).
3. **Given** an entity offered as an update, **When** the user inspects it in review, **Then** they can see which fields the update would change before deciding.
4. **Given** the user accepts updates, **When** the import completes, **Then** relationships and edits created inside Codex Cryptica since the first import still exist — an update adds and changes, it does not silently remove.
5. **Given** two consecutive imports of the identical package with "skip existing" chosen the second time, **When** the second import completes, **Then** the vault's entity count is unchanged.
6. **Given** a newer export containing a new entity with a relationship to (or a parent under) a previously imported entity the user skips this time, **When** the import completes, **Then** the new entity is linked to the _existing_ vault entity — the link is not dropped — and a relationship that already exists in the vault from the earlier import is not duplicated.
7. **Given** a previously imported entity whose prose the user has edited in the app, and a newer export that also changed that entity's prose, **When** the entity is offered as an update, **Then** the review shows the current value against the package value; accepting replaces the prose with the package version, skipping keeps the user's edits — and either way the user's added labels, in-app relationships, and any re-categorization survive.

---

### Edge Cases

- **Empty but valid package** (no entities): review opens with a friendly "nothing to import" state rather than an error or a blank screen.
- **Huge package**: a text-only package with thousands of entities must not freeze the app; parsing and validation stay responsive, and a package exceeding the configured manifest size limit is rejected up front with a clear message rather than crashing the tab.
- **Hierarchy cycle**: entity A's parent is B and B's parent is A (schema-valid, semantically broken). Cross-record validation rejects the package, naming the cycle members.
- **Duplicate relationship records** (same endpoints, kind, and label): imported once, with the duplicate noted in the report.
- **Relationship or parent pointing at a skipped record**: if the skipped record matched an existing vault entity, the link resolves to that existing entity; if it has no vault counterpart (declined create), the dependent link is omitted with a per-record report entry — never a broken reference in the vault either way.
- **Optional fields absent everywhere** (no summaries, no aliases, no labels, no dates): package imports cleanly; absence is not a warning.
- **Fictional dates with partial precision** (year-only, month-only): preserved to the extent the vault can represent them; anything unrepresentable is reported as a fidelity warning, never dropped silently.
- **Duplicate aliases or labels within one entity**: de-duplicated quietly (not an error).
- **Package `source` lacking a stable world key**: import proceeds; matching falls back to the producing system plus entity keys, and review warns that entities from _different_ worlds exported by the same tool could collide.
- **Cancel mid-flow**: cancelling at review leaves the vault completely untouched; a failure or cancellation during commit never leaves a relationship whose endpoint entity was not created, and the final report states exactly what was and wasn't imported.
- **Guest/read-only sessions**: import is unavailable, consistent with all other vault mutations.

## Requirements _(mandatory)_

### Functional Requirements

**Package acceptance & validation**

- **FR-001**: The system MUST accept a text-only CIF package file (`.cif.json`) through the existing import surface, and MUST parse and fully validate it before opening any review session or mutating any vault data.
- **FR-002**: Validation MUST enforce the published CIF 1.0 structural contract _and_ the cross-record rules the structural contract cannot express: package-local uniqueness of entity keys and relationship keys, every `parent` and relationship endpoint resolving to an entity in the package, every media reference resolving to an asset record in the package, no self-linking relationships, no hierarchy cycles, and the declared format identifier and a supported version.
- **FR-003**: An invalid package MUST be rejected before review with plain-language, actionable errors that identify each offending record by its key and state the violated rule. A rejected package MUST cause zero vault changes.
- **FR-004**: ZIP packages (`.cif.zip`) MUST be recognised and declined with a clear "not supported in this phase" message. A text-only manifest whose asset list is non-empty MUST still import its world content, with a warning that media was not imported.
- **FR-005**: The system MUST guard against oversized input: a manifest exceeding the configured size limit is rejected up front with a message stating the limit, and parsing/validating a large valid package MUST NOT make the app unresponsive.

**Review & commit**

- **FR-006**: A valid package MUST enter the existing review workflow, where every entity is listed with its title, mapped category, and a per-record decision of create, update, or skip; the world's own metadata (title, description, labels) is displayed for confirmation but is not itself persisted as an entity.
- **FR-007**: Commit MUST create or update all accepted entities before creating any relationship, and MUST resolve hierarchy and relationship references to the actual resulting entities — never to package keys and never to titles.
- **FR-008**: Parent and relationship references MUST resolve to the record's vault counterpart whenever one exists — including a record the user skipped because it already matched an existing entity ("skip" means "don't modify", not "doesn't exist"). Only when a referenced record has no vault counterpart (the user declined to create it, or it failed) is the dependent link omitted, with a per-record report entry. The vault MUST never contain a reference to an entity that does not exist, even after cancellation or failure mid-commit.
- **FR-009**: The user MUST be able to cancel at review with zero vault mutations.

**Content fidelity**

- **FR-010**: For each imported entity the system MUST preserve: title; kind (mapped to a category); Markdown body stored as the entity's long-form prose; optional plain-text summary stored in the entity's player-facing short-description field (never silently discarded, never merged into the body); labels; aliases; parent hierarchy; and optional dates to the extent the vault can represent them, with any unrepresentable precision reported as a fidelity warning.
- **FR-011**: An entity kind with no built-in category mapping MUST NOT block import or drop the entity: it is assigned the fixed fallback category "note" (clearly indicated in review) and reported as an unmapped kind. Per-kind category selection is not part of this phase; users re-categorize in the app after import.
- **FR-012**: Unknown producer extensions MUST never invalidate an otherwise valid package; they are safely ignored for import purposes and each is named in the report as not understood.
- **FR-013**: Directed relationships MUST import as a single link from source to target preserving the relationship kind as the link's type and the optional label as explanatory text; undirected relationships MUST read correctly from both endpoints; records identical in endpoints, kind, and label MUST import once — and a relationship whose resolved equivalent already exists in the vault (e.g. from a previous import) MUST NOT be created again, with the report noting it as already present.

**Identity & repeat imports**

- **FR-014**: Every imported entity MUST carry a stable identity derived from the package's source identity and the entity's package-local key. The derivation MUST be injective — two distinct source identities can never produce the same stable identity — and matching MUST never use titles.
- **FR-015**: On re-import, records whose stable identity matches an existing vault entity MUST be offered as update or skip; the review MUST show, per record, which fields an update would change (current value vs. package value) before the user decides. Unmatched records are offered as create. Accepting every "skip" on an identical re-import MUST leave the vault unchanged.
- **FR-016**: An accepted update MUST behave per field class: prose and scalar fields (title, summary, body, dates) are replaced with the package's values — visible in the review diff beforehand, so overwriting the user's in-app edits to those fields is explicit, per-record consent; list fields (labels, aliases) are merged additively, never removing values the user added in the app; the entity's category is never changed by an update (a changed package kind is reported as informational only); and links/relationships are only ever added, never removed. Entities and relationships the user created in the app are never modified or removed by any update.

**Reporting, privacy & platform**

- **FR-017**: Every import MUST end with a report stating counts of created, updated, and skipped records, and itemising every warning: unmapped kinds, unknown extensions, omitted links, deduplicated records, date-fidelity losses, and not-imported media. Nothing that was in the package may disappear without a report entry.
- **FR-018**: Parsing, validation, review, and commit MUST run entirely on the user's device: no network request is required or made for a text-only import, package contents are never sent to any AI service or third party, and full package content is never written to logs or telemetry.
- **FR-019**: Import MUST be unavailable in guest/read-only sessions, consistent with existing vault mutations.

### Key Entities

- **CIF Package**: a single self-describing document containing a format identifier and version, source provenance (producing system, world key, export time), world metadata, and collections of entity records, relationship records, and (out of scope this phase) asset records.
- **CIF Entity record**: a package-local key, a kind, a title, optional summary, Markdown prose, labels, aliases, optional parent key, optional dates, optional source provenance, optional extensions.
- **CIF Relationship record**: an optional key plus from/to entity keys, a machine-readable kind, optional human label, and directionality.
- **Stable source reference**: the derived, collision-free identity that ties an imported vault entity back to its package source identity and entity key, enabling rename-safe repeat-import matching.
- **Review decision**: the per-record user choice (create / update / skip) made in the existing review workflow before anything is committed.
- **Import report**: the end-of-import account of what was created, updated, skipped, warned about, or could not be imported.

## Assumptions

Resolutions of the outset document's open decisions for Phase 1 (each revisitable via `/speckit-clarify`):

- **Stable identity derivation** (outset decision #1; fallback clarified 2026-07-16): identity combines the producing system, the source world key, and the entity's package key, encoded so that component boundaries can never be forged by crafted key contents (injectivity per FR-014). When the package lacks a world key, matching falls back to system + entity key with a review warning about potential cross-world collisions. The exact encoding/escaping is a planning-phase decision; the spec requires only injectivity and rename-safety.
- **Summary storage** (outset decision #2; clarified 2026-07-16): the optional `summary` is stored in the entity's player-facing short-description field and the Markdown body in the long-form lore field — a direct two-field mapping, settled (no prepend fallback needed).
- **Parent resolution** (outset decision #3): parent keys resolve to the actual created/updated entity at commit time; a child whose parent was skipped imports without a parent plus a report entry.
- **Update reconciliation** (outset decision #6; field rules clarified 2026-07-16): Phase 1 updates follow FR-016's field-class rules — prose/scalar replace (with visible diff and per-record consent), lists merge additively, category untouched, links add-only. Reconciling _removals_ from the source world (delete-on-update) and per-field three-way merging against a stored last-import snapshot are explicitly deferred with provenance storage.
- **Modules and fidelity** (outset decision #8): calendars, maps, and category definitions are follow-up modules, not CIF 1.0 core; core `dates` import best-effort with warnings (FR-010); extensions are preserved-in-report only.
- **Asset decisions** (outset decisions #4, #5, #7 — asset roles, binary storage, size limits): deferred to the Phase 2 spec; only the manifest size guard (FR-005) is set in this phase, its exact value a planning decision.
- **Import target**: the currently open vault, host sessions only — matching the existing importer's behavior.
- **World metadata**: shown for confirmation at review; not persisted as a vault entity in this phase.

## Out of Scope

- `.cif.zip` parsing, binary assets, media persistence, and role-based attachment (Phase 2).
- Fetching remote asset URLs (requires its own future policy and explicit user acknowledgement).
- Calendar, map, and category-definition modules (Phase 3).
- Persistent per-relationship provenance storage and delete-on-update reconciliation.
- Exporting a vault _to_ CIF.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Importing the published valid fixture into an empty vault yields 100% of its entities, labels, aliases, parent links, and relationships, verifiable record-by-record against the package with no manual correction.
- **SC-002**: 100% of packages in each defined invalid class (malformed, wrong format, unsupported version, duplicate key, unresolvable reference, self-link, hierarchy cycle, oversized) are blocked before review, each with an error naming the offending record or rule, and cause zero vault changes.
- **SC-003**: A text-only import completes with zero network requests, verifiable by running the entire flow offline.
- **SC-004**: On re-import of a modified export of the same world, 100% of returning entities — including renamed ones — match their existing counterparts, and an identical re-import with all records skipped changes nothing in the vault.
- **SC-005**: Zero silent data loss: every unmapped kind, unknown extension, omitted link, deduplicated record, unrepresentable date, and skipped media item in a test corpus appears in the import report.
- **SC-006**: A 1,000-entity text-only package parses and validates in under 5 seconds on a typical desktop with the UI remaining interactive throughout.
- **SC-007**: After any completed, cancelled, or failure-interrupted import, the vault contains zero references (parent or relationship) to entities that do not exist.
