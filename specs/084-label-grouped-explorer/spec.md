# Feature Specification: Label-Grouped Entity Explorer

**Feature Branch**: `084-label-grouped-explorer`  
**Created**: 2026-04-15  
**Status**: Implemented  
**Input**: User description: "GitHub Issue #606: Organize the entity explorer by labels"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Group Explorer Results by Label (Priority: P1)

As a vault maintainer with a growing world, I want to group explorer results by label so I can find related entities without relying on their type or alphabetical position.

**Why this priority**: The issue request is centered on label-based organization, and it delivers the largest usability gain for large vaults.

**Independent Test**: Assign labels to several entities, switch the explorer to label view, and verify that each label renders its own section with the expected entities.

**Acceptance Scenarios**:

1. **Given** multiple entities share the same label, **When** I switch the explorer to label view, **Then** I should see a section for that label containing all matching entities.
2. **Given** an entity has more than one label, **When** I view entities by label, **Then** that entity should appear in every relevant label section.
3. **Given** an entity has no labels, **When** I view entities by label, **Then** that entity should remain discoverable in an "Unlabeled" section.
4. **Given** I collapse a label section, **When** I continue browsing in label view, **Then** the entities in that section should remain hidden until I expand it again.

---

### User Story 2 - Keep My Preferred Explorer Layout (Priority: P2)

As a returning user, I want the explorer to remember my last chosen layout so I do not have to reselect list or label grouping every time I reopen the app.

**Why this priority**: Remembering layout removes repeated friction and makes the new explorer modes feel like a stable preference rather than a temporary filter.

**Independent Test**: Select a non-default explorer view, reload the app, and confirm the same explorer layout is restored.

**Acceptance Scenarios**:

1. **Given** I select label view, **When** I reload the application, **Then** the explorer should reopen in that same view mode.

---

### User Story 3 - Keep Label Sections Folded The Way I Left Them (Priority: P2)

As a returning user, I want collapsed label sections to stay collapsed so I can keep the explorer focused on the groups I care about across reloads and sessions.

**Why this priority**: Large vaults benefit from grouping most when users can hide labels they are not actively browsing instead of re-collapsing them every time.

**Independent Test**: Collapse one label section, reload the app, and verify that the same label remains collapsed while other labels stay visible.

**Acceptance Scenarios**:

1. **Given** I collapse a label section in a vault, **When** I reload the application, **Then** that same section should remain collapsed.
2. **Given** I expand a previously collapsed section, **When** I reload the application, **Then** that section should remain expanded.
3. **Given** I use a different vault, **When** I open the explorer there, **Then** collapsed label state should not be borrowed from another vault.

---

### User Story 4 - Filter Explorer by Clicking Labels (Priority: P2)

As a vault maintainer, I want to click on a label pill in the explorer to filter the list by that label, so I can quickly drill down into specific sub-collections without typing into the search bar.

**Why this priority**: It complements the label-grouped view by making labels interactive and functional for discovery across both view modes.

**Independent Test**: Click a label pill on an entity item, verify the list filters to show only entities with that label. Ctrl+Click another label and verify the list shows entities containing BOTH labels.

**Acceptance Scenarios**:

1. **Given** I am in the entity explorer, **When** I click a label pill on an entity, **Then** the explorer should apply an exclusive filter for that label, AND the graph view should update to show only nodes matching that label.
2. **Given** an active label filter, **When** I Ctrl/Cmd+Click another label pill, **Then** both the explorer and graph should show only entities that match BOTH labels (AND logic).
3. **Given** active label filters, **When** I click the "Clear" button in the explorer or the graph filter HUD, **Then** all label filters should be removed from both views.
4. **Given** a search query is active, **When** I apply a label filter, **Then** the results should match both the search text AND the selected labels.

---

### Edge Cases

- Search and category filters must apply before grouping so alternate explorer views only show matching entities.
- Empty label sections must not render after filtering.
- Entities with multiple labels intentionally appear in multiple sections and must remain selectable in each location.
- Entities without labels must remain discoverable through an explicit fallback group.
- Collapsed label state must survive browser reloads without hiding the unlabeled fallback by mistake.
- If a label filter is applied that excludes all entities in a collapsed group, that group should not be rendered at all.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide explorer controls for switching between list view and label grouping.
- **FR-002**: The system MUST remember the selected explorer view across browser reloads for the same user.
- **FR-003**: The system MUST group filtered entities by label when label view is active.
- **FR-004**: The system MUST show unlabeled entities in a dedicated fallback section when label view is active.
- **FR-005**: The system MUST let users collapse and expand individual label sections while label view is active.
- **FR-006**: The system MUST remember collapsed label sections across browser reloads and sessions for the same user.
- **FR-007**: The system MUST scope collapsed label state to the active vault so one vault does not change another vault's explorer layout.
- **FR-008**: The system MUST preserve existing search, category filtering, selection, and drag-start behavior in every explorer view.
- **FR-009**: The system MUST make label pills in the explorer interactive.
- **FR-010**: The system MUST apply "AND" logic when multiple label filters are active.
- **FR-011**: The system MUST display active label filters in the UI with a clear way to remove them.
- **FR-012**: The search query MUST be extended to match against entity labels in addition to title and content.
- **FR-013**: Label filters MUST be synchronized between the entity explorer and the graph view.

### Key Entities

- **Explorer View Preference**: The user's saved explorer layout choice (`list` or `label`) that persists between sessions.
- **Explorer Group**: A rendered section of entities produced from the current filtered explorer result set using a label key.
- **Explorer Group Visibility Preference**: The per-vault saved set of label sections that are currently collapsed in label view.
- **Label Filter Set**: A collection of labels currently used to narrow down the entity list.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can switch between the available explorer layouts with a single click from the explorer toolbar.
- **SC-002**: A previously selected explorer layout is restored after a browser reload.
- **SC-003**: Multi-labeled entities remain discoverable from every relevant label section.
- **SC-004**: Grouped views hide empty sections when search or category filters remove all matching entities from that group.
- **SC-005**: Users can collapse a label section with a single click and see it stay collapsed after a reload.
- **SC-006**: Clicking a label pill reduces the explorer list to entities matching that label within 100ms.
- **SC-007**: Active label filters are clearly visible and can be dismissed individually.
- **SC-008**: The search bar correctly surfaces entities when searching for one of their labels.
- **SC-009**: Label filter changes in the explorer are reflected in the graph view HUD and vice versa.
