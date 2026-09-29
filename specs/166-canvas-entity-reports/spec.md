# Feature Specification: Canvas Entity Reports

**Feature Branch**: `166-canvas-entity-reports`
**Created**: 2026-09-28
**Status**: Draft
**Input**: User description: "Canvas: generate readable entity reports with purpose-built presentation views" ([GitHub #3428](https://github.com/eserlan/Codex-Cryptica/issues/3428)). Scope was refined three times during clarification, at the stakeholder's request: (1) a selection of entities in Graph view or Table view can generate the same kind of report, not only a canvas; (2) a generated report is saved as a Note-category vault entity — read and edited inside Codex Cryptica — rather than only a transient preview that has to be copied out to be kept or corrected; (3) that reading/editing MUST use the exact same entity view/editor as any other vault entity — no separate report-specific viewing or editing surface, ever.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Generate a report and keep it as a real, editable document in the vault (Priority: P1)

A GM has spent time on a Spatial Canvas board deliberately placing characters, factions, and locations and connecting them with labelled relationships (a party overview, a conspiracy board, a family tree). They want to turn that curated board into a readable dossier — and, crucially, they want to be able to **review it, correct anything the report got wrong or phrased oddly, and keep it** as part of their campaign, not just glance at a preview that vanishes when they close a panel.

**Why this priority**: This is the feature's entire reason for existing. A report the GM can't correct or keep doesn't actually solve "I want a document I can review," which is the original request. Saving the generated report as an ordinary, editable piece of vault content — rather than a one-off export — is what makes it a document instead of a report _of_ a document.

**Independent Test**: Open a canvas containing several linked entities and relationships, choose "Generate report" with the default options, confirm a structured, readable preview appears, then save it and confirm it now exists as a Note-category entity in the vault that can be reopened, read, and hand-edited like any other entity — with no export step involved at any point.

**Acceptance Scenarios**:

1. **Given** a canvas with 4 characters, 2 factions, and 5 labelled relationships, **When** the GM chooses Generate report → Entire canvas, **Then** a preview appears showing an overview count (characters/relationships/factions), a readable section per character, each character's relationships as plain-language lines, and faction sections — grouped by the canvas's explicit entity types and connections, not by where nodes happen to sit on the board.
2. **Given** the GM has not changed any option, **When** the report is generated, **Then** GM-only/secret fields are excluded, and descriptions, relationships, factions/affiliations, and portraits are included at Standard detail.
3. **Given** a generated report preview, **When** the GM saves it, **Then** it becomes a new Note-category entity in the vault, distinguishable from an ordinary note, and reopening it later shows the same content without needing to regenerate or export anything.
4. **Given** a saved report entity, **When** the GM edits its text directly (e.g., rewording a relationship line or fixing a name), **Then** the correction is saved exactly as it would be for any other vault entity, and persists the next time the report is opened.

---

### User Story 2 - Read and edit a saved report exactly like any other vault entity (Priority: P2)

Once a report exists as a vault entity, a GM opens, reads, and edits it the same way they'd open, read, and edit any other note — no separate report-specific screen, no raw markdown source view. The report reads with visible structure (headings, per-entity sections, relationship lines) because the generated content itself is well-structured, not because it's shown through special report-only presentation machinery.

**Why this priority**: This is what makes User Story 1's "keep it as a real document" promise actually pleasant to use, while keeping the feature simple: a GM never has to learn a second way of reading or editing content in Codex Cryptica just because it happens to be a report.

**Independent Test**: Open a saved report entity and confirm it opens, reads, and edits exactly like any other note (the same view/editor, the same behavior) — its structure is legible because of how it's written, not because of a bespoke report view — and that a "Regenerate" action is available and warns before overwriting manual edits.

**Acceptance Scenarios**:

1. **Given** a saved report entity, **When** the GM opens it, **Then** it opens in the app's standard entity view/editor — the same one used for every other note — never a separate report-only screen or a raw-markdown-source view.
2. **Given** the GM is viewing a saved report, **When** they switch to editing it, **Then** they edit it exactly as they would any other entity's content, with no report-specific editing mode.
3. **Given** a saved report entity, **When** the GM regenerates its content from the original canvas/selection (an explicit, separate action from opening or reading it), **Then** the system warns them first if doing so would replace manual edits made since it was created or last regenerated.

---

### User Story 3 - Generate a report from a selection of entities, wherever they're selected (Priority: P3)

A GM has a large board (a whole campaign map of factions and NPCs) but only wants a report about a subset — "just the party," or "just this conspiracy thread" — without building a second canvas or manually excluding entities. The same need shows up when the GM isn't on a canvas at all: they've selected a handful of entities in the Graph view while exploring connections, or checked off a few rows in the Table view, and want a report about exactly that set.

**Why this priority**: Large boards are the case where an unscoped report is least useful (too long, too much irrelevant context); scoping to a selection is what makes the feature usable on real, busy canvases rather than only small demo boards. Extending the same selection-based report to Graph view and Table view costs little beyond this (it reuses the same presentation layer and the same "both endpoints must be selected" rule) and makes the feature useful in the views a GM is already working in, not only on a canvas they'd otherwise have to set up first.

**Independent Test**: From any one of the three surfaces — a canvas with 8 entities (select 3), the Graph view (select 3 nodes), or the Table view (check 3 rows) — choose Generate report → Selected entities only, and confirm the report contains exactly those 3 and only the relationships between them, using the same report panel and presentation views regardless of which surface it was launched from.

**Acceptance Scenarios**:

1. **Given** 8 entities on a canvas with 3 selected, **When** Generate report → Selected nodes only is run, **Then** only the 3 selected entities appear, and a relationship from a selected entity to an unselected one is omitted entirely rather than shown as a dangling or broken reference.
2. **Given** no nodes are selected, **When** the GM chooses Selected nodes only, **Then** the system explains that at least one node must be selected and does not generate an empty or misleading report.
3. **Given** 3 entities selected in the Graph view (not on any canvas), **When** the GM chooses Generate report, **Then** the report is generated for exactly those 3 entities, using the same report panel, Include/Detail options, and entity/faction presentations as a canvas-sourced report.
4. **Given** a few rows checked in the Table view, **When** the GM chooses Generate report, **Then** the report behaves identically to the Graph view case — same selected-entities scope, same presentation, no "Entire canvas"-equivalent option offered (Table/Graph selections only ever report on exactly what's checked or selected).

---

### User Story 4 - Adjust what's included and how much detail before saving (Priority: P4)

A GM wants to control sensitivity and length before the report becomes a saved, editable document — hiding secrets and private notes, and choosing whether they want a one-line-per-character brief or a fuller writeup.

**Why this priority**: Builds directly on Stories 1–3's output; without it, every saved report is a fixed, all-or-nothing shape, and a GM who over-shared would have to hand-edit the saved entity afterward instead of simply not including that content in the first place.

**Independent Test**: While previewing a report (before saving), turn off "Notes," switch Detail from Standard to Brief, and confirm the live preview drops notes content and shortens entity sections to a one-line summary before the GM saves it.

**Acceptance Scenarios**:

1. **Given** a report preview at Standard detail, **When** the GM switches Detail to Brief, **Then** entity sections shorten to name, type/role, and a one-line summary, dropping fuller descriptions and secondary fields.
2. **Given** a report preview with GM-only/secret fields hidden (the default), **When** the GM explicitly enables that Include option, **Then** the previously-hidden content appears in the preview, visibly marked as GM-only, before the report is saved.
3. **Given** a report preview, **When** the GM changes any Scope, Include, or Detail option, **Then** the visible preview updates to reflect the change without needing to reopen the report panel.

---

### User Story 5 - Export a saved report to a format for use outside Codex Cryptica (Priority: P5)

A GM has a saved report entity they're happy with and, for a specific occasion (printing a handout, sending it to a co-GM), wants it in a format they can use outside Codex Cryptica.

**Why this priority**: Lowest priority precisely because User Story 1 already delivers the original request ("a document I can review and correct") without requiring this — the report is already usable, readable, and editable inside the app. Export to an external format is a genuine but secondary convenience on top of that, not the mechanism by which the report becomes useful.

**Independent Test**: From a saved report entity's normal entity view, use its export action, choose a format, and confirm the result (e.g., pasted from the clipboard) preserves the report's headings and relationship lines as structure.

**Acceptance Scenarios**:

1. **Given** a saved report entity, **When** the GM uses its export action and chooses a document-friendly text format, **Then** the result (e.g., clipboard contents) preserves headings, entity groupings, and relationship lines as structured text (e.g., Markdown) when used in an external tool.

---

### Edge Cases

- A canvas (or the current selection) contains entities but zero relationships between them: the report still renders entity sections, and simply omits the Relationships / Relationship Summary content rather than showing an empty heading.
- A canvas has zero entities on it at all: "Generate report" communicates there's nothing to report on rather than opening an empty or broken preview.
- An included entity has no portrait image on file: that entity's section renders without a portrait area, never a broken-image placeholder.
- Two or more canvases exist for the same campaign: a report is always scoped to the single canvas it was generated from, never merged with nodes from another canvas.
- A very large canvas (e.g., 50+ entities, "Entire canvas" scope) is reported on: the report still generates and remains navigable rather than failing or becoming unreadably long with no structure.
- The GM adjusts options repeatedly while still previewing (before saving): earlier previews aren't left visible or mixed with the current one, and nothing is written to the vault until the GM explicitly saves.
- A selection made in Graph view or Table view includes two entities that are related in the vault but have never been connected via any canvas: the relationship still appears, since Graph/Table-sourced reports read each entity's own stored connections rather than canvas edges (there are none to read).
- An entity selected in Graph view or Table view is also placed on one or more canvases: generating from the Graph/Table selection never pulls in other entities from those canvases — only the entities actually selected.
- The GM regenerates an already-saved report's content after having manually corrected it: the manual edits are not silently lost — the GM is warned before anything is overwritten.
- The GM generates a second report from the same canvas at a later date: this produces a separate, new report entity rather than silently overwriting the first one (regenerating a specific, already-saved report is instead the explicit action described in User Story 2).
- An entity referenced in a saved report is later deleted, renamed, or removed from the source canvas: the already-saved report's text is unaffected (it's independent, persisted content), even though a subsequent regeneration of that same report entity would reflect the change.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The Spatial Canvas MUST offer a "Generate report" action in its toolbar (`CanvasHUD`), next to its other board-level actions (the canvas has no general-purpose "Export" menu today; its only image export is inside the Delve dossier flow). This applies to entity-linking canvases (vault entities and their canvas relationships — conspiracy boards, family trees, campaign groups) only; it does not extend to the separate structured adventure-planning canvas, which already has its own "Finalize Dossier" export path.
- **FR-001a**: Graph view and Table view MUST each offer their own "Generate report" action, available whenever one or more entities are selected (Graph view) or checked (Table view).
- **FR-002**: "Generate report" from a canvas MUST open a panel offering a live preview plus: a Scope choice (Entire canvas / Selected nodes only), Include toggles (entity descriptions, relationships, factions/affiliations, portraits, notes, GM-only/secret fields), and a Detail level (Brief / Standard / Detailed).
- **FR-002a**: "Generate report" from Graph view or Table view MUST open the same panel and options as FR-002, except Scope is fixed to the current selection — there is no "Entire canvas"-equivalent ("entire graph" / "entire table") option for these two entry points.
- **FR-003**: GM-only/secret fields MUST be excluded from the report preview by default and MUST require the GM to explicitly enable them before they appear, in preview or once saved.
- **FR-004**: Choosing "Selected nodes only" with no nodes selected MUST NOT produce a preview; the system MUST tell the GM at least one node needs to be selected first.
- **FR-005**: The report's content MUST be derived only from each entity's explicit data and the canvas's explicit labelled relationships/connections. Node position, proximity, or visual layout on the canvas MUST NOT be used to infer a relationship, role, or grouping that isn't explicitly recorded.
- **FR-006**: When scope is "Selected nodes only," the report MUST include only the selected entities, and MUST include a relationship only when both of its endpoints are selected; a relationship to an entity outside the selection MUST be left out rather than shown as an unresolved or broken reference. The same "both endpoints must be included" rule governs every entry point (FR-006a).
- **FR-006a**: For a report generated from Graph view or Table view (i.e., with no canvas involved), relationships MUST be derived from each selected entity's own stored connections, filtered to pairs where both endpoints are in the selection — the canvas-equivalent of "explicit edges," since no canvas edges exist for these entry points.
- **FR-007**: Character/NPC entities MUST use a report-specific presentation (name, type/role, description or summary, relationships, affiliations) in the pre-save preview and in the structure of the generated content (its own heading, fields and relationship lines per character). This distinction applies to the generated report only — once saved, the report is shown in the standard entity view (FR-013b), so nothing here creates a separate screen.
- **FR-008**: Faction/group entities MUST use a presentation suited to a group — membership, connected characters, faction-level relationships — rather than the character-style profile used for individuals.
- **FR-009**: A relationship between two included entities MUST be rendered as a plain-language line derived from its stored label (e.g., "Vargas — friend → Lajos"), both inside each entity's own section and in a consolidated relationship summary.
- **FR-010**: The Detail level (Brief / Standard / Detailed) MUST change how much content each included entity's section shows (e.g., a one-line summary versus a fuller description and secondary fields) without changing which entities or relationships are included — that is governed by Scope and Include only.
- **FR-011**: The report MUST be viewable as a live preview inside Codex Cryptica immediately, with no file export step required to see it, before the GM decides whether to save it.
- **FR-012**: Changing any Scope, Include, or Detail option MUST update the visible report preview in place, without requiring the GM to close and reopen the report panel.
- **FR-013**: The GM MUST be able to explicitly save a generated report, turning it into a Note-category vault entity that persists independently of the canvas/selection/options that produced it.
- **FR-013a**: A saved report entity MUST be distinguishable from an ordinary note (e.g., so the app can list it, filter it, and offer report-specific actions such as Regenerate and Export), while still participating in normal vault mechanics available to notes: it can be found in search, listed, linked from other entities, and labelled. It MUST NOT add relationships to the entities it covers (a report is a document, not a hub in the graph).
- **FR-013b**: A saved report entity MUST be opened, read, and edited using the exact same entity view and editor Codex Cryptica already uses for every other note — no separate report-specific viewing surface, no raw-markdown-source view, and no distinct "read mode" formatting layer. Its structure (headings, per-entity sections, relationship lines) MUST be legible purely because the generated content is well-formed, not because of any report-only rendering.
- **FR-013c**: Editing a saved report entity MUST use the same underlying editing mechanics as any other vault entity, and edits MUST persist the same way (i.e., normal save/autosave behavior, no separate "report save" pathway).
- **FR-013d**: Regenerating a saved report entity's content from its original canvas/selection MUST be an explicit action, separate from simply opening it, and MUST warn the GM before replacing any manual edits made since it was created or last regenerated.
- **FR-013e**: Regenerating a report MUST use the scope and options the report was generated with (recorded with the report), so it works for reports made from a canvas, a canvas selection, the Graph view or the Table view, even though the original selection no longer exists. If the source is gone, the GM is told and nothing changes.
- **FR-014**: The logic that formats a given entity or relationship for the report (e.g., a character's report summary, a faction's report summary, a single relationship line) MUST be defined so that a future, unrelated feature needing a similarly formatted view of the same entity data can reuse it, rather than that formatting being rewritten or duplicated specifically for the report feature. This logic drives the pre-save preview (FR-011) and the content written into the saved entity (FR-013b) — it plays no further role once the entity exists, since viewing/editing then falls through to the app's ordinary entity view.
- **FR-015**: The report MUST apply a presentation appropriate to each entity's type when a canvas mixes types (characters, factions, locations, items, etc.) rather than forcing every entity into the character-style summary.
- **FR-016**: If an included entity has no portrait image, its report section MUST render without that image rather than showing a broken-image placeholder.
- **FR-017**: If the chosen scope results in zero eligible entities, the report MUST render a clearly labelled empty state explaining why, rather than an error or a blank panel, and MUST NOT be saveable in that state.
- **FR-018**: Eligibility for "Generate report" is limited to entity-linking canvas nodes (vault entities and their canvas relationships), per FR-001; the structured adventure-planning canvas and its node types are explicitly out of scope for this feature. _(Resolved during clarification: Q1 → Option A.)_
- **FR-019**: A Faction/group entity's membership list in the report MUST be limited to members whose connection to that faction is explicitly present within the report's own scope — a relationship/edge on the source canvas, or, per FR-006a, a stored connection between two entities both present in a Graph/Table selection. It MUST NOT pull in the faction's full vault-wide membership when some members fall outside that scope. A member is any entity with an in-scope relationship to the faction (in either direction, whatever the relationship's label); a relationship between two factions is a faction-level relationship, not membership. A character's affiliations are the factions it is a member of by this same rule. _(Resolved during clarification: Q2 → Option A.)_
- **FR-020**: From a saved report entity's normal entity view, the GM MUST be able to export its content to at least one document-friendly text format (at minimum, Markdown or an equivalent that preserves headings and structure) for use outside Codex Cryptica. This is offered as an action on the already-saved entity, not as the only way to make use of a generated report.
- **FR-021**: A saved report MUST NOT be included in guest or public output (guest snapshots, the public world directory). A report can contain GM-only text once the GM opts in, so it is treated as GM material regardless of visibility settings.

### Key Entities

- **Canvas (Spatial Canvas board)**: A GM-curated arrangement of entity nodes and labelled connections. It is the source of truth for what a report's "Entire canvas" or "Selected nodes" scope contains, and the only entry point that offers an "Entire canvas" scope.
- **Selection (Graph view / Table view)**: A set of entities a GM has selected (Graph view) or checked (Table view) outside of any canvas. It behaves like a canvas's "Selected nodes only" scope, but has no canvas edges of its own — see FR-006a.
- **Entity**: An existing vault record (character, NPC, faction, location, item, etc.) with descriptive fields. Some fields are GM-only/secret and excluded from the report by default.
- **Relationship / Connection**: A labelled, directional link between two entities. On a canvas, this is the canvas's own edge plus each in-scope entity's own stored connection (the ones Graph view shows), with identical pairs shown once; from Graph view or Table view, this is the entity's own stored connection (FR-006a). Either is the basis for every relationship line and the relationship summary in the report.
- **Report (pre-save preview)**: The transient, live-updating result of a chosen Scope, Include set, and Detail level, shown before the GM decides to save it. Nothing is written to the vault until it's saved (FR-013).
- **Report entity**: The persisted form of a report — a Note-category vault entity, distinguishable from an ordinary note (FR-013a), opened and edited through the app's standard entity view with no report-specific surface (FR-013b–c), regeneratable with a manual-edit warning (FR-013d), and independently exportable to document-friendly formats (FR-020).
- **Presentation view**: A named way of formatting a given entity or relationship for a given context and density (e.g., a compact canvas card, a report summary, a fuller report detail, a short relationship reference, a faction summary), shared across features and used both for the pre-save preview and for the content written into the saved report, rather than owned by any one of them. It plays no part in viewing the saved report, which uses the standard entity view.

## Assumptions

- The vault has no separate "notes" field, so the report's Include options map onto existing entity data deterministically: "descriptions" is an entity's text before its first heading, "notes" is its remaining sections, and "GM-only/secret fields" is the entity's private lore field. The same mapping is used for every entry point.
- A report entity's title on save is either GM-provided or defaulted sensibly (e.g., derived from the source canvas's name or the current date); the exact default is a presentation detail for planning, not a behavior this spec needs to pin down.
- "GM-only/secret fields," as the vault's data model already defines them (fields such as an entity's private lore/art-direction notes, and entities/relationships already hidden from players by existing visibility settings), are the fields excluded by default; this feature reuses that existing distinction rather than introducing a new one.
- Default option state on first opening the report panel: Scope = Entire canvas, Detail = Standard, and every Include toggle on except GM-only/secret fields (off, per FR-003). "Notes" defaults on as a normal content category, distinct from GM-only/secret fields.
- Because the report is now a real, editable vault entity, dedicated Word (.docx) and PDF _file_ export (as opposed to the Markdown/rich-text copy already required by FR-020) are lower-priority follow-on work: the original request ("review and correct it") is already satisfied by editing the saved entity in-app. Additional export formats are out of scope for this spec and can be proposed as a follow-up feature.
- The Table view already has row selection (checkboxes, select-all, and a bulk-actions bar that appears when rows are selected); "Generate report" is added to that existing bulk-actions bar, and no new selection affordance is built.
- Graph view and Table view are additional _entry points_ into the same report capability, not a second implementation: FR-014's reusable presentation layer is what FR-001a relies on to behave identically regardless of origin, and what FR-011's preview and the content saved per FR-013b are both built from.
- A report entity's distinguishing marker (FR-013a) is what lets the app offer report-specific actions (Regenerate, Export) and filter/list reports as such — it is not a new top-level entity type, and it does not change how the entity is viewed or edited (FR-013b), consistent with how the vault already distinguishes specialized notes (e.g., existing adventure-planning notes) from ordinary ones without a schema change or a bespoke view.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A GM can go from an open, populated canvas to a readable, structured report preview in under 10 seconds of interaction (excluding their own reading time).
- **SC-002**: 100% of GM-only/secret fields are absent from a report preview or saved report entity unless the GM has explicitly enabled them for that report.
- **SC-003**: A report generated with "Selected nodes only" never contains an entity or a relationship that fell outside the selection.
- **SC-004**: A GM can read a saved report and correct anything in it entirely inside Codex Cryptica — opening it, editing it, and returning to it later — without ever invoking an export action.
- **SC-005**: A GM's manual corrections to a saved report survive being reopened later, and are never silently discarded by an unrelated action elsewhere in the app.
- **SC-006**: The entity-presentation logic built for this feature is reused, unmodified in its core formatting rules, by at least one other view of entity data introduced after this feature ships (e.g., a later handout, dashboard, or briefing view), rather than that later feature reimplementing entity-to-text formatting from scratch.
- **SC-007**: GMs who try the feature describe the output as a document they could hand someone, not as a list of raw fields or a picture of the board.
- **SC-008**: A report generated from a Graph view or Table view selection is indistinguishable in structure and presentation from one generated from an equivalent canvas selection — a GM can't tell which surface it came from just by reading it.
