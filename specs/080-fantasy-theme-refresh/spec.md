# Feature Specification: Fantasy Theme Refresh

**Feature Branch**: `080-fantasy-theme-refresh`  
**Created**: 2026-04-12  
**Status**: Draft  
**Input**: User description: "Fantasy Classic required changes: replace cyan text with dark ink, replace pink borders and accents with brown, remove multi-colour icons in favor of a single muted brown system, use gold accents only for active tabs, selected elements, and key highlights, warm panels to match parchment, and reduce the overly soft card feel."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Cohesive Fantasy Styling (Priority: P1)

As a user browsing the app in the fantasy theme, I want titles, icons, borders, and highlights to stay within a strict ink-brown-gold system so the interface feels consistent instead of mixing fantasy styling with cyan, pink, and multicolor digital accents.

**Why this priority**: The strongest break in immersion is the presence of cyan text, pink borders and highlights, and multicolor icon rows. Removing those inconsistencies delivers the biggest visual improvement first.

**Independent Test**: Activate the fantasy theme and inspect the main reading and navigation surfaces. Standard UI text should read as dark ink, standard UI controls should read as brown, and only active or selected emphasis should read as gold.

**Acceptance Scenarios**:

1. **Given** the fantasy theme is active, **When** a user views titles such as entity names and section headings, **Then** they MUST appear in dark ink tones instead of cyan or other cold highlight colors.
2. **Given** the fantasy theme is active, **When** a user views standard borders, icons, and controls, **Then** those elements MUST use brown tones instead of pink or multicolor styling.
3. **Given** the fantasy theme is active, **When** a user views rows of category or tool icons, **Then** those icons MUST present as a unified muted-brown system rather than a multicolor strip.
4. **Given** the fantasy theme is active, **When** a tab or element is active, selected, or intentionally emphasized, **Then** that focus state MUST use gold rather than brown or any other accent color.

---

### User Story 2 - Parchment-Aligned Surfaces (Priority: P2)

As a user, I want panels, cards, sidebars, and other surfaces to feel physically related to the parchment background so the interface reads as one crafted material rather than separate app layers stacked on top of it.

**Why this priority**: After the accent colors are corrected, the next major source of mismatch is that panels still look cleaner, grayer, and more app-like than the background they sit on.

**Independent Test**: Activate the fantasy theme and compare background surfaces with the main panels, sidebars, cards, and primary action surfaces. The panels should feel warmer, less gray, and more integrated with the page, and the cards should feel slightly firmer and less app-like.

**Acceptance Scenarios**:

1. **Given** the fantasy theme is active, **When** a user opens a sidebar or detail panel, **Then** that surface MUST feel close to the parchment background rather than a neutral app card.
2. **Given** the fantasy theme is active, **When** a user views panel boundaries, **Then** separation MUST rely more on tone, spacing, and subtle depth and less on prominent outlined borders.
3. **Given** the fantasy theme is active, **When** a user sees the primary brown action tile or similarly dominant action surface, **Then** it MUST feel integrated with surrounding content and MUST NOT overpower the page hierarchy.
4. **Given** the fantasy theme is active, **When** a user compares background and foreground surfaces, **Then** the interface MUST stay within one warm material family and MUST NOT mix warm parchment with cold UI elements.
5. **Given** the fantasy theme is active, **When** a user views cards and panels, **Then** their edges MUST feel slightly firmer and less rounded than a soft generic app card.

---

### User Story 3 - Clearer Reading Hierarchy (Priority: P3)

As a user reading an entity, I want stronger hierarchy between titles, section headers, metadata, and content so the page feels structured and authored instead of visually flat.

**Why this priority**: Reading views are where users spend the most time. Once the palette and surfaces are cohesive, hierarchy improvements produce the next biggest usability gain.

**Independent Test**: Open an entity in the fantasy theme and scan the title area, section breaks, metadata, and content blocks. The reading order and levels of emphasis should be clearer at a glance, with section titles such as the chronicle area feeling more distinct and metadata reading more quietly.

**Acceptance Scenarios**:

1. **Given** the fantasy theme is active, **When** a user opens an entity, **Then** the main title MUST appear in darker ink with stronger emphasis and MUST NOT use bright or digital-looking highlights.
2. **Given** the fantasy theme is active, **When** a user scans section headers such as the chronicle area, **Then** those headers MUST be more distinct and more clearly separated from body content.
3. **Given** the fantasy theme is active, **When** a user scans metadata and secondary text, **Then** those elements MUST read as clearly secondary information while remaining accessible.
4. **Given** the fantasy theme is active, **When** a user moves through content sections, **Then** spacing and structure MUST make the page feel organized rather than compressed or flat.
5. **Given** the fantasy theme is active, **When** a user views cards and controls, **Then** edges MUST feel slightly more crafted and less soft-mobile in character.

### Edge Cases

- Other themes MUST remain visually unchanged.
- The fantasy theme MUST still feel cohesive even when user content includes mixed imagery or custom category data.
- Interaction states MUST remain accessible on warm parchment surfaces without relying on color change alone.
- If some surfaces cannot fully remove borders, the remaining borders MUST still stay within the warm fantasy tone family.
- The color rule is strict: brown for UI and interaction, gold for focus and importance, and no other colors in the standard fantasy UI shell.

### Assumptions

- The work applies to the existing Classic/fantasy theme rather than introducing a new theme.
- The most important affected experiences are the explorer, side panels, and entity reading views shown in the provided screenshots.
- The refresh is a visual cohesion pass, not a redesign of product flows or information architecture.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The fantasy theme MUST replace cyan text treatments with dark ink on standard titles and primary reading surfaces.
- **FR-002**: The fantasy theme MUST replace pink border and accent treatments with brown on standard fantasy-theme controls and surfaces.
- **FR-003**: The fantasy theme MUST remove multicolor standard icon presentation and replace it with a single muted-brown icon system for navigation and entity-list controls.
- **FR-004**: Brown MUST be the standard color for fantasy-theme UI chrome and interaction states.
- **FR-005**: Gold MUST be reserved for active tabs, selected elements, and key highlights in the fantasy theme.
- **FR-006**: The standard fantasy UI shell MUST NOT introduce other accent colors beyond dark ink, brown, parchment tones, and gold.
- **FR-007**: The fantasy theme MUST warm panel and sidebar surfaces so they visually belong to the parchment background.
- **FR-008**: The fantasy theme MUST reduce reliance on prominent visible borders where spacing and tonal contrast can achieve the same separation.
- **FR-009**: Entity titles in the fantasy theme MUST appear darker and more ink-like than they do today.
- **FR-010**: Section titles in the fantasy theme MUST be more distinct from metadata and secondary text, including the chronicle area in the entity view.
- **FR-011**: Primary brown action surfaces in the fantasy theme MUST be toned down so they support content instead of competing with it.
- **FR-012**: Panels, cards, and controls in the fantasy theme MUST feel slightly firmer and less soft-mobile in their edge treatment.
- **FR-013**: The refresh MUST preserve readability and accessible contrast across the affected fantasy-theme surfaces.
- **FR-014**: The refresh MUST include automated verification for the most visible fantasy-theme behaviors affected by this change.

### Key Entities _(include if feature involves data)_

- **Fantasy Theme Profile**: The set of visual rules that defines colors, emphasis, and interaction behavior for the fantasy experience.
- **Theme Surface**: Any visible panel, sidebar, card, or reading area that must feel materially aligned with the parchment background.
- **Interaction State**: The hover, selected, focused, and active presentation of controls within the fantasy theme.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In the fantasy theme, the main explorer and entity-reading flows no longer show cyan text, pink accent treatments, or multicolor standard icon rows.
- **SC-002**: In the fantasy theme, standard UI and interaction states read as brown, while active tabs, selected elements, and key highlights read as gold.
- **SC-003**: Manual review of the main fantasy surfaces confirms that panels and sidebars read as parchment-adjacent materials rather than neutral app cards, and that cards and panels feel slightly firmer and less app-like.
- **SC-004**: Automated theme checks cover the revised fantasy-theme palette, selected/focus treatment, and interaction behavior for the primary affected surfaces.
