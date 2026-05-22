# Feature Specification: Neutral App Chrome and World Theming

**Feature Branch**: `113-neutral-world-theming`  
**Created**: 2026-05-22  
**Status**: Draft  
**Input**: User description: "GitHub issue #860 requests a UI theming update: make the app default neutral instead of fantasy, separate stable app chrome from per-world genre theming, keep genre texture and jargon on world/canvas surfaces, add light and dark neutral workspace appearances, tune fantasy typography and graph styling, and preserve existing saved world themes."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Neutral Default Workspace (Priority: P1)

As a new user creating or opening a world, I want the app to start in a neutral workspace appearance so the tool does not imply that every world is fantasy.

**Why this priority**: The current default strongly frames all worlds as parchment fantasy. A neutral default fixes the largest mismatch for sci-fi, modern, horror, cyberpunk, and other non-fantasy worlds.

**Independent Test**: Start with no saved appearance preference and open the app. The first workspace experience should use neutral app styling and plain default terminology rather than fantasy parchment styling and fantasy-specific labels.

**Acceptance Scenarios**:

1. **Given** a first-time user with no saved appearance preference, **When** the app loads, **Then** the workspace MUST use a neutral default appearance rather than a fantasy appearance.
2. **Given** a new world without a saved world theme, **When** the user opens that world, **Then** the visible app chrome MUST remain neutral and must not use fantasy parchment as the app-wide background.
3. **Given** an existing user with a saved fantasy theme, **When** that user reopens the app or world, **Then** the saved fantasy preference MUST continue to be honored.
4. **Given** a user selects the fantasy theme intentionally, **When** the selection is saved, **Then** the user MUST still receive the fantasy world vocabulary and visual treatment where the world theme applies.

---

### User Story 2 - Stable App Chrome (Priority: P1)

As a user moving between navigation, search, settings, sidebars, and world content, I want the app chrome to remain clear and consistent so I can always tell the tool controls apart from the world canvas.

**Why this priority**: Productivity surfaces need predictable navigation and controls. The current one-layer theme causes chrome, panels, and canvas to visually blend together, which makes repeated tool use harder.

**Independent Test**: Switch between multiple world themes and inspect the header, activity navigation, footer, search entry, settings surfaces, modal shells, and sidebar shells. These chrome areas should stay visually stable while world surfaces change.

**Acceptance Scenarios**:

1. **Given** any world theme is active, **When** the user views global navigation, search, settings, or app-level modal shells, **Then** those chrome surfaces MUST keep the selected app appearance rather than adopting the world genre texture.
2. **Given** a textured world theme is active, **When** the user views global chrome, **Then** texture MUST NOT be applied as a wall-to-wall app background or repeated across chrome surfaces.
3. **Given** the user changes only the world theme, **When** the change is applied, **Then** global chrome MUST remain visually stable while the world canvas updates.
4. **Given** the user uses a light or dark app appearance, **When** the user opens app chrome surfaces, **Then** contrast and readability MUST remain accessible in that app appearance.

---

### User Story 3 - Per-World Genre Canvas (Priority: P2)

As a user with different worlds in different genres, I want each world to carry its own visual mood and vocabulary without changing the whole app around it.

**Why this priority**: World identity still matters. The update should not remove fantasy, cyberpunk, horror, or other genre expression; it should place that expression where it helps the user's content.

**Independent Test**: Create or open two worlds with different world themes. The world hero, canvas, graph styling, in-world accents, and genre vocabulary should differ per world while app chrome stays consistent.

**Acceptance Scenarios**:

1. **Given** a world has a selected genre theme, **When** the user views the world front page or primary canvas, **Then** those world surfaces SHOULD express that genre through appropriate color, accent, texture, graph, and terminology choices.
2. **Given** two worlds have different selected themes, **When** the user switches between them, **Then** each world MUST restore its own world theme independently.
3. **Given** a world theme includes genre-specific vocabulary, **When** the user views world-level actions and labels, **Then** the vocabulary SHOULD match the selected world theme.
4. **Given** global app chrome is visible beside a themed world canvas, **When** the user scans the screen, **Then** the distinction between app controls and world content MUST be clear.

---

### User Story 4 - Neutral Light and Dark App Appearances (Priority: P2)

As a user who works at different times of day, I want neutral light and dark app appearances so the workspace is comfortable without forcing a specific genre.

**Why this priority**: A neutral light-only default does not solve evening use, and a genre-themed dark mode would reintroduce the default-genre problem.

**Independent Test**: Select neutral light, neutral dark, and system app appearances. Each should provide a readable, restrained workspace with consistent controls and no genre-specific texture, with system following the user's device preference.

**Acceptance Scenarios**:

1. **Given** the user selects neutral light app appearance, **When** app chrome is displayed, **Then** it MUST use a restrained light workspace palette.
2. **Given** the user selects neutral dark app appearance, **When** app chrome is displayed, **Then** it MUST use a restrained dark workspace palette suitable for low-light use.
3. **Given** the user selects system app appearance, **When** the device preference changes between light and dark, **Then** the app appearance SHOULD follow that preference without changing the active world theme.
4. **Given** any neutral app appearance is selected, **When** the user changes world themes, **Then** the app appearance MUST remain unchanged unless the user explicitly changes it.
5. **Given** a neutral app appearance is active, **When** the user views headings and body text, **Then** typography MUST provide clear hierarchy without implying a specific story genre.

---

### User Story 5 - Layered Typography (Priority: P2)

As a user reading and navigating the app, I want typography to have separate roles for app controls, world mood, and authored content so the interface is clear without flattening every layer into one genre voice.

**Why this priority**: The issue calls out that one font across the whole fantasy interface makes the product feel flat. The broader fix is not only "use another font"; it is to define which layer owns which typographic voice.

**Independent Test**: Compare global chrome, world surfaces, and authored content in both a neutral app appearance and a genre world theme. App controls should stay practical and readable, world headings may carry genre character, and user-authored content should remain comfortable to read.

**Acceptance Scenarios**:

1. **Given** a neutral app appearance is active, **When** the user views app chrome controls and utility labels, **Then** those elements MUST use a readable neutral typography voice.
2. **Given** a genre world theme is active, **When** the user views world headers, hero surfaces, or graph labels, **Then** those elements MAY use genre typography where it improves world mood without harming readability.
3. **Given** the user reads authored world content, **When** a genre theme is active, **Then** body content MUST remain comfortable for long reading and MUST NOT be forced into a decorative display style.
4. **Given** a theme defines both heading and body typography, **When** the user scans a world page, **Then** headings, body copy, metadata, and controls MUST remain visually distinguishable.

---

### User Story 6 - Fantasy Theme Refinement (Priority: P3)

As a user who intentionally chooses the fantasy theme for a fantasy world, I want the theme to feel more polished and readable rather than heavy or flat.

**Why this priority**: Fantasy remains valuable as a world theme, but after it stops being the default app-wide identity, it needs focused tuning so its genre moment lands cleanly.

**Independent Test**: Select the fantasy world theme and inspect world surfaces, world typography, and graph relationships. The theme should retain a fantasy mood while improving hierarchy and reducing visual heaviness.

**Acceptance Scenarios**:

1. **Given** the fantasy world theme is active, **When** the user reads world content, **Then** headings and body text SHOULD have clearer hierarchy than a single-font presentation.
2. **Given** the fantasy world theme is active, **When** the user views graph relationships, **Then** edges SHOULD support the nodes without visually overpowering the graph.
3. **Given** the fantasy world theme is active, **When** the user views textured surfaces, **Then** parchment texture SHOULD appear as a world/canvas treatment rather than a repeated app-wide wallpaper.
4. **Given** the fantasy world theme is active, **When** the user views world surfaces and controls, **Then** the palette SHOULD include enough tonal contrast and visual rest to avoid a single warm-brown wash.
5. **Given** the fantasy world theme is active, **When** users interact with world content, **Then** active and selected states SHOULD remain clear without turning every surface into a high-emphasis accent.
6. **Given** the fantasy world theme is active, **When** panels, cards, and controls are displayed, **Then** their edge treatment SHOULD follow an intentional visual direction rather than an ambiguous in-between radius.

### Edge Cases

- Existing saved theme preferences must not be overwritten or migrated unexpectedly.
- Worlds without saved theme data should receive the neutral default behavior without losing the ability to choose a genre theme later.
- Demo or shared-session worlds that intentionally force a genre theme should still present that world theme while keeping app chrome understandable.
- If a user previews a world theme without saving it, the preview should not permanently change app appearance or another world's theme.
- Textured themes must not make chrome controls, settings, search, or modals harder to read.
- Overlay treatments such as hero vignettes must not muddy light world themes or make a light background look unintentionally darkened.
- Light world themes shown inside a dark app appearance, and dark world themes shown inside a light app appearance, must still have clear boundaries.
- Genre vocabulary should not leak into neutral app-wide labels unless a world theme intentionally controls that label.
- The change must preserve accessible contrast for common app and world interactions.

### Assumptions

- "App chrome" includes global navigation, activity navigation, footer, search, settings, notifications, command and modal shells, and other controls for operating the tool.
- "World canvas" includes world front page surfaces, graph/canvas/map presentation, entity/world content surfaces, and in-world accents.
- The first deliverable should introduce neutral app appearances and scoping rules before building a full onboarding genre picker.
- Existing genre themes remain available and are treated as world themes, not removed.
- A later onboarding improvement may ask for world genre during vault creation, but that is not required for this first spec.
- A later theme expansion may add light and dark variants for every genre theme, but this spec only requires neutral light, neutral dark, and system app appearances.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide a neutral default app appearance for users and worlds with no saved appearance or theme preference.
- **FR-002**: The system MUST provide neutral light, neutral dark, and system app appearances.
- **FR-003**: The system MUST preserve existing saved theme selections and continue honoring them after this change.
- **FR-004**: The system MUST separate app appearance from world theme so changing one does not implicitly change the other.
- **FR-005**: App chrome MUST use the selected app appearance rather than the selected world theme.
- **FR-006**: World surfaces SHOULD use the selected world theme for genre expression, including mood, accent, texture, graph style, and world vocabulary where applicable.
- **FR-007**: Texture MUST NOT be applied as an app-wide document background or as a default treatment for global chrome.
- **FR-008**: Texture MAY be used on world/canvas surfaces where it supports the selected world theme without harming readability.
- **FR-009**: Users MUST be able to identify and select the app appearance independently from the world theme.
- **FR-010**: Users MUST be able to identify and select the world theme independently from app appearance.
- **FR-011**: The selected world theme MUST be stored per world so different worlds can retain different themes.
- **FR-012**: Neutral app appearances MUST use clear typography hierarchy for headings, body text, controls, and metadata.
- **FR-013**: App chrome typography MUST remain neutral, readable, and consistent across world themes.
- **FR-014**: World theme typography MAY affect world/canvas headings, hero treatments, graph labels, and in-world accents.
- **FR-015**: Authored content body typography MUST remain readable for long-form use and MUST NOT be forced into decorative display styling.
- **FR-016**: Theme typography MUST distinguish headings, body copy, metadata, and controls clearly enough for users to scan pages quickly.
- **FR-017**: The fantasy world theme SHOULD use distinct heading and body typography to improve hierarchy.
- **FR-018**: The fantasy world theme SHOULD reduce graph edge visual weight so relationships support nodes rather than dominate them.
- **FR-019**: The fantasy world theme SHOULD keep parchment texture scoped to world/canvas moments rather than global chrome.
- **FR-020**: Light world themes MUST avoid dark overlay treatments that muddy light backgrounds or reduce perceived content clarity.
- **FR-021**: The fantasy world theme SHOULD provide enough palette contrast and visual rest to avoid a single warm-brown visual wash.
- **FR-022**: The fantasy world theme SHOULD use an intentional edge and corner treatment for panels, cards, and controls.
- **FR-023**: Theme previews MUST be temporary until explicitly saved.
- **FR-024**: Theme and appearance changes MUST remain readable and accessible across common light and dark combinations.
- **FR-025**: The help or appearance guidance available to users MUST describe the distinction between app appearance and world theme in clear, approachable language.
- **FR-026**: Automated verification MUST cover default neutral appearance, preservation of existing saved themes, independent app/world selection, and texture scoping.
- **FR-027**: Automated or manual visual verification MUST cover fantasy refinement, including typography hierarchy, graph relationship weight, overlay behavior, palette balance, and texture scoping.

### Key Entities _(include if feature involves data)_

- **App Appearance**: The user's global workspace presentation for app chrome. It includes neutral light and neutral dark options and does not encode a story genre.
- **World Theme**: The per-world genre presentation used for world content surfaces, graph/canvas/map styling, in-world accents, and world vocabulary.
- **Theme Preference**: A saved selection that records either app appearance or world theme at the correct scope.
- **App Chrome Surface**: A global tool surface such as navigation, search, settings, notifications, modal shells, and sidebars.
- **World Surface**: A content-bearing surface such as a world front page, graph, canvas, map, entity page, or cover presentation.
- **Genre Vocabulary**: Theme-specific labels for world actions and concepts that should follow the world theme, not the neutral app appearance.
- **Typography Layer**: The assigned font role for app chrome, world mood surfaces, authored content, metadata, and controls.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A first-time user with no saved preferences sees a neutral app appearance on initial load rather than fantasy parchment styling.
- **SC-002**: Existing users with a saved fantasy or other genre theme continue to see their saved world theme after the update.
- **SC-003**: Changing a world theme does not visibly alter global chrome surfaces in the primary app workflow.
- **SC-004**: Users can switch between neutral light, neutral dark, and system app appearances and retain that choice independently of world theme.
- **SC-005**: A user can maintain at least two worlds with different world themes while app chrome remains consistent between them.
- **SC-006**: Textures no longer appear as a wall-to-wall app background or repeated default chrome treatment during normal app use.
- **SC-007**: Fantasy world theme review confirms improved reading hierarchy, less visually dominant graph relationships, cleaner light-surface overlays, and more intentional palette and edge treatment while preserving a recognizable fantasy mood.
- **SC-008**: Verification covers the main appearance/theme flows before implementation is considered complete.
