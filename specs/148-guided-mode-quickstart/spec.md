# Feature Specification: Guided Mode & Quick Start Experience

**Feature Branch**: `148-guided-mode-quickstart`  
**Created**: 2026-07-30  
**Status**: Draft  
**Input**: GitHub Issue [#1909](https://github.com/eserlan/Codex-Cryptica/issues/1909)

## Overview

Codex Cryptica offers extensive lore, graph, and generator capabilities, but the default UI surface can overwhelm new users with options before they experience core value.

This feature introduces a **Guided Mode / Quick Start experience** that progressively discloses complexity. New users can immediately generate a living starter world constellation from a theme and premise, create contextually relevant entities using an intent-first `+ Create` workflow (`Generate → Evaluate → Customize`), and receive structural next-step prompts—all while retaining seamless, non-destructive access to the full CC toolbox at any time.

---

## Clarifications

### Session 2026-07-30
- Q: How should the Quick Start experience be presented when creating or opening a world? → A: Display a prominent 'Quick Start World' card alongside 'Empty Workspace' on the New World creation modal.
- Q: Should the Guided Mode setting be saved per-world or as a global browser preference? → A: Global browser preference (default ON for new users, persists until toggled off).
- Q: Where should the primary intent-first '+ Create' button be located in Guided Mode? → A: Top app header button + floating action button on workspace view.
- Q: How should structural next-step recommendations (e.g., 'Who leads this faction?') be displayed on entity pages? → A: A subtle suggestion banner at the bottom of the entity detail panel.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Quick Start Constellation Generation (Priority: P1)

As a new user creating a world, I want to provide a genre/theme and an optional seed premise so that Codex Cryptica automatically generates an interconnected starter constellation of ~4–6 entities tailored to that theme, giving me an instant living setting.

**Why this priority**: Core value of the onboarding experience—delivers an immediate, populated, interconnected world without requiring manual generator setup.

**Independent Test**: Select "Quick Start" when initializing a new world, pick a genre (e.g. Cyberpunk) and seed sentence, click "Generate Starter World", and verify that a constellation of 4–6 theme-matched entities (e.g. District, Corporation, Gang, Character, Conflict) with cross-links is generated and populated in the workspace.

**Acceptance Scenarios**:

1. **Given** the New World creation modal, **When** the user selects the prominent "Quick Start World" card (alongside "Empty Workspace"), **Then** the Quick Start prompt appears requesting a genre/theme selection and optional premise.
2. **Given** a Space Opera theme, **When** generating a starter constellation, **Then** the generated entities automatically adapt to Space Opera archetypes (e.g., Star System, Planet, Faction, Character, Crisis) rather than standard fantasy defaults.
3. **Given** the generated starter constellation, **When** inspecting the entities in the world explorer or graph, **Then** the entities contain automatic bidirectional references linking them together into a coherent scenario web.

---

### User Story 2 - Intent-First Context-Aware `+ Create` (Priority: P1)

As a user developing my world, I want to click a prominent `+ Create` button in the top app header or floating on the workspace view and choose a simple intent (Character, Place, Faction, Event, Item) so that Codex Cryptica automatically infers current world context and generates sensible defaults immediately without forcing me to configure multi-field generator forms upfront.

**Why this priority**: Replaces "Configure 10 fields → Generate" with "Generate → Evaluate → Customize if needed", dramatically reducing friction during world creation.

**Independent Test**: From an active entity page (e.g., a Faction entity), click `+ Create` → "Character", verify that a new Character entity is generated using the Faction's theme and context with 1-click, and verify that a "Customize" action is available if the user wants to tweak parameters post-generation.

**Acceptance Scenarios**:

1. **Given** Guided Mode or standard navigation, **When** the user clicks `+ Create` in the top app header or floating action button, **Then** a simplified intent menu appears with high-level choices: Character, Place, Faction, Event, Item, or Custom.
2. **Given** an active entity context (e.g., viewing Settlement "Oakhaven"), **When** the user selects `+ Create` → "Character", **Then** the generator automatically infers the active theme and location ("Oakhaven"), populates sensible defaults, and generates the entity without presenting raw configuration fields.
3. **Given** the generated draft, **When** the user wants to refine the input parameters, **Then** clicking "Customize" expands the full generator configuration parameters without discarding the inferred context.

---

### User Story 3 - Guided UI & Non-Destructive Mode Switch (Priority: P2)

As a new or focused user, I want a simplified, decluttered interface that highlights my world content and primary creation actions, with the ability to toggle between Guided Mode and Full Toolbox view at any time via a global preference that persists across sessions.

**Why this priority**: Prevents UI clutter and cognitive overload for newcomers while ensuring power users lose no functionality.

**Independent Test**: Toggle Guided Mode ON, verify secondary toolbars and complex sidebars are hidden in favor of a clean workspace and prominent `+ Create` button, then toggle Guided Mode OFF and verify full UI toolbars and settings return instantly without page reload or state loss.

**Acceptance Scenarios**:

1. **Given** Guided Mode is active as a global browser preference (default ON for new users), **When** viewing the main application, **Then** complex sidebars and advanced utility panels are hidden, focusing attention on the current world entities, spatial layout, and `+ Create` primary action.
2. **Given** any view, **When** the user clicks the "Guided / Full Toolbox" switch in the header or settings, **Then** the preference updates globally and persists across browser reloads.
3. **Given** entities created or modified in Guided Mode, **When** switching to Full Toolbox mode, **Then** all created entities, links, graph nodes, and notes remain fully intact and editable.

---

### User Story 4 - Contextual Next Steps & Recommendations (Priority: P2)

As a Game Master, I want Codex Cryptica to display a subtle suggestion banner at the bottom of the entity detail panel recommending logical structural next steps based on my current entity (e.g., suggesting a leader for a leaderless faction), so that I am never stuck wondering what to build next.

**Why this priority**: Provides subtle creative momentum and guides new users in deepening their world structure.

**Independent Test**: Create a Kingdom entity with no linked settlements, verify a contextual suggestion banner "Add a settlement to [Kingdom Name]" appears at the bottom of the entity detail panel, click the prompt, and verify it launches the context-aware `+ Create` flow pre-configured for that kingdom.

**Acceptance Scenarios**:

1. **Given** an entity with missing structural links (e.g., a Faction with no leader character, a Region with no settlements), **When** viewing the entity detail card, **Then** a subtle suggestion banner at the bottom of the detail panel presents deterministic next step suggestions (e.g., "Who leads this faction?").
2. **Given** a suggestion banner, **When** the user clicks a suggested action, **Then** it opens the context-aware `+ Create` flow pre-filled with the parent entity as context.
3. **Given** an entity whose structural links are satisfied, **When** viewing the detail card, **Then** no redundant recommendation banner is shown.

---

### Edge Cases

- **Empty Premise in Quick Start**: What happens if the user leaves the premise text blank? The system generates a starter constellation based purely on the selected theme's signature archetypes.
- **Off-Theme Premise Input**: How does the system handle a premise that contradicts the selected theme (e.g. "Spaceships" in Gothic Horror)? The generator prioritizes the chosen theme's atmospheric rules while weaving in the user's premise keywords.
- **Offline / Local Mode**: How does Quick Start operate without an active AI key or connection? The system falls back to local deterministic generator rules in `packages/generator-engine` to produce the starter constellation.
- **Frequent Mode Toggling**: Does toggling Guided ↔ Full mode rapidly interrupt ongoing entity drafts or generator streams? State persistence occurs independently of the visual disclosure layer; active streams and unsaved drafts are preserved.

---

## Requirements _(mandatory)_

### Functional Requirements

#### Quick Start & Starter Constellation
- **FR-001**: System MUST provide a "Quick Start World" option alongside "Empty Workspace" on the New World creation modal.
- **FR-002**: System MUST generate an interconnected starter constellation of 4–6 entities upon Quick Start completion.
- **FR-003**: Starter constellation entity types MUST dynamically adapt to the selected theme (e.g. Region/Settlement/Faction/Character/Threat for Fantasy vs District/Corporation/Gang/Character/Conflict for Cyberpunk).
- **FR-004**: System MUST automatically create bidirectional relationships between entities in the generated starter constellation.
- **FR-005**: Quick Start MUST support local deterministic generation fallback when AI generation is unavailable.

#### Intent-First Context-Aware Creation
- **FR-006**: System MUST provide an intent-first `+ Create` button in the top app header and floating on the workspace view.
- **FR-007**: Intent choices MUST present simplified categories: Character, Place, Faction, Event, Item, or Custom.
- **FR-008**: System MUST automatically infer theme, parent entity ID, location, and structural context when invoking `+ Create` from an entity view.
- **FR-009**: Creation flow MUST follow a `Generate → Evaluate → Customize` pattern, generating sensible defaults upfront before exposing optional configuration fields.
- **FR-010**: Users MUST be able to click "Customize" on any draft to reveal full generator parameters without losing current draft progress.

#### Guided UI & Progressive Disclosure
- **FR-011**: System MUST store Guided Mode as a global browser preference, defaulting to ON for new users and persisting across sessions until toggled.
- **FR-012**: Guided Mode MUST simplify the interface surface by hiding advanced secondary panels and focusing on world content and primary creation actions.
- **FR-013**: Toggling between Guided Mode and Full Toolbox mode MUST be instantaneous, non-destructive, and preserve all world data, open tabs, and draft state.

#### Contextual Recommendations
- **FR-014**: System MUST evaluate structural heuristics on entities (e.g. unlinked leaders, empty regions, unassigned threats) and display a subtle suggestion banner at the bottom of the entity detail panel.
- **FR-015**: Clicking a next-step suggestion MUST trigger the context-aware `+ Create` workflow with the target parent context pre-attached.

---

### Key Entities

- **QuickStartConfig**: Represents the user's initial setup inputs (`themeId`, `premise`, `mode`).
- **StarterConstellation**: The generated collection of 4–6 entities and their interconnecting relationship graph.
- **GuidedState**: Global browser preference tracking whether Guided Mode or Full Toolbox mode is active (`isGuidedMode: boolean`, default `true`).
- **ContextualRecommendation**: A structural recommendation rule evaluating missing entity relationships (`parentEntityId`, `targetType`, `promptText`, `actionIntent`).

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: New users can generate a complete, playable 4–6 entity starter world in under 30 seconds from world creation.
- **SC-002**: First-time creation flow (`+ Create` → draft review) requires 0 upfront form configuration steps for 80%+ of standard entity creations.
- **SC-003**: 100% of starter constellation entities contain valid bidirectional cross-links in the world graph.
- **SC-004**: Toggling Guided ↔ Full mode executes in under 100ms with zero data loss or page reloads.
- **SC-005**: Local offline fallback produces a valid starter constellation across all 15 supported themes without throwing runtime errors.
