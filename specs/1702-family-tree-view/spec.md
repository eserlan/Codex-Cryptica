# Feature Specification: Family Tree View

**Feature Branch**: `1702-family-tree-view`  
**Created**: 2026-07-14  
**Status**: Draft  
**Source**: GitHub issue #1702  
**Input**: User description: "Add an interactive Family Tree view for character entities, built from structured entity relationships rather than a separate genealogy data model."

## Clarifications

### Session 2026-07-14

- Q: How should family links be represented over the existing connection model? → A: Dedicated connection types (add family kinds such as parent_of / spouse_of to the connection type set), distinct from generic connections.
- Q: Should the reciprocal family link be physically written to the other entity, or derived at read time? → A: Write both sides (adding a parent also writes the child link on the other entity).
- Q: Where should the Family Tree live in the UI? → A: A tab/panel embedded in the character's entity-detail view.
- Q: How should obvious contradictions like circular ancestry be handled? → A: Hard-prevent (block the save when a character would become their own ancestor).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View a character's family at a glance (Priority: P1)

A world-builder opens a character and wants to understand who their parents, children and partner are without hunting through the character's prose or the full relationship graph. They open the Family Tree view for that character and see an automatically laid-out tree, centred on the character, with parents above, partner beside, and children below. Each person is shown as a compact card with portrait, name, title/role, lifespan and living/deceased status. Nothing needs to be entered manually — the tree is assembled from the family relationships that already exist between entities.

**Why this priority**: This is the core value of the feature and the minimum that delivers something useful. A read-only, correctly laid-out tree derived from existing relationships is independently valuable even if no editing or AI assistance is ever added.

**Independent Test**: Create three character entities linked as grandparent → parent → child using standard relationships, open the Family Tree view on the middle character, and confirm the parent appears above and the child below with correct cards. Delivers immediate genealogical overview.

**Acceptance Scenarios**:

1. **Given** a character with an existing parent relationship, **When** the user opens the Family Tree view, **Then** the parent is displayed one generation above the focused character.
2. **Given** a character with two children and a partner, **When** the user opens the Family Tree view, **Then** the partner is shown alongside the character and both children are shown one generation below.
3. **Given** two characters that share the same parent, **When** either character's Family Tree is viewed, **Then** the other is shown as a sibling on the same generation even though no direct sibling relationship was manually entered.
4. **Given** a character card in the tree, **When** the user looks at it, **Then** it shows the character's portrait (or a placeholder), name, title/role, lifespan, and whether they are living or deceased.
5. **Given** a character with no family relationships, **When** the Family Tree view is opened, **Then** the character is shown alone with clearly labelled empty slots inviting the user to add family.

---

### User Story 2 - Build the family directly from the tree (Priority: P2)

While viewing the tree, the user notices an empty "parent" slot. They click it and either connect an existing character from the world or create a brand-new character to fill that role. When they add a parent, the reciprocal child relationship is created automatically so the two entities stay consistent, and the tree updates to include the new person.

**Why this priority**: Editing from within the tree turns it from a passive diagram into a working genealogy tool. It depends on P1 being in place but massively increases utility.

**Independent Test**: From a character's Family Tree, use an empty parent slot to create a new character; confirm the new character entity exists in the world, appears in the tree as a parent, and that opening the new character shows the focused character as its child.

**Acceptance Scenarios**:

1. **Given** an empty family slot (parent, child, or partner), **When** the user chooses to connect an existing character, **Then** they can search the world's characters and link one into that slot.
2. **Given** an empty family slot, **When** the user chooses to create a new character, **Then** a new character entity is created and linked into that slot in a single flow.
3. **Given** the user adds a parent to character A, **When** the relationship is saved, **Then** character A automatically appears as a child of the new parent without further action.
4. **Given** the user attempts to add a family link that would make a character their own ancestor, **When** they confirm, **Then** the system prevents or warns about the circular ancestry.
5. **Given** a family relationship is added or removed in the tree, **When** the change is saved, **Then** the standard relationship data for both entities reflects the change.

---

### User Story 3 - Navigate and manage large family trees (Priority: P3)

A user exploring a sprawling dynasty needs to keep the tree readable. They click any person to re-centre the tree on them, collapse distant branches they don't currently care about, and open a person's full entity page when they want the details. On a phone, the same tree stays usable through panning and collapsing rather than trying to show everything at once.

**Why this priority**: Navigation and collapsing matter only once trees get large; the feature is usable without them for small families, so they come after core viewing and editing.

**Independent Test**: With a tree spanning four generations, collapse a branch and confirm its descendants hide; re-centre on a leaf character and confirm the tree re-lays-out around them; open a node's entity and confirm navigation.

**Acceptance Scenarios**:

1. **Given** a multi-generation tree, **When** the user selects a non-focused character, **Then** the tree re-centres on that character and re-lays-out its relatives.
2. **Given** a branch with many descendants, **When** the user collapses it, **Then** the descendants are hidden and a clear indicator shows the branch can be expanded again.
3. **Given** any character card, **When** the user opens it, **Then** the application navigates to or focuses that character's entity.
4. **Given** the tree is viewed on a small (mobile) screen, **When** the user pans and collapses branches, **Then** the tree remains legible and interactive without horizontal content overflowing the viewport.

---

### Edge Cases

- **Circular ancestry**: A user tries to set a descendant as an ancestor (A is parent of B, then B set as parent of A). The system must hard-prevent this by blocking the save and explaining why.
- **Half-siblings / step-relations**: Two children share only one parent, or a partner's children are not the character's own. Initial version infers siblings only from shared parents; unshared-parent children are not shown as full siblings.
- **Multiple partners**: A character has more than one spouse/partner (e.g. widowed and remarried). The tree must represent more than one partner without breaking layout.
- **Non-character entities in a family slot**: A user attempts to link a location or item as a parent. The system should restrict family slots to character entities.
- **Missing generations**: A grandchild exists but the intermediate parent is unknown. The tree shows the gap gracefully rather than collapsing the generations.
- **Deceased vs living**: Characters without a recorded death are treated as living for status display; characters with a death date are marked deceased.
- **Very large dynasties**: Trees with dozens or hundreds of members must remain responsive, relying on collapsing and re-centring rather than rendering everything.
- **Deleting a linked character**: Removing a character that is part of a tree must not leave the tree in a broken state; the slot becomes empty or the branch adjusts.
- **Conflicting inverse links**: An existing dataset has a parent link on one side but not the reciprocal child link. Viewing/editing should reconcile toward consistency.

## Requirements _(mandatory)_

### Functional Requirements

**Viewing & layout**

- **FR-001**: The system MUST provide the Family Tree as a tab/panel within a character's entity-detail view, opened in the context of that character.
- **FR-002**: The system MUST render parent, child, and spouse/partner relationships as an automatically laid-out, navigable tree centred on a focused character.
- **FR-003**: The system MUST display each person in the tree as a compact card showing portrait (or placeholder), name, title/role, lifespan, and living/deceased status.
- **FR-004**: The system MUST infer sibling relationships from shared parents rather than requiring explicit sibling links.
- **FR-005**: The system MUST allow the user to open or focus the underlying character entity from any card in the tree.
- **FR-006**: The system MUST allow the user to re-centre the tree on any selected character.
- **FR-007**: The system MUST allow the user to collapse and re-expand distant or large branches, with a clear indicator that a collapsed branch can be expanded.
- **FR-008**: The Family Tree MUST remain usable on both desktop and mobile, without content overflowing horizontally on small screens.

**Editing & data integrity**

- **FR-009**: The system MUST let the user fill an empty family slot by connecting an existing character from the world.
- **FR-010**: The system MUST let the user fill an empty family slot by creating a new character and linking it in a single flow.
- **FR-011**: When a family relationship is added, the system MUST write the corresponding inverse relationship onto the other entity so both entities stay consistent from either side (e.g. adding a parent also records the child on that parent). Removing a family relationship MUST likewise remove its inverse.
- **FR-012**: When a family relationship is added or removed in the tree, the system MUST reflect the change in the standard relationship data of the affected entities.
- **FR-013**: The system MUST hard-prevent obvious contradictions, specifically circular ancestry (a character becoming their own ancestor), by blocking the save and explaining why.
- **FR-014**: The system MUST restrict family relationship slots to character entities.

**Data model**

- **FR-015**: Family links MUST be represented using standard entity relationships as the single source of truth; the Family Tree MUST be a visualisation of those relationships, not a parallel genealogy data store.
- **FR-016**: Family links MUST use dedicated family relationship types (distinct, first-class connection kinds such as parent_of / spouse_of) rather than relying on free-text labels, so the tree can be derived unambiguously. The initial supported kinds MUST be parent/child and spouse/partner.
- **FR-017**: The relationship representation MUST be designed to allow later addition of kinds such as adoption, guardianship, half-siblings, former partners, disputed parentage, and secret relationships without restructuring existing data.

### Key Entities

- **Character**: An existing entity of the "character" category. Relevant attributes for this feature: portrait/image, name/title, role, lifespan (birth/death), and living/deceased status. Family Tree membership is derived, not a stored property.
- **Family Relationship**: A dedicated family relationship type (a first-class connection kind, e.g. parent_of / spouse_of) marking a standard entity-to-entity relationship as parent/child or spouse/partner. Directional (e.g. parent→child) with the inverse written to the other entity. First-class typing keeps family links distinguishable from generic relationships without relying on free-text labels.
- **Family Tree (derived view)**: A computed structure, for a given focus character, of ancestors, descendants, partners, and inferred siblings assembled from Family Relationships. Not persisted; recomputed from relationships.

## Assumptions

- Family relationships are layered onto the existing directional connection model by adding dedicated family relationship types (parent/child, spouse/partner) as first-class connection kinds; no separate genealogy schema and no reliance on free-text labels.
- The Family Tree is surfaced as a tab/panel within the character's entity-detail view (not a separate top-level mode or modal).
- Reciprocal family links are written to both entities so relationship data is self-consistent when read from either side; siblings are computed at view time from shared parents and are not stored.
- Only entities in the "character" category participate in family relationships in this iteration.
- A character with no recorded death date is treated as living for status display.
- AI-assisted actions (Generate parents, Generate descendants, Fill missing generation, Create rival branch, Suggest family secrets) are explicitly out of scope for this feature and reserved as follow-ups.
- Adoption, guardianship, half-siblings, former partners, disputed parentage, and secret relationships are out of scope for the initial version but must not be designed out.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: From any character with at least one family relationship, a user can reach a correctly centred family tree in a single action.
- **SC-002**: A three-generation family entered through standard relationships renders with every member on the correct generation and siblings correctly grouped, with no manual sibling entry.
- **SC-003**: A user can add a new parent, child, or partner from an empty slot and have both the new/linked entity and its reciprocal relationship saved (verifiable by opening the other entity) in under 30 seconds.
- **SC-004**: Attempting to create circular ancestry is blocked or warned in 100% of attempts.
- **SC-005**: On a mobile-width screen, a user can view, pan, and collapse branches of a family tree of at least four generations without any horizontal page overflow.
- **SC-006**: 100% of family relationships created via the tree are readable as standard entity relationships (and vice-versa), confirming the tree introduces no parallel data store.
- **SC-007**: A family tree of at least 50 members remains interactive (selection, collapse, re-centre respond promptly) through collapsing and re-centring rather than requiring all members on screen at once.
