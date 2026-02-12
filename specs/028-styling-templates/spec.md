# Feature Specification: Visual Styling Templates

**Feature Branch**: `028-styling-templates`  
**GitHub Issue**: [issue #24](https://github.com/eserlan/Codex-Cryptica/issues/24)  
**Created**: 2026-01-31  
**Status**: Draft  
**Input**: User description: "i would like more styling templates to choose from. we have sci-fi, i'd like fantasy, modern, cyberpunk, post-apocalyptic too"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Multi-Genre Aesthetic Alignment (Priority: P1)

As a World Builder, I want to select a visual styling template that matches the genre of my story (e.g., Fantasy, Cyberpunk), so that the application interface reinforces the thematic immersion of my campaign.

**Why this priority**: Core value of the feature. Without genre-appropriate styling, the application feels disconnected from the user's content.

**Independent Test**: Can be fully tested by selecting the "Fantasy" template from settings and verifying that the colors, borders, and graph elements update to a medieval/parchment aesthetic.

**Acceptance Scenarios**:

1. **Given** a vault currently using the "Sci-Fi" default, **When** I select the "Fantasy" template in settings, **Then** the UI instantly updates to reflect a fantasy aesthetic across all panels and the graph.
2. **Given** a specific styling template is active, **When** I close and reopen the application, **Then** the selected template remains active for that vault.

---

### User Story 2 - Real-time Theme Preview (Priority: P2)

As a World Builder, I want to see a preview of how a styling template looks before I apply it to my entire vault, so that I can make an informed decision without committing to a change.

**Why this priority**: Improves user experience and reduces "theme hopping" friction.

**Independent Test**: Hovering or clicking a template in the selection menu provides a localized preview or temporary application of the style.

**Acceptance Scenarios**:

1. **Given** the styling selection menu is open, **When** I interact with a template option, **Then** a sample of the primary UI components (e.g., a node, a header, a button) is shown in that style.

---

### User Story 3 - Graph-Level Stylistic Cohesion (Priority: P1)

As a User, I want the Knowledge Graph to adopt the stylistic cues of the selected template (e.g., node shapes, edge colors), so that the relational visualization feels like a natural extension of the world's genre.

**Why this priority**: The graph is the primary interface; if it doesn't match the theme, the "Zen" experience is broken.

**Independent Test**: Verify that in "Cyberpunk" mode, nodes use neon glows and digital-glitch style borders, while in "Post-Apocalyptic" mode, they appear rusted or weathered.

**Acceptance Scenarios**:

1. **Given** "Modern" mode is selected, **When** I view the graph, **Then** nodes use clean, minimalist shapes and edges use neutral, subtle colors.

---

### Edge Cases

- **Custom Colors Override**: How does a template interact with user-defined category colors? (Assumption: Template defines the _base_ and _secondary_ colors, while category colors remain primary node identifiers).
- **Incomplete Assets**: What if a custom icon or image is not available for a specific theme? (Assumption: System fallbacks to a neutral "standard" icon).
- **High Contrast/Accessibility**: Ensuring that genre-specific aesthetics (like dark "Cyberpunk" or textured "Post-Apocalyptic") do not violate legibility standards.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a selection interface for the following templates: Sci-Fi, Fantasy, Modern, Cyberpunk, Post-Apocalyptic.
- **FR-002**: System MUST persist the selected template ID in the vault's local configuration.
- **FR-003**: System MUST update the CSS variables and Cytoscape styles dynamically when a template is changed.
- **FR-004**: Each template MUST define a specific set of visual attributes: primary color, background color, border radius, font family (serif/sans/mono), and graph edge style.
- **FR-005**: The system MUST apply template-specific borders and background textures to the Zen Mode and Entity Detail panels.

### Key Entities _(include if feature involves data)_

- **Styling Template**: A configuration object containing theme identifiers and style definitions (colors, fonts, shapes).
- **Vault Configuration**: The metadata associated with a vault that now includes a `styling_template_id`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Switching between any two styling templates takes less than 300ms.
- **SC-002**: 100% of standard UI components (Modals, Headers, Sidebar, Graph) update their visual state when a template is changed.
- **SC-003**: User can change and persist a theme in under 3 clicks from the main interface.
- **SC-004**: Verification proxy: All genre-specific CSS variables and classes are correctly applied to the document root upon template activation.
