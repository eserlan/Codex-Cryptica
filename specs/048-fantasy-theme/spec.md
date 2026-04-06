# Feature Specification: Ancient Parchment Theme

**Feature Branch**: `048-fantasy-theme`  
**Created**: 2026-02-18  
**Status**: Draft  
**Input**: User description: "fantasy theme first: https://github.com/eserlan/Codex-Cryptica/issues/168"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - "Magic Tome" Typography (Priority: P1)

As a user, I want headers and titles to use a distinct **Serif** font (e.g., Cinzel, Merriweather) to create an immersive, book-like reading experience, while body text remains highly readable.

**Why this priority**: Typography is the most critical element for establishing the "ancient codex" feel and is the biggest immersion-breaker in the current design.

**Independent Test**: Can be tested by activating the theme and verifying that H1, H2, H3, and modal titles use the new Serif font, while paragraphs use the established body font.

**Acceptance Scenarios**:

1. **Given** the "Ancient Parchment" theme is active, **When** viewing any page, **Then** all `H1`, `H2`, and `H3` elements and modal titles MUST use the designated Header Serif Font.
2. **Given** the "Ancient Parchment" theme is active, **When** viewing UI labels and metadata, **Then** their font weight MUST be reduced to be less prominent than lore content.

---

### User Story 2 - De-Digitalizing the Graph (Priority: P2)

As a user, I want the knowledge graph's visual style to match the "ink and dye" aesthetic of the theme, replacing neon colors with a more muted, hand-drawn look.

**Why this priority**: The futuristic look of the graph currently clashes with the parchment theme, breaking immersion.

**Independent Test**: Can be tested by activating the theme and viewing a graph with multiple connection types, verifying the updated node and edge colors.

**Acceptance Scenarios**:

1. **Given** the "Ancient Parchment" theme is active, **When** viewing the graph, **Then** node border colors MUST use a muted "ink and dye" palette (e.g., Deep Sapphire, Burnt Sienna, Forest Green).
2. **Given** the "Ancient Parchment" theme is active, **When** viewing the graph, **Then** connection lines MUST be thicker and use a dark "Sepia Ink" color.

---

### User Story 3 - UI Polish & Texture Integration (Priority: P3)

As a user, I want UI elements like buttons and sidebars to feel physical and integrated with the parchment texture, enhancing the "enchanted book" feel.

**Why this priority**: These final touches sell the physicality of the interface and complete the immersive experience.

**Independent Test**: Can be tested by activating the theme and interacting with buttons and opening sidebars/modals to verify their updated textures and interaction styles.

**Acceptance Scenarios**:

1. **Given** the "Ancient Parchment" theme is active, **When** viewing sidebars and modals, **Then** they MUST have a subtle parchment texture overlay.
2. **Given** the "Ancient Parchment" theme is active, **When** clicking a button, **Then** it MUST display a "pressed" state using an inset shadow effect.
3. **Given** the "Ancient Parchment" theme is active, **When** viewing buttons and inputs, **Then** their corners MUST be slightly rounded for a softer, more worn feel.

---

### Edge Cases

- **Theme Persistence**: If `localStorage` is cleared or unavailable, the application should gracefully fall back to the default "Gothic" theme without crashing.
- **Missing Theme Definition**: If a theme ID is stored in `localStorage` but no longer exists in the application's theme configuration, it should also fall back to the default theme.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The "Ancient Parchment" theme MUST be set as the default theme for all new users.
- **FR-002**: All Headers (H1, H2, H3) and modal titles MUST use a distinct Serif font (e.g., Cinzel).
- **FR-003**: The graph's node border colors MUST be replaced with a muted "ink and dye" palette.
- **FR-004**: Graph connection lines MUST be thicker and use a dark "Sepia Ink" color.
- **FR-005**: All sidebars and modal backgrounds MUST incorporate a subtle parchment texture overlay.
- **FR-006**: All buttons MUST use a "pressed" inset shadow effect for their active/click state.
- **FR-007**: The `border-radius` for buttons and inputs MUST be increased for a softer look.

### Key Entities

- **StylingTemplate**: The existing schema entity that defines the tokens for a theme (colors, fonts, etc.). The "Ancient Parchment" theme will be an updated instance of this.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The default theme for a first-time user is "Ancient Parchment".
- **SC-002**: All interactive elements (buttons, inputs, links) MUST meet WCAG AA contrast ratios against the textured backgrounds.
- **SC-003**: A review of the 10 most common UI components confirms that all neon colors have been replaced with the specified "ink and dye" palette.
- **SC-004**: An internal design review confirms that the theme's "enchanted book" aesthetic has been successfully achieved.
