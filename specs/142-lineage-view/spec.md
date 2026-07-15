# Feature Specification: Full Lineage / Dynasty View

**Feature Branch**: `142-lineage-view`
**Created**: 2026-07-16
**Status**: Draft
**Source**: GitHub issue #1716
**Input**: User description: "Add an opt-in Full lineage / Dynasty mode to the Family Tree that shows a character's ancestors and descendants across all recorded generations, not just the immediate parents/partners/children/siblings shown today. Surfaced from the existing full-screen family view, keeping the default bounded Family tab unchanged. Derived entirely from existing family connections — a new rendering/traversal mode, not a new data model."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See the whole dynasty at once (Priority: P1)

A worldbuilder maintaining a royal house has recorded six generations of rulers, consorts, and heirs through the Family Tree. Today they can only see one character's immediate relatives at a time and must repeatedly re-centre to trace succession. They open a character's full-screen family view, switch to the Full Lineage mode, and see that character's complete recorded ancestry and all recorded descendants laid out as one continuous, generation-ordered chart — every recorded generation, not just the adjacent ones.

**Why this priority**: This is the entire point of the feature. A read-only multi-generation chart derived from existing relationships delivers the "show me the whole dynasty" value on its own, even before navigation aids are added.

**Independent Test**: Record a five-generation chain (great-great-grandparent → … → grandchild) plus partners through the existing Family Tree, open Full Lineage mode on the middle character, and confirm all five generations appear simultaneously, each member on the correct generation row, with partners beside their line members.

**Acceptance Scenarios**:

1. **Given** a character with three recorded generations of ancestors and two of descendants, **When** the user activates Full Lineage mode from the full-screen family view, **Then** all six generations (including the focus character's own) are visible in one chart, ordered oldest generation to youngest.
2. **Given** a character whose recorded family is only immediate (one generation up and down), **When** the user activates Full Lineage mode, **Then** the chart shows exactly those members — the mode never shows less than the bounded view knows about.
3. **Given** an ancestor in the chart who had two recorded partners with children by each, **When** the lineage renders, **Then** both partners and both sets of children appear without overlapping or being merged into one family unit.
4. **Given** a character with no recorded family relationships, **When** the user activates Full Lineage mode, **Then** an informative empty state explains that no lineage is recorded and points the user to the Family tab to add relatives.

---

### User Story 2 - Navigate and tame a large lineage (Priority: P2)

A user viewing a dynasty of a hundred-plus members needs to move around the chart and focus on the branch they care about. They pan and zoom across the canvas, collapse a prolific cadet branch three generations down to a compact indicator, expand it again later, and re-centre the lineage on a different character to explore that person's ancestry.

**Why this priority**: Real dynasties grow explosively (remarriages, many children per generation). Without pan/zoom and deep collapse the P1 chart becomes unreadable at exactly the scale this feature exists for — but a small lineage is still viewable without these tools, so they follow P1.

**Independent Test**: Build a lineage of at least four descendant generations with multiple children per generation; confirm the user can pan/zoom the chart, collapse a branch at the third generation (not just the first), see a clear indicator of hidden members, re-expand it, and re-centre the lineage on any member.

**Acceptance Scenarios**:

1. **Given** a lineage chart larger than the viewport, **When** the user drags/pans and zooms in or out, **Then** the chart moves and scales smoothly and no part of the lineage is unreachable.
2. **Given** any member in the chart with descendants, at any depth, **When** the user collapses that member's branch, **Then** the branch's descendants hide, a visible indicator shows that (and roughly how much) content is collapsed, and expanding restores it.
3. **Given** any member card in the chart, **When** the user chooses to re-centre on that member, **Then** the lineage is recomputed around them as the new focus.
4. **Given** any member card in the chart, **When** the user opens that member, **Then** they reach the underlying character entity, consistent with how cards behave in the existing Family Tree.

---

### User Story 3 - Use the lineage on a phone (Priority: P3)

A game master at the table pulls up the dynasty on their phone mid-session to answer "wait, how is she related to the old king?". They open Full Lineage mode, pinch-zoom out to see the shape of the house, pan to the relevant branch, and zoom back in to read individual cards.

**Why this priority**: Mobile is a core surface for this product, but a large free-panning canvas is inherently a desktop-first interaction; mobile needs to be _usable_, not equal. It builds directly on P2's pan/zoom.

**Independent Test**: On a mobile-width touch viewport, open a four-plus-generation lineage; confirm pinch-zoom and touch-pan work, cards remain readable when zoomed in, and the page itself never scrolls horizontally underneath the chart.

**Acceptance Scenarios**:

1. **Given** a lineage open on a mobile-width screen, **When** the user pinch-zooms and pans with touch, **Then** the chart responds to the gestures and the surrounding page never overflows horizontally.
2. **Given** a lineage too large to read at full extent on a phone, **When** the user zooms in on one branch, **Then** individual cards are readable and tappable at that zoom level.

---

### Edge Cases

- **Explosive breadth**: A dynasty with hundreds of recorded members across many branches. The view must stay responsive — via collapsed-by-default distant branches, a traversal depth cap, or both — rather than freezing while rendering everyone.
- **Missing generations**: A grandchild is recorded but the linking parent is unknown. The recorded relationship path is what defines the lineage; members not connected by any recorded chain to the focus are simply absent (no invented gap-fillers), and this is acceptable.
- **Cyclic or corrupted data**: Cycle creation is blocked at edit time, but imported or hand-edited data may still contain ancestry loops. Lineage traversal must terminate and render sensibly (visit each member once) rather than hanging or crashing.
- **Multiple marriages and half-siblings**: An ancestor's children by different partners must be attributable to the correct partner where recorded, without breaking the generation layout.
- **A member appearing twice** (e.g. cousins marrying — the same person reachable as both ancestor-side partner and descendant): the person must not be duplicated in a way that miscounts the family, and the chart must remain readable.
- **Focus deep in the middle**: A character with many recorded generations both above and below. Both directions must render, with the focus visually identifiable.
- **Deleting or editing while viewing**: If family relationships change while the lineage is open (e.g. from another surface), the lineage should reflect the current data on next render rather than showing stale members indefinitely.
- **Very deep single line**: Dozens of generations in a straight line must not break layout or traversal (depth cap with an indicator is acceptable).

## Requirements _(mandatory)_

### Functional Requirements

**Mode & entry**

- **FR-001**: The system MUST offer Full Lineage mode as an explicit, opt-in mode reachable from the existing full-screen family view. The default Family tab/panel and its bounded immediate-relatives behaviour MUST remain unchanged.
- **FR-002**: The user MUST be able to switch between the bounded family view and Full Lineage mode without losing their place in the app (returning lands them back where they were).

**Lineage content**

- **FR-003**: Full Lineage mode MUST show, for the focused character, all recorded ancestors (every recorded parent, recursively upward) and all recorded descendants (every recorded child, recursively downward), across every recorded generation, subject only to an explicit oversize safeguard (FR-010).
- **FR-004**: Partners/spouses of members on the direct lineage MUST be shown beside their partner. Partners are displayed context, not traversal routes: the lineage does not extend through a partner to the partner's own ancestors or unrelated descendants.
- **FR-005**: The focus character MUST be visually distinguishable in the chart, and each generation MUST be visually ordered (ancestors above/before, descendants below/after) so generational distance is readable at a glance.
- **FR-006**: Each member MUST be shown as a card consistent with the existing Family Tree cards (portrait/placeholder, name, lifespan/status), and the user MUST be able to open the underlying character entity from any card.

**Navigation & scale**

- **FR-007**: The lineage canvas MUST support panning and zooming, with touch gestures (drag-pan, pinch-zoom) on touch devices and equivalent mouse/keyboard-friendly controls on desktop.
- **FR-008**: The user MUST be able to collapse and re-expand any member's descendant branch at any depth, with a clear indicator on collapsed branches showing that members are hidden. Collapse state applies to the current viewing session; it need not persist.
- **FR-009**: The user MUST be able to re-centre the lineage on any member, making them the new focus.
- **FR-010**: The system MUST remain responsive for large dynasties. When a lineage exceeds a safeguard threshold (generations of depth and/or total members), the system MUST degrade gracefully — e.g. auto-collapsing distant branches or capping initial depth with a clear "more available" indicator — rather than rendering everything unconditionally or failing.
- **FR-011**: Lineage traversal MUST tolerate imperfect data: it MUST terminate on cyclic ancestry (visiting each member at most once) and MUST handle members reachable by multiple paths without rendering misleading duplicates.

**Data**

- **FR-012**: The lineage MUST be derived entirely from the existing recorded family relationships at view time. No new persisted genealogy data model, and no lineage-specific data stored on entities. (Transient view preferences such as last-used mode are not genealogy data and are exempt.)
- **FR-013**: Any relationship editing available from lineage cards MUST go through the same relationship rules as the existing Family Tree (reciprocal links, cycle prevention, character-only slots); the mode MUST NOT introduce a second editing pathway with different rules. (Read-only cards with "open entity" and "re-centre" actions satisfy this requirement — editing within lineage mode is not required for this feature.)

**Platforms**

- **FR-014**: Full Lineage mode MUST work on desktop and remain usable on mobile: touch navigation works, cards are readable when zoomed, and the chart never causes the surrounding page to overflow or scroll horizontally.

### Key Entities

- **Character**: Existing "character"-category entity; supplies card details (portrait, name, lifespan, status). Unchanged by this feature.
- **Family Relationship**: The existing first-class family connection kinds (parent/child, spouse/partner, sibling). Unchanged by this feature; the sole source the lineage is derived from.
- **Lineage (derived view)**: A computed, non-persisted structure for a focus character: the full recorded ancestor set, full recorded descendant set, and partners of direct-line members, organised by generation, with per-branch collapse state held only for the viewing session.

## Assumptions

- **Direct line only, plus partners**: The lineage comprises the focus character's recorded ancestors, recorded descendants, and the partners of those direct-line members. Collateral relatives (the focus character's aunts/uncles/cousins — i.e. siblings of ancestors and their descendants) are out of scope for this iteration; users reach them by re-centring on the shared ancestor, whose full descendant tree then includes them.
- **Siblings of the focus character** are recorded children of the focus's parents and therefore appear naturally within the parents' descendant branches; no special sibling handling is added beyond what traversal produces.
- **Viewing-first surface**: Full Lineage mode is primarily for viewing and navigation. Relationship editing remains the job of the existing bounded Family tab; lineage cards need only "open entity" and "re-centre". If editing is added to lineage cards later, FR-013 governs it.
- **Entry point**: The mode toggle lives in the already-shipped full-screen family view; no new top-level navigation, route, or tab is introduced for it.
- **Large-tree safeguard values** (exact depth/member thresholds, and whether distant branches start collapsed) are implementation-tuning decisions for the planning phase; the spec requires only that a safeguard exists and is visibly indicated.
- **No AI-assisted lineage features** (e.g. "generate a dynasty") are part of this feature.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: From a character's entity view, a user can reach the Full Lineage chart in at most two actions (enter full-screen family view, switch mode).
- **SC-002**: A recorded five-generation direct line renders in Full Lineage mode with 100% of recorded direct-line members present, each on the correct generation row, and partners beside their members — verified against the recorded relationships with no manual correction.
- **SC-003**: A dynasty of at least 200 recorded members opens without the app freezing, and pan, zoom, collapse, and re-centre each respond within one second on a typical desktop.
- **SC-004**: A user can collapse a branch at the third generation or deeper and re-expand it, with hidden-member indication, in 100% of attempts on branches that have descendants.
- **SC-005**: On a mobile-width touch screen, a user can pan and zoom a four-plus-generation lineage and read individual cards when zoomed in, with zero horizontal overflow of the surrounding page.
- **SC-006**: The default Family tab behaves identically before and after this feature ships (its existing acceptance tests still pass unchanged), confirming the mode is strictly additive.
- **SC-007**: Deleting every lineage-mode artefact (leaving the recorded relationships untouched) loses no genealogy data — 100% of the lineage is reconstructable from standard entity relationships, confirming no parallel data store exists.
- **SC-008**: Lineage traversal on a dataset containing a deliberate ancestry cycle completes and renders (no hang, no crash) in 100% of attempts.
