# Feature Specification: Fog of War

**Feature Branch**: `034-fog-of-war`  
**Created**: 2026-02-03  
**Status**: Draft  
**Input**: User description: "in shared worlds, only show what is revealed. (control by a tag?)" (GitHub Issue #73)

## User Scenarios & Testing

### User Story 1 - Selective Visibility (Blacklist/Whitelist) (Priority: P1)

As a World Builder, I want to control the visibility of individual entities relative to the vault's default state so that I can manage what my audience sees.

**Why this priority**: This is the core engine. It handles both "Hiding a secret in a visible world" (Blacklist) and "Revealing a discovery in a hidden world" (Whitelist).

**Independent Test**:

- **Blacklist**: Set "Default Visibility" to **Visible**, tag an entity as `hidden`; verify it is absent from Shared view.
- **Whitelist**: Set "Default Visibility" to **Hidden**, tag an entity as `revealed`; verify it is present in Shared view.

**Acceptance Scenarios**:

1. **Given** "Default Visibility" is **Visible**, **When** I tag an entity as `hidden`, **Then** the entity node is not rendered in the graph and is excluded from search in Shared mode.
2. **Given** "Default Visibility" is **Hidden**, **When** I tag an entity as `revealed`, **Then** the entity node is rendered in the graph and included in search in Shared mode.

---

### User Story 2 - Real-time "Uncovering" (Priority: P1)

As a World Builder, I want my changes to visibility tags to reflect immediately in the "Shared Mode" preview so that I can reveal content to players in real-time during a session.

**Why this priority**: Enables live DM-ing/storytelling.

**Independent Test**: Toggle a node's tag while the graph is in Shared Mode; verify the node appears/disappears instantly (<300ms).

**Acceptance Scenarios**:

1. **Given** the graph is in "Shared Mode", **When** I add a `revealed` tag to a hidden node (in a hidden-by-default world), **Then** the node appears in the graph without a manual refresh.

---

### User Story 4 - Global Fog / "The Great Unknown" (Priority: P2)

As a World Builder, I want to be able to hide all entities in my vault with a single setting so that I can start a "Shared" campaign with a completely blank graph and only reveal nodes as they are discovered.

**Why this priority**: Supports the "True Fog of War" workflow where everything is unknown by default.

**Independent Test**: Set "Default Visibility" to "Hidden"; verify that in Shared Mode, no nodes are visible unless they have a `revealed` tag.

**Acceptance Scenarios**:

1. **Given** a vault with multiple entities, **When** "Default Visibility" is set to "Hidden" and "Shared Mode" is enabled, **Then** the graph is empty.
2. **Given** "Default Visibility" is "Hidden", **When** an entity is tagged with `revealed`, **Then** it becomes visible in Shared Mode.

### Edge Cases

- **Connections to Hidden Nodes**: If Node A (Visible) is connected to Node B (Hidden), the connection (edge) should also be hidden in Shared Mode.

- **Deep Links**: If a user has a direct link/URL to a hidden node, the system should show a "Not Found" or "Hidden" message if they are in Shared Mode.

- **Search Previews**: Hidden nodes should not appear in fuzzy search suggestions or result lists in Shared Mode.

- **Conflicting Tags**: If "Default Visibility" is "Visible" but a node has both `hidden` and `revealed` tags, `hidden` MUST take precedence (safety first).

## Requirements

### Functional Requirements

- **FR-001**: System MUST support a reserved tag `hidden` in entity frontmatter to force-hide an entity.

- **FR-002**: System MUST support a reserved tag `revealed` in entity frontmatter to force-show an entity (when Default Visibility is Hidden).

- **FR-003**: System MUST provide a "Shared Mode" toggle in the UI for session-wide previewing.

- **FR-004**: System MUST provide a "Default Visibility" setting (Options: "Visible" or "Hidden").

- **FR-005**: If Default Visibility is "Visible" (Default), entities are shown in Shared Mode UNLESS tagged `hidden`.

- **FR-006**: If Default Visibility is "Hidden", entities are hidden in Shared Mode UNLESS tagged `revealed`.

- **FR-007**: In "Shared Mode", hidden entities MUST be excluded from the Graph and Search results.

- **FR-008**: In "Shared Mode", edges connecting to a hidden node MUST be hidden.

### Key Entities _(include if feature involves data)_

- **Entity**:
  - `tags`: List of strings. Logic uses `hidden` and `revealed` for visibility control.

- **Vault Settings**:
  - `defaultVisibility`: Enum ("visible", "hidden")

## Success Criteria

### Measurable Outcomes

- **SC-001**: Hidden nodes are filtered out of the Graph in Shared Mode with 0% leakage.

- **SC-002**: Switching between Admin and Shared Mode updates the graph in < 300ms for vaults up to 500 nodes.

- **SC-003**: Search results in Shared Mode never return entities that should be hidden based on the current settings and tags.
