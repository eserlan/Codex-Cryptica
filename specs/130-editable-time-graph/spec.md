# Feature Specification: Editable Time Graph with Semantic Temporal Placement

**Feature Branch**: `130-editable-time-graph`
**Created**: 2026-06-04
**Status**: Implemented
**Implementation Plan**: [plan.md](./plan.md)
**Source**: GitHub issue #1159
**Input**: User description: "Add an edit mode to the time graph where users can drag entities along the timeline to define or adjust their chronological meaning. Dragging an entity should not only change visual layout — it should create or update structured temporal metadata. The goal is to make the time graph both a visualisation and a chronology editing tool."

## Overview

The vault already has a read-only **Timeline Mode** (spec `026-world-timeline`) that positions dated nodes along a chronological axis based on existing temporal metadata (`date`, `start_date`, `end_date`, `era`). This feature extends the time graph from a passive visualisation into an **interactive chronology editing tool**: in an explicit edit mode, a World Builder drags an entity horizontally along the time axis, and on drop confirms what that placement _means_ (born, founded, became active, etc.). Confirming writes structured temporal metadata — modelled as one or more **temporal anchors** per entity — rather than storing a raw graph coordinate.

The defining constraint is **canon safety**: moving a node must never silently mutate lore. View mode remains the deterministic default; mutation happens only inside an explicit edit-chronology mode, only after a semantic confirmation, and only to the metadata field/anchor the user confirms.

> **Terminology note**: This spec's **temporal anchor** (a per-entity chronological meaning such as born/founded/disappeared) is distinct from the existing calendar `DateSelection.precision: "anchor"` / `anchorId` in `packages/schema` (a _calendar reference point_). The two concepts must not be conflated in naming during implementation.

## Clarifications

### Session 2026-06-04

- Q: When a placement is saved, where does the temporal value live — a new `temporalAnchors` array or the existing flat fields? → A: **Hybrid, legacy authoritative for the primary.** The existing `date`/`start_date`/`end_date` fields remain the source of truth for an entity's primary point/range (existing Timeline Mode reads and current vaults untouched, zero migration). A new `temporalAnchors[]` stores _additional/multiple/custom_ meanings. The primary legacy field is also surfaced as a derived anchor in the editable view.
- Q: When dragging an entity that already has temporal anchors, what does the drag affect? → A: **The specific anchor point grabbed.** Each anchor renders as its own draggable point; grabbing one proposes updating _that_ anchor, and the confirmation popover also offers "create a new anchor instead." Both adjusting an existing anchor and adding a new one are reachable directly from the graph.
- Q: Is undo of a committed chronology change required this iteration? → A: **Deferred.** No general entity-edit undo exists in the codebase (only oracle/canvas/dice have bespoke undo), so undo is treated as a fast-follow. Cancel-before-save plus normal re-editing is the safety net for this iteration. FR-008 stays a non-blocking SHOULD; SC-007 is moved to a later iteration.
- Q: The issue lists a "Period" entity type — does it exist? → A: **No.** The default categories are character, creature, location, item, event, faction, note; there is no "Period" type. Date ranges live in the existing `start_date`/`end_date` fields on **any** entity (US3 is reframed around that). The named **Era** is background-region _config_ (`graph.eras`, start_year/end_year), not entity lore — dragging Era boundaries is out of scope this iteration.
- Q: How are non-enumerated/custom categories (e.g. the default Creature) handled in the popover? → A: They use a **generic fallback** meaning set — a begin point (`date`), an optional range (`start_date`/`end_date`), and the universal custom anchor (FR-016).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Drag an Event to set its date (Priority: P1) 🎯 MVP

As a World Builder, when I am in chronology edit mode, I want to drag an Event node horizontally along the time axis and have the graph show me the target year as I drag, so that on drop I can confirm "Set event date to 605 P.C.?" and have the event's date metadata updated directly from the graph.

**Why this priority**: This is the smallest end-to-end slice that proves the core value — direct manipulation of time becomes a structured metadata edit. Events have a single, unambiguous primary date, so they require the simplest confirmation (a direct yes/no) and exercise the whole pipeline: mode toggle → drag → live axis indicator → drop → confirm → metadata write → re-render. Delivered alone, it is already a usable chronology editor for the most common dated entity.

**Independent Test**: Enter edit-chronology mode, drag an Event node to a new horizontal position, observe the live target-year indicator, drop, confirm the direct prompt, and verify the Event's date metadata changed and persisted (survives reload).

**Acceptance Scenarios**:

1. **Given** an Event with date "601 P.C." and the graph in edit-chronology mode, **When** I drag the node to the position corresponding to 605 P.C., **Then** the axis shows a live "605 P.C." indicator while dragging.
2. **Given** I have dragged the Event and released it, **When** the confirmation prompt "Set event date to 605 P.C.?" appears and I confirm, **Then** the Event's date metadata is updated to "605 P.C." and the node settles at the position derived from that new date.
3. **Given** the same drag, **When** I cancel the confirmation instead, **Then** the Event's date metadata is unchanged and the node returns to its original position.
4. **Given** I confirmed a date change, **When** I reload the vault, **Then** the Event still shows the new date (the change was a metadata write, not a transient layout offset).

---

### User Story 2 - Semantic placement popover for non-trivial entities (Priority: P1)

As a World Builder, when I drag a Character, Faction, Location, Item, or Note in edit-chronology mode, I want a popover that asks what the placement represents and offers meanings appropriate to that entity type, so that I can record, for example, that a Character was _born_ in 580 P.C. rather than guessing which hidden field to edit.

**Why this priority**: Most entity types do not have one obvious "the date" field — a Character has birth, death, active period, reign, and appearances. Without the semantic popover, dragging these entities is meaningless. This story is what makes the feature general across the entity model rather than an event-only tool, and together with US1 it forms the complete drag-to-place experience.

**Independent Test**: In edit-chronology mode, drag a Character to 580 P.C.; verify the popover offers Character-appropriate meanings (Born, Died, Became active, Reign, Major appearance, Custom anchor), select "Born", save, and confirm a `born` temporal anchor with date 580 P.C. is recorded on that Character.

**Acceptance Scenarios**:

1. **Given** a Character dragged to 580 P.C., **When** the popover opens, **Then** it shows the entity name, the target year, and a list of meanings appropriate to a Character (e.g. Born, Died, Became active, Reign period, Major appearance, Custom anchor).
2. **Given** a Faction dragged in edit mode, **When** the popover opens, **Then** the offered meanings are Faction-appropriate (e.g. Founded, Dissolved, Active period, Schism, Merger) and differ from those offered for a Character.
3. **Given** the popover open with a meaning selected, **When** I save, **Then** the popover states which metadata field or anchor will be created/updated before the write occurs, and after saving that anchor exists on the entity.
4. **Given** a meaning that represents a span (e.g. "Active period", "Reign"), **When** I select it, **Then** I can specify both a start and end value rather than a single point.
5. **Given** any open popover, **When** I cancel, **Then** no temporal metadata is created or modified.

---

### User Story 3 - Set a date range (start/end) by dragging (Priority: P2)

As a World Builder, I want to give **any entity** a date _range_ — a start and an end — by dragging on the time axis (sweeping a span, or adjusting a start/end edge), so that I can reshape spans such as an Event's duration, a Character's active period, or a Faction's lifetime directly on the graph.

> **Note on "Period" vs "Era"**: The codebase has no "Period" entity type; date ranges live in the existing `start_date`/`end_date` fields on **any** entity. The in-world calendar's named **Eras** are background-region _configuration_ (not entity lore); dragging Era boundaries is a separate concern and is **out of scope** this iteration (see Out of Scope).

**Why this priority**: Ranges use the existing `start_date`/`end_date` fields and render as spans rather than points, so they need range-aware handling (sweep a width, or drag a start/end edge) that the point-based stories do not cover. Valuable but builds on the interaction model established by US1/US2.

**Independent Test**: In edit-chronology mode, give an entity a start/end range by sweeping a span (or dragging an edge of an existing range), confirm, and verify its `start_date`/`end_date` metadata updated accordingly.

**Acceptance Scenarios**:

1. **Given** an entity with a range 500–600 P.C., **When** I drag the whole span 50 years later, **Then** the confirmation reflects a new range of 550–650 P.C. and on save both start and end update.
2. **Given** the same entity, **When** I drag only its end edge to 650 P.C., **Then** the confirmation reflects 500–650 P.C. and only the end date updates on save.
3. **Given** a drag that would invert the range (end before start), **When** I attempt to drop, **Then** the system prevents the invalid range and explains why, leaving metadata unchanged.
4. **Given** any span-capable entity in edit-chronology mode, **When** I press at one year and drag out a horizontal width before releasing, **Then** the placement is resolved as a span (press = start, release = end) and the confirmation defaults to span meanings with both ends pre-filled (FR-011a).

---

### User Story 4 - Multiple temporal anchors per entity (Priority: P2)

As a World Builder, I want a single entity to hold several temporal anchors — for example a Character who was born in 580 P.C., had a major appearance in 621 P.C., and disappeared in 634 P.C. — so that figures who recur across history are represented faithfully instead of being flattened to one date.

**Why this priority**: The temporal-anchor model is the structural heart of the feature; supporting more than one anchor per entity is what distinguishes it from the existing single-date timeline. It depends on US2 (anchor creation) being in place, hence P2.

**Independent Test**: Add three anchors of different types to one Character via successive drags/confirmations, and verify all three persist and that the entity renders at the corresponding positions.

**Acceptance Scenarios**:

1. **Given** a Character that already has a `born` anchor, **When** I grab its born point and drag, **Then** the confirmation proposes updating the born anchor _and_ offers "create a new anchor instead"; choosing the latter at 621 P.C. as `majorAppearance` yields two distinct anchors and neither overwrites the other.
2. **Given** an entity with multiple anchors, **When** I view it in the time graph, **Then** it renders at each anchored position (e.g. as repeated points, a track, or a grouped node with expandable anchors) rather than at a single point.
3. **Given** an entity with multiple anchors, **When** I edit or remove one anchor, **Then** the other anchors are unaffected.
4. **Given** an anchor optionally linked to another entity (e.g. a major appearance tied to an event), **When** I record it, **Then** the link is preserved on the anchor.

---

### User Story 5 - Clear distinction between editing lore and editing layout (Priority: P3)

As a World Builder, I want it to be visually unmistakable when a drag changes canon (temporal metadata) versus when it merely rearranges the visual layout, so that I never alter history by accident.

**Why this priority**: A safety and confidence layer over the core editing flows. It does not add new placement capability but materially reduces the risk of accidental canon changes and increases trust, which the issue calls out explicitly. Sequenced last because it polishes flows defined in US1–US4.

**Independent Test**: Toggle between view, layout-only movement (if present), and edit-chronology mode and confirm each is visually distinct, and that only edit-chronology drags can write temporal metadata.

**Acceptance Scenarios**:

1. **Given** the time graph, **When** I am in view mode, **Then** entities cannot have their temporal metadata changed by dragging, and the mode is clearly indicated.
2. **Given** edit-chronology mode is active, **When** I look at the graph, **Then** it is visually obvious (mode indicator and/or drag affordance) that drags will change lore.
3. **Given** non-temporal layout movement is supported, **When** I move a node for layout only, **Then** it is visually distinct from a chronology-editing drag and does not write temporal metadata.

> _Undo of a committed chronology change is deferred to a later iteration (see Clarifications); cancel-before-save is the safety net for this iteration._

---

### User Story 6 - Place an entity from the Explorer by dragging it onto the timeline (Priority: P3)

As a World Builder, I want to drag an entity out of the Entity Explorer and drop it onto the time axis, so that I can give a chronological placement to an entity that is **not yet on the timeline at all** — including brand-new or undated entities — without first opening its detail panel to type a date.

**Why this priority**: The in-graph stories (US1–US4) can only reposition entities that already appear on the timeline; an entity with no temporal metadata is hidden from Timeline Mode and cannot be grabbed there. This story is the entry path for _first-time_ placement: it lets a World Builder pull any entity from the full Explorer list straight into time. It reuses the semantic-placement flow from US1/US2, so it is sequenced after them but adds a distinct, high-value interaction surface (external drag-and-drop onto the canvas).

**Independent Test**: In edit-chronology mode, drag an undated entity from the Explorer, drop it at a target year on the axis, complete the resulting confirmation/popover, and verify the entity gains temporal metadata, now appears on the timeline at that year, and persists across reload.

**Acceptance Scenarios**:

1. **Given** edit-chronology mode is active and an entity with no temporal metadata listed in the Explorer, **When** I drag it from the Explorer and drop it on the axis at ~610 P.C., **Then** the live indicator shows the target year during the drag and, on drop, the same confirmation flow opens (direct for an Event, semantic popover otherwise) for that entity as a **point** at 610 P.C.; if I then choose a span meaning, I set the end via the popover's start/end fields (FR-011b).
2. **Given** that drop, **When** I confirm the placement, **Then** the entity gains the corresponding temporal metadata, immediately appears on the timeline at the resolved year, and the placement persists across reload.
3. **Given** I drag an entity from the Explorer but drop it outside the axis / on empty canvas, **When** I release, **Then** no placement is created and no metadata changes (consistent with the invalid-drop rule).
4. **Given** the graph is in view mode (edit-chronology off), **When** I drag an entity from the Explorer onto the timeline, **Then** it does not change any temporal metadata (external placement is gated by edit-chronology mode, like in-graph drags).
5. **Given** an entity that is already on the timeline, **When** I drag it from the Explorer and drop it at a year, **Then** the same update-or-add-anchor flow applies and the entity is not duplicated.

---

### User Story 7 - Create a linked event by dragging an entity onto the timeline (Priority: P3)

As a World Builder, in edit-chronology mode I want the option — when I drag an entity to a year — to **create a new Event at that time, linked back to the entity**, so that I can capture "something happened to this entity then" as a real, relational event node (with its own lore and participants) rather than only an abstract anchor.

**Why this priority**: This turns the timeline into a lightweight event-authoring surface and realises the `linkedEntityId` already present in the temporal-anchor model (e.g. a major appearance tied to an event). It is sequenced last among placement stories because it builds on the semantic popover (US2), the anchor model (US4), and the vault's entity-creation path, and because creating entities is the most consequential action — it must be an explicit, opt-in choice, never automatic.

**Independent Test**: In edit-chronology mode, drag a Character to ~621 P.C., choose "Create an event here", accept/edit the pre-filled title, and save; verify a new Event entity exists dated 621 P.C., the Character has an anchor whose `linkedEntityId` references that event, and a connection joins the two — all persisting across reload.

**Acceptance Scenarios**:

1. **Given** edit-chronology mode and an entity dragged to a year, **When** the confirmation opens, **Then** one of the offered options is **"Create an event here"**, alongside setting a date / adding an anchor (it is offered for any dragged entity, not only those already on the timeline).
2. **Given** I choose "Create an event here", **When** the option expands, **Then** it shows an **editable, pre-filled title** (e.g. "Avel Darvold — 621 P.C.") and states that it will create a new Event and link it to the dragged entity before saving (FR-005).
3. **Given** I confirm, **When** the save completes, **Then** a new **Event** entity is created dated at the resolved year (via the normal entity-creation path, gaining auto-Labels and a unique id), an anchor is added to the dragged entity with `linkedEntityId` referencing the new event, and a connection is created between the two entities.
4. **Given** the dragged entity already has a placement, **When** I grab one of its points and choose "Create an event here", **Then** a new event is created **without moving or altering** the existing primary date or existing anchors (the action is purely additive).
5. **Given** the confirmation is open, **When** I cancel, **Then** no event, anchor, or connection is created and the dragged entity is unchanged.

---

### Edge Cases

- **Undated entity dragged in edit mode**: An entity with no existing temporal metadata, when dragged and confirmed, gains its first anchor; the system must not require it to have had a date beforehand.
- **Non-numeric / fictional calendar values**: Dates use in-world notation (e.g. "604 P.C."). Placement requires a value the axis can position numerically; the system maps recognised in-world dates to axis positions and rejects or flags values it cannot place, without corrupting the stored label.
- **Drop outside the axis / on empty canvas**: A drop that does not correspond to a meaningful time position cancels the placement rather than writing a garbage date.
- **Overlapping anchors at the same position**: Multiple entities (or multiple anchors) sharing a year must be offset along the non-temporal axis so none is occluded (consistent with existing Timeline Mode behaviour).
- **Cancel mid-drag**: Pressing escape or releasing on an invalid target during a drag aborts with no metadata change and returns the node to origin.
- **Concurrent edit / sync conflict**: If the same entity's temporal metadata changes elsewhere (e.g. via vault sync) while a popover is open, saving must not silently clobber the newer value; surface the conflict.
- **Span inversion**: Any edit that would make an end precede its start is rejected with an explanation.
- **Linked-entity anchor whose target is deleted**: An anchor referencing a now-missing linked entity must degrade gracefully (anchor remains as a plain dated anchor; link is shown as broken rather than crashing the view).
- **Mode exit with an open popover**: Leaving edit-chronology mode while a confirmation is pending is treated as a cancel (no write).
- **Explorer drop with no node to restore**: An entity dragged from the Explorer has no pre-existing timeline node, so a cancelled external placement simply creates nothing (there is no node position to restore); the entity stays off the timeline.
- **Explorer drop of an entity already on the timeline**: Treated as an update-or-add-anchor placement on the existing entity, never as a new/duplicate node.
- **Linked-event creation cancelled or failed**: If the user cancels, or entity creation/linking fails partway, the vault MUST be left with no orphaned event, dangling anchor, or stray connection (FR-039).

## Requirements _(mandatory)_

### Functional Requirements

#### Modes & safety

- **FR-001**: The time graph MUST provide two explicit modes — a **view mode** (default) and an **edit-chronology mode** — with a clear, visible indication of which is active.
- **FR-002**: In view mode, entity positions MUST be derived solely from existing temporal metadata, and dragging MUST NOT create or modify any temporal metadata.
- **FR-003**: Temporal metadata mutation MUST be possible only while edit-chronology mode is active.
- **FR-004**: The system MUST NOT silently mutate temporal metadata as a side effect of a drag; every mutation MUST be preceded by an explicit user confirmation.
- **FR-005**: Before a save commits, the confirmation UI MUST state which metadata field or temporal anchor will be created or updated.
- **FR-006**: Cancelling a placement (via cancel control, escape, drop on an invalid target, or exiting edit mode) MUST leave all entity temporal metadata unchanged and return the dragged node to its pre-drag position.
- **FR-007**: The UI MUST make it unmistakable when a drag changes lore (temporal metadata) versus when it only changes visual layout; if non-temporal layout movement is supported, the two MUST be visually distinct.
- **FR-008**: The system SHOULD support undo of a committed chronology change, reverting the affected temporal metadata to its prior value. **(Deferred to a later iteration** — see Clarifications; no general entity-edit undo exists today, so cancel-before-save is the safety net for this iteration.)

#### Drag interaction

- **FR-009**: In edit-chronology mode, users MUST be able to drag entities horizontally along the time axis.
- **FR-009a**: For an entity rendered at multiple anchored positions, each anchor MUST be an individually grabbable point. Dragging a specific anchor point MUST propose updating _that_ anchor, and the resulting confirmation MUST also offer the option to create a new anchor instead of updating the grabbed one.
- **FR-009b**: In edit-chronology mode, users MUST be able to drag an entity from the Entity Explorer and drop it onto the time axis. This MUST work for entities that are **not yet on the timeline**, including new or undated entities, giving them a chronological placement for the first time. The drop year MUST be resolved as in FR-011 and the same confirmation flow MUST apply (direct for Events per FR-013, semantic popover otherwise per FR-015).
- **FR-009c**: External (Explorer→timeline) placement MUST be gated by edit-chronology mode and MUST obey the same canon-safety rules as in-graph drags: no write without explicit confirmation (FR-004), an invalid/out-of-axis drop cancels without a write (FR-012), and dropping an entity already on the timeline MUST follow the update-or-add-anchor flow without duplicating the entity.
- **FR-010**: While dragging, the graph MUST display a live indicator of the target year/date/period at the current drag position.
- **FR-011**: On drop, the system MUST resolve the drag position to a concrete temporal value (point or range) before presenting the confirmation.
- **FR-011a**: For in-canvas drags, the **gesture shape** MUST determine point-vs-span: a quick drop (press and release at effectively one position) resolves to a **point** at that year; a press-hold-drag that sweeps a horizontal width resolves to a **span**, where the press position is the begin year and the release position is the end year. The confirmation MUST default to the entity type's **begin** meaning for a point gesture and its **begin→end** pair for a span gesture (see FR-016a), while still letting the user change the meaning. A span gesture MUST pre-fill both begin and end in the confirmation (FR-018).
- **FR-011b**: For Explorer→timeline drops (FR-009b), because the external drag ends on release, the drop MUST resolve to a **point** (a start candidate); if the chosen meaning is a span, the end MUST be set via the confirmation popover's start/end fields rather than a continued drag.
- **FR-012**: A drop that cannot be resolved to a meaningful temporal position MUST cancel the placement without writing metadata.

#### Semantic placement

- **FR-013**: Dragging an **Event** MUST allow setting or updating its date through a direct confirmation (no full meaning-selection popover required for the primary date).
- **FR-014**: Dragging a **span** (an entity's `start_date`/`end_date` range) MUST allow setting or updating its start and/or end, including dragging the whole span or an individual start/end edge. This applies to any entity given a range (e.g. an Event with a duration, a Character's active period), not to a dedicated "Period" entity type (which does not exist in the model).
- **FR-015**: Dragging any other entity type MUST open a semantic placement popover that asks what the placement represents.
- **FR-016**: The meanings offered in the popover MUST depend on the entity type, at minimum:
  - **Character**: birth, death, active period, reign, major appearance
  - **Faction**: founded, dissolved, active period, schism, merger
  - **Location**: founded, destroyed, occupied, golden age, relevant period
  - **Item**: created, discovered, lost, ownership period, recovered
  - **Note**: associated date, associated period, custom anchor
  - Any other category (the default **Creature** type, or any user-defined/custom category) MUST fall back to a **generic** set — a begin point (`date`), an optional range (`start_date`/`end_date`), and the universal custom anchor.
- **FR-016a**: Each entity type's meaning set MUST designate a **begin** meaning — the category-correct word for when the entity starts existing/being relevant — and, where applicable, a corresponding **end** meaning. These are the same underlying concept ("when it started" / "when it ended") expressed with the right word per type:

  | Entity type                      | Begin meaning        | End meaning        |
  | -------------------------------- | -------------------- | ------------------ |
  | Event                            | date (or start date) | end date           |
  | Character                        | born                 | died               |
  | Faction                          | founded              | dissolved          |
  | Location                         | founded              | destroyed          |
  | Item                             | created              | lost / destroyed   |
  | Note                             | associated date      | — (optional)       |
  | _Other / custom (e.g. Creature)_ | date (generic begin) | end date (generic) |

  A point drop defaults to the **begin** meaning; a span gesture defaults to the **begin→end** pair for that type. Users MAY still select any other meaning from the type's set (e.g. major appearance, reign, schism, discovered).

- **FR-017**: The popover MUST offer a **custom anchor** option allowing a user-named temporal meaning when no preset fits.
- **FR-018**: Meanings that represent a span MUST let the user provide both start and end values; meanings that represent a point MUST capture a single value.
- **FR-019**: The popover MUST display the entity name and the resolved target time to confirm context before saving.

#### Temporal anchor data model

- **FR-020**: An entity MUST be able to hold one or more temporal anchors, stored in a new `temporalAnchors[]` collection that supplements (does not replace) the existing flat `date`/`start_date`/`end_date` fields.
- **FR-020a**: The existing flat `date`/`start_date`/`end_date` fields MUST remain the source of truth for an entity's **primary** point/range. Saving a placement whose meaning maps to the primary point/range MUST update the corresponding legacy field (so existing Timeline Mode reads and current vaults keep working with zero migration), and that primary value MUST also be surfaced as a derived anchor in the editable view.
- **FR-020b**: `temporalAnchors[]` MUST store only _additional_ meanings beyond the primary — secondary appearances, custom anchors, and any meaning not represented by a legacy field. Entities with no additional meanings MUST NOT require a `temporalAnchors[]` entry.
- **FR-021**: Each temporal anchor MUST carry an identifier and a type (the semantic meaning), and MUST be able to carry a point date, a start/end range, an optional link to another entity, and an optional note. Anchor dates MUST use the same temporal value shape the schema already uses for `date` (a `TemporalMetadata`/`DateSelection`), not a free-form string.
- **FR-022**: Saving a placement MUST write structured temporal metadata (a legacy date/range field per FR-020a, or a `temporalAnchors[]` entry), NOT a raw graph coordinate.
- **FR-023**: Adding a new anchor to an entity MUST NOT overwrite or remove its existing anchors or its primary legacy date field.
- **FR-024**: Users MUST be able to edit or remove an individual anchor without affecting the entity's other anchors or its primary legacy date field.
- **FR-025**: Pre-existing date metadata (`date`, `start_date`, `end_date`, and any `Era` membership for background regions) MUST position entities correctly in the editable view without manual migration; the primary fields are read in place and presented as derived anchors rather than being copied into `temporalAnchors[]`.

#### Rendering

- **FR-026**: An entity with a single temporal anchor MUST render as a point/node on the time axis.
- **FR-027**: An entity with a start/end anchor MUST render as a span.
- **FR-028**: An entity with multiple anchors MUST render at each anchored position (e.g. repeated points, a track, or a grouped/expandable representation) rather than collapsing to one position.
- **FR-029**: Entities or anchors sharing the same temporal position MUST be offset on the non-temporal axis so none is visually occluded.
- **FR-030**: View-mode positioning MUST remain deterministic — the same temporal metadata always yields the same arrangement.

#### Integrity & conflicts

- **FR-031**: Edits that would invert a range (end before start) MUST be rejected with an explanation, leaving metadata unchanged.
- **FR-032**: If an entity's temporal metadata is changed by another source while a placement confirmation is open, saving MUST NOT silently overwrite the newer value; the conflict MUST be surfaced to the user.
- **FR-033**: An anchor whose linked entity no longer exists MUST degrade gracefully (retained as a dated anchor with the link shown as broken) without breaking the time-graph view.
- **FR-034**: The feature MUST function without any AI service; temporal editing MUST NOT depend on AI.

#### Event creation from placement

- **FR-035**: In edit-chronology mode, the placement confirmation MUST offer a **"create a linked event"** option for any dragged entity (not only entities already on the timeline), as an explicit, opt-in choice — never an automatic side effect of a drag.
- **FR-036**: Choosing "create a linked event" MUST create a new **Event** entity dated at the resolved target year via the standard entity-creation path (so it gains auto-Labels and a unique id), and MUST present an **editable, pre-filled title** before saving.
- **FR-037**: On save, the system MUST link the new event to the dragged entity by both (a) adding a temporal anchor on the dragged entity whose `linkedEntityId` references the new event, and (b) creating a connection between the two entities.
- **FR-038**: Creating a linked event MUST be purely **additive** — it MUST NOT move or alter the dragged entity's existing primary date or existing anchors.
- **FR-039**: Cancelling MUST create no event, anchor, or connection (canon safety); a failure during creation MUST surface an error rather than leave a half-created/half-linked state.

### Key Entities

- **Temporal Anchor**: A structured record of one chronological meaning for an entity. Attributes: identifier; type/meaning (e.g. born, died, founded, dissolved, majorAppearance, custom); optional point date; optional start date and end date (for spans); optional linked-entity reference; optional note. Dates reuse the schema's existing `TemporalMetadata`/`DateSelection` shape. An entity's _primary_ meaning lives in the legacy `date`/`start_date`/`end_date` fields and is presented as a derived anchor; _additional_ meanings are stored in the entity's `temporalAnchors[]` collection.
- **Entity (time-graph participant)**: Any vault node that can be placed in time (default categories: Event, Character, Creature, Location, Item, Faction, Note — plus any user-defined category). Retains its existing flat `date`/`start_date`/`end_date` fields (authoritative for the primary point/range) and gains a `temporalAnchors[]` collection for additional meanings.
- **Entity-type meaning set**: The mapping from an entity type to the list of suggested temporal meanings shown in the placement popover (Character → birth/death/active/reign/appearance, etc.), plus the universal custom-anchor option.
- **Placement interaction (transient)**: The in-progress drag state — source entity, live resolved target time, and pending confirmation — that exists only between drag-start and save/cancel and never persists as layout coordinates.
- **Mode state**: Whether the time graph is in view mode or edit-chronology mode, governing whether drags can mutate temporal metadata.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can change an Event's date by dragging it on the graph and confirming, in under 10 seconds, with the change persisting across reload.
- **SC-002**: 100% of temporal-metadata changes originate from an explicit confirmation; zero metadata changes occur from a drag that the user cancelled.
- **SC-003**: For every entity type with a dedicated meaning set (Event, Character, Faction, Location, Item, Note), the placement popover offers type-appropriate meanings (no Character meanings shown for a Faction, etc.); any other category (default Creature, or a custom category) shows the documented generic fallback set.
- **SC-004**: A single entity can carry at least three distinct temporal anchors simultaneously, all of which persist and render at their respective positions.
- **SC-005**: 100% of entities already dated under the existing Timeline Mode position identically after the anchor model is introduced (no regression, no manual migration required).
- **SC-006**: In a usability check, users correctly identify whether the graph is in view mode or edit-chronology mode on first glance at least 90% of the time.
- **SC-007**: _(Deferred to a later iteration.)_ A committed chronology change can be reverted via undo with the metadata returning exactly to its prior value in 100% of attempts.
- **SC-008**: No drag interaction leaves a raw graph coordinate stored as the entity's temporal value (100% of saved placements resolve to structured date/range/anchor metadata).
- **SC-009**: A user can place a previously-undated entity onto the timeline by dragging it from the Entity Explorer and confirming, in under 15 seconds, with the placement persisting across reload and the entity now appearing in Timeline Mode.
- **SC-010**: A user can create a linked event by dragging an entity and confirming, producing a dated Event, a linking anchor (`linkedEntityId`), and a connection between the two — in under 20 seconds, all persisting across reload, with the dragged entity's existing placement unchanged.

## Assumptions

- This feature builds directly on the existing World Timeline (`026-world-timeline`): the read-only chronological graph, numeric axis positioning, era backgrounds, and date metadata already exist and are reused. This spec adds the _editable_ layer and the multi-anchor model on top.
- Dates are expressed in the campaign's in-world calendar notation (e.g. "604 P.C."); positioning relies on resolving these to a numeric year as Timeline Mode already does. Calendar-format handling beyond what Timeline Mode supports is out of scope here.
- "View mode" is the existing Timeline Mode behaviour; "edit-chronology mode" is a new explicit toggle layered on it.
- The temporal-anchor model supplements rather than replaces existing single-field dates; existing fields are surfaced as anchors via mapping (FR-025) so older vaults need no migration step.
- Persistence and sync reuse the vault's existing entity-metadata storage and sync mechanisms; this feature defines _what_ is written, not a new storage backend. (Undo is out of scope this iteration — see Clarifications — and there is no general entity-edit undo facility to reuse today.)
- Drag-to-place targets pointer/mouse interaction; touch and keyboard-accessible alternatives are desirable but their detailed design is deferred to planning.

## Out of Scope

- AI-assisted date inference or suggestion (explicit non-goal — the feature must work without AI).
- Storing chronology purely as graph x/y layout coordinates (explicit non-goal).
- Requiring every entity to have exactly one date (explicit non-goal — entities may have zero or many anchors).
- A new calendar/era configuration system beyond what `026-world-timeline` already provides.
- Bulk/multi-select temporal editing of many entities in one drag (single-entity placement only in this iteration).
- Dragging **Era** background-region boundaries on the timeline. Eras are calendar _configuration_ (not entity lore); editing their `start_year`/`end_year` by dragging is a possible follow-up, separate from entity chronology editing.

## Future Extensions: Lifespans and Story Chains

These conceptual design outlines govern the next iteration of the time graph, transforming it from a point-based timeline into a view of overlapping durations and causal sequences.

### 1. Lifespans (Entity Durations)

Rather than rendering start and end dates (e.g. birth and death, founding and collapse) as unrelated, disjointed points in space:

- **Visual Span Connectors**: The time graph will render a styled horizontal connector/span edge linking the start handle/node to the end handle/node for any entity with a resolved start and end date. This edge will represent the entity's duration (lifespan, reign, or operation period).
- **Unified Drag Gestures**: Grabbing and dragging the connecting span line translates the entire entity's timeline footprint (shifting both start and end years synchronously, preserving duration). Dragging individual boundary handles (start/end) stretches or contracts the span.
- **Theme Integration**: Spans will be styled using Svelte component parameters matching the vault's active theme (e.g., solid calligraphic paths in `fantasy` mode, pulsing digital tracks in `scifi` mode).

### 2. Story Chains (Sequential Event Flow)

To show narrative progression without the clutter of non-temporal connections:

- **Filtered Sequence Edges**: Normal relational connections (e.g. `allied_with`, `member_of`) remain hidden in timeline mode to prevent visual clutter. Only sequential narrative connections (e.g. `precedes`, `leads_to`, `then`) are rendered.
- **Directional Timeline Flow**: Sequence edges are rendered as clean, directed paths running forward along the temporal axis.
- **Storyline swimlanes**: Concurrent storylines or questlines can be layered vertically into separate visual lanes (swimlanes), allowing GMs to trace parallel narrative tracks (e.g. different party tracks or concurrent plots) across time.
