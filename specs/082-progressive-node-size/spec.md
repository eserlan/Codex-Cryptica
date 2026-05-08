# Feature Specification: Progressive Node Sizing

**Feature Branch**: `082-progressive-node-size`  
**Created**: 2026-04-14  
**Status**: Draft  
**Input**: User description: "progressively bigger graph nodes https://github.com/eserlan/Codex-Cryptica/issues/615"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Visual Hub Identification (Priority: P1)

As a user exploring a complex knowledge graph, I want the most connected nodes to be visually larger than others so that I can immediately identify the primary "hubs" of my vault.

**Why this priority**: This is the core value proposition. It enables rapid visual orientation in large datasets, which is essential for graph usability.

**Independent Test**: Can be tested by opening a graph with a known distribution of rendered links, including one-way references, and verifying the most-linked node is significantly larger.

**Acceptance Scenarios**:

1. **Given** a graph with nodes of varying connectivity, **When** the graph is rendered, **Then** nodes with more connections are visually larger than nodes with fewer connections.
2. **Given** a graph view, **When** a user adds a new connection to a node, **Then** that node's size increases to reflect its new connectivity level.
3. **Given** a node that is mostly referenced by other entities, **When** the graph is rendered, **Then** its size reflects those inbound links even if it has few or no outbound links of its own.

---

### User Story 2 - Progressive Scaling Limits (Priority: P2)

As a user with extremely connected nodes, I want the scaling to be "progressive" but capped so that very large nodes do not obscure the rest of the graph or become unreadable.

**Why this priority**: Prevents the feature from degrading the user experience in edge cases (e.g., a "Global" node that connects to everything).

**Independent Test**: Can be tested by creating a node with 100+ connections and verifying it does not exceed a predefined maximum visual size.

**Acceptance Scenarios**:

1. **Given** a node with a high number of connections, **When** it reaches the system's maximum connectivity threshold, **Then** its visual size remains constant at the "Maximum Size" limit.
2. **Given** many nodes with 0 or 1 connections, **When** they are rendered, **Then** they all share the same "Minimum Size" and remain legible.

---

### Edge Cases

- **Island Nodes**: Nodes with zero connections should remain at a readable minimum size and not "shrink" into invisibility.
- **Dynamic Updates**: If a connection is deleted, the node must shrink immediately to reflect the change.
- **Hidden Or Missing Targets**: Connections whose targets are filtered out of the current graph view or no longer exist must not affect node size.
- **Label Clipping**: As nodes grow, their text labels must remain centered and readable without being clipped by the node boundaries.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST calculate node size based on the number of rendered active edges attached to a node (degree centrality).
- **FR-001a**: Degree centrality MUST include both inbound and outbound rendered edges.
- **FR-001b**: Edges whose targets are hidden, filtered out, or missing from the rendered graph MUST NOT contribute to node size.
- **FR-002**: System MUST apply an interval-based (stepped) scaling algorithm with a defined set of discrete visual size tiers (e.g., Small, Medium, Large, Hub).
- **FR-003**: System MUST define connectivity thresholds for each size interval to ensure predictable jumping between tiers as connections are added.
- **FR-004**: System MUST enforce a Minimum Node Size for the lowest tier to ensure legibility.
- **FR-005**: System MUST enforce a Maximum Node Size for the highest tier to prevent viewport dominance.
- **FR-006**: System MUST recalculate and animate node size transitions when a node crosses a connectivity threshold.
- **FR-007**: Node sizing MUST be based solely on connectivity; content size (word count) will not influence visual size.
- **FR-008**: The scaling tiers and thresholds MUST be fixed and system-wide in the initial implementation.

### Key Entities

- **Graph Node**: Represents an entity in the vault. Attributes include its current visual radius and its rendered connectivity weight.
- **Graph Edge**: Represents a relationship between two nodes. Only edges that survive graph filtering contribute to node size.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can visually distinguish between at least 3 distinct node size tiers within a single graph view.
- **SC-002**: Node visual radius transitions through a defined set of at least 4 discrete size tiers (e.g., Small, Medium, Large, Hub).
- **SC-003**: A node only changes size when its connectivity count crosses a defined threshold (e.g., moves from Tier 1 to Tier 2).
- **SC-004**: 100% of nodes within the same rendered connectivity interval (e.g., all nodes with 3-5 visible links) MUST render at the exact same visual size.
