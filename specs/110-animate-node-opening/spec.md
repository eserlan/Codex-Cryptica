# Feature Specification: Entity Detail Panel & Graph Node Selected Animation

**Feature Branch**: `feat/animate-node-opening`  
**Created**: 2026-05-22  
**Status**: Retroactive / Approved  
**Input**: Issue #846: "animate opening of entity detail panel and selected graph node"

## User Scenarios & Testing

### User Story 1 - Tactile Panel Open (Priority: P1)

As a Game Master, I want the entity detail panel to expand outward from the specific node or link I just clicked on the graph or UI, so that I have a clear spatial connection and context for where the detail data is coming from.

**Why this priority**: Enhances the visual connection and spatial feedback when opening details, avoiding abrupt layout changes.

**Independent Test**: Click a node on the graph canvas and observe the panel expanding from the node's position.

**Acceptance Scenarios**:

1. **Given** the relationship graph, **When** I click a node, **Then** the details panel scales and opacity-fades outward from the clicked node's screen coordinates.
2. **Given** any other trigger without screen coordinates (e.g., global command or fallback), **When** the detail panel is opened, **Then** it slides in smoothly from the right edge of the screen on desktop.

---

### User Story 2 - Mobile-Friendly Bottom Sheet (Priority: P1)

As a mobile user of Codex Cryptica, I want the details panel to slide up from the bottom of the screen like a native bottom sheet, so that the presentation is clean, readable, and conforms to mobile UX patterns.

**Why this priority**: Desktop scaling does not translate well to narrow mobile viewports.

**Independent Test**: Open the application on a mobile viewport and trigger opening an entity's details; verify that the sheet slides up from the bottom.

**Acceptance Scenarios**:

1. **Given** a mobile-width browser window, **When** I tap any entity, **Then** the details panel slides up from the bottom of the screen.

---

### User Story 3 - Fluid Internal Navigation (Priority: P1)

As a Game Master, I want to click connections inside the detail panel and have the content swap with a smooth cross-fade, without having the panel frame collapse or animate, so that my focus remains on the content.

**Why this priority**: Navigating between entities inside the open panel shouldn't trigger the heavy expand/collapse animation of the container.

**Independent Test**: Open a detail panel, click a connected entity link inside the details tab, and verify that the panel container remains static while the tabs/content cross-fade.

**Acceptance Scenarios**:

1. **Given** the details panel is open for "Entity A", **When** I click on a connected link to "Entity B" inside the panel, **Then** the panel frame remains static, and the old content fades out as the new content fades in.

---

### User Story 4 - Selected Node Pulse Ripple (Priority: P2)

As a Game Master, I want a visual feedback ripple on the selected node on the graph, so that I can immediately identify which node corresponds to the open details panel.

**Why this priority**: Provides clear visual correlation between the canvas selection and the detail panel content.

**Independent Test**: Select a node on the graph and observe a brief padding/opacity ripple styling underlay expansion.

**Acceptance Scenarios**:

1. **Given** a node on the Cytoscape canvas, **When** I select/tap the node, **Then** a brief style animation runs on the selected node underlay (expanding underlay-padding from 8 to 24, then back to 8).

## Requirements

### Functional Requirements

- **FR-001**: The system MUST store and track the screen coordinates of the last selected entity trigger in a global UI layout store (`layoutUIStore`).
- **FR-002**: The details panel MUST execute a custom Svelte transition (`expandFrom`) that adjusts `transform-origin` dynamically based on the stored screen coordinates.
- **FR-003**: If no click coordinate is stored, the `expandFrom` Svelte transition on desktop MUST fall back to a slide-in translation from the right.
- **FR-004**: On mobile viewports, the details panel MUST slide up from the bottom of the screen using a translation transition.
- **FR-005**: The detail panel content wrapper MUST use Svelte `{#key entity.id}` and cross-fade transitions (`in:fade`, `out:fade`) to transition content when navigating between entities.
- **FR-006**: To prevent double-height layouts during the cross-fade, the detail panel content wrapper MUST use a CSS grid container overlay (`display: grid; grid-template-columns: 1fr; grid-template-rows: 1fr;`) with both entering and exiting items placed at `col-start-1 row-start-1`.
- **FR-007**: Selecting a node on the Cytoscape graph canvas MUST trigger a styled underlay padding/opacity animation pulse.
- **FR-008**: The Zen Mode modal (`ZenModeModal`) MUST utilize premium fluid transitions (`transition:fade` and `transition:fly` with `quintOut` easing) for smooth entrance and exit animations on desktop and mobile viewports.
- **FR-009**: Large overlay elements and modals MUST be persistently mounted in their parent provider blocks (e.g. `GlobalModalProvider.svelte`) rather than wrapped in parent conditional statements, ensuring exit transition lifecycles play to completion in the DOM before destruction.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Transition durations on large/immersive containers are visually weighted and fluid, utilizing premium deceleration (`quintOut` easing with `500ms` – `600ms` container transitions, and `150ms` inner cross-fades) to prevent eye strain and feel cohesive.
- **SC-002**: Content cross-fade does not cause vertical height jumps or layout shifts.
- **SC-003**: The selected node pulse completes within 500ms and correctly resets styles to avoid rendering artifacts.
- **SC-004**: Zen Mode backdrop and card elements slide/fade from the bottom with a complete exit transition when the modal is closed.
