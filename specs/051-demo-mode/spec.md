# Feature Specification: Interactive Demo Mode

**Feature Branch**: `051-demo-mode`  
**Created**: 2026-02-19  
**Status**: Draft  
**Input**: User description: "demo mode https://github.com/eserlan/Codex-Arcana/issues/193"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Instant Exploration (Priority: P1)

As a new user landing on the site, I want to click a "Try Demo" button so that I can immediately see what a completed campaign looks like with its graph, entities, and Oracle interactions without having to import my own data first.

**Why this priority**: High conversion value. Users can understand the value proposition of the tool in seconds rather than minutes.

**Independent Test**: Can be fully tested by clicking "Try Demo" on the landing page and verifying that the vault is populated with sample entities (e.g., Black Iron Tavern) and the graph is rendered.

**Acceptance Scenarios**:

1. **Given** the landing page is visible, **When** I click "Try Demo", **Then** the landing page is dismissed and the workspace opens with sample data pre-loaded.
2. **Given** I am in Demo Mode, **When** I open the graph, **Then** I see multiple connected nodes representing characters and locations from the sample dataset.

---

### User Story 2 - Sandbox Interaction (Priority: P2)

As a curious user, I want to edit nodes and ask the Oracle questions in Demo Mode so that I can experience the workflow of the tool, knowing that my changes won't be saved permanently to my browser's database.

**Why this priority**: Essential for demonstrating the "Interactive" part of the tool.

**Independent Test**: Edit a sample entity title in Demo Mode, refresh the page, and verify the title reverts to the original sample state.

**Acceptance Scenarios**:

1. **Given** I am in Demo Mode, **When** I edit a node's description, **Then** the change is reflected in the UI immediately.
2. **Given** I have made changes in Demo Mode, **When** I refresh the page, **Then** the system returns to the landing page or re-initializes with fresh sample data.

---

### User Story 3 - Conversion to Campaign (Priority: P3)

As a user who has spent time organizing the demo data, I want an option to "Convert to Campaign" so that I can keep my progress and start my real world-building journey from the demo's foundation.

**Why this priority**: Retention. It bridge the gap between "trying" and "using".

**Independent Test**: Click "Save as Campaign" in Demo Mode and verify that the data persists across page reloads.

**Acceptance Scenarios**:

1. **Given** I am in Demo Mode, **When** I click "Save as Campaign" in the settings or a dedicated banner, **Then** the demo data is persisted to the local IndexedDB.

---

### User Story 4 - Theme-Specific Deep Linking (Priority: P1)

As a marketing lead or community member, I want to share a link like `/?demo=vampire` so that new users are instantly dropped into a Demo Mode that uses the "Vampire" theme, "Vampire" jargon, and "Vampire" sample lore.

**Why this priority**: Crucial for targeted marketing. It allows for "sell-in" by showing the tool exactly how the user intends to use it (e.g., "Need a Vampire world builder? Click here").

**Independent Test**: Navigate to the site with a specific theme query parameter and verify the workspace opens immediately in Demo Mode with the correct theme and sample data.

**Acceptance Scenarios**:

1. **Given** a URL with a `demo` parameter (e.g., `?demo=wasteland`), **When** a user visits, **Then** the app bypasses the landing page and initializes Demo Mode with the "Wasteland" theme and corresponding sample lore.
2. **Given** I am in a theme-specific demo, **When** I look at the interface, **Then** the jargon (e.g., "Entities" vs "Survivors") matches the active theme.

### Edge Cases

- **Offline Access**: Does Demo Mode work offline? (Assumption: Yes, if the PWA is installed, using local sample assets).
- **Oracle Limits**: What if the user hits AI limits in Demo Mode? (Assumption: Standard rate limiting applies; user is prompted to provide their own key).
- **Existing Data**: What if a user with an existing campaign clicks "Try Demo"? (Assumption: System warns that current work will be swapped for the demo context).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display a "Try Demo" action button on the landing page and MUST automatically start the demo on the first visit if the user's vault is empty.
- **FR-002**: System MUST load a predefined set of markdown files and metadata from `vault-samples/` when Demo Mode is activated.
- **FR-003**: System MUST set a global `isDemoMode` flag to `true` while the user is in this context.
- **FR-004**: System MUST display a "DEMO MODE" status indicator in the application header or sidebar.
- **FR-005**: All data modifications in Demo Mode MUST be transient (in-memory) by default and SHOULD NOT overwrite existing IndexedDB campaigns unless explicitly saved.
- **FR-006**: System MUST provide a "Clear Demo / Exit" action in the header or primary navigation that returns the user to the landing page or their previous campaign.
- **FR-007**: System MUST provide a "Save as Campaign" feature that clones the current demo state into a new persistent vault entry.
- **FR-008**: System MUST display theme-sensitive marketing call-to-actions (e.g., "Want to build your own Vampire campaign? Try this!") within the Oracle chat window or sidebar after significant user interaction.
- **FR-009**: Demo Mode UI MUST be visually compatible with all existing themes (Fantasy, Sci-Fi, Vampire, Modern, Wasteland, Cyberpunk) and SHOULD showcase theme-based jargon and aesthetics as its primary "sell-in".
- **FR-010**: Oracle assistant MUST use a guided "Demo" persona that suggests actions (e.g., "Ask me about the Black Iron Tavern!") and highlights key features during the session.
- **FR-011**: System MUST support deep-linking via query parameters (e.g., `?demo=vampire`) to instantly load a theme-specific Demo Mode session.
- **FR-012**: System MUST provide unique sample datasets or lore snippets for each supported theme to provide a high-quality "visualized" experience.
- **FR-013**: Landing page MUST feature "Theme Quick-Starts" (e.g., a "Try it as: Vampire" link) as part of its marketing layer.
- **FR-014**: System MUST provide visual feedback (e.g., an "Unsaved" badge or banner) in the Entity Detail Panel to clearly communicate the transient nature of Demo Mode modifications.

### Key Entities

- **DemoVault**: A transient instance of the `VaultStore` populated with `vault-samples`.
- **DemoState**: UI state tracking if Demo Mode is active and whether the user has been shown the "Save as Campaign" call-to-action.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can enter the workspace with sample data in under 500ms from clicking "Try Demo".
- **SC-002**: 100% of sample entities and connections from `vault-samples/` are accurately rendered in the graph upon demo activation.
- **SC-003**: Zero data from existing persistent campaigns is leaked or overwritten during a standard Demo Mode session.
- **SC-004**: "Save as Campaign" operation completes in under 2 seconds for the standard demo dataset.
- **SC-005**: 100% of users can clearly identify they are in Demo Mode via a UI indicator.
