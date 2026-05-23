# Feature Specification: Default Art Prompts

**Feature Branch**: `115-default-art-prompts`  
**Created**: 2026-05-23  
**Status**: Draft  
**Input**: User description: "GitHub issue #867 proposes default AI art prompts with a predictable fallback hierarchy: entity-specific art direction, category-specific art direction, vault/world art direction, theme default art style, and a global Codex Cryptica default. The first implementation should make draw actions resolve consistent default art direction automatically; custom user art direction should come from normal notes/entities rather than a dedicated art-style settings editor."

## Clarifications

### Session 2026-05-23

- Q: Is this part of the neutral world theming spec? -> A: No. It is a separate spec because it affects AI art prompt resolution, world-content context, category defaults, theme defaults, and draw-command behavior rather than app chrome theming.
- Q: Should shipped default prompts copy named artist styles? -> A: No. Defaults should use descriptive visual direction and avoid named living-artist imitation while preserving mood, composition, medium, lighting, and material guidance.
- Q: Should the first implementation include UI for editing entity-specific art direction? -> A: No. Keep entity-specific art direction as the highest-priority resolver slot, but do not build entity-level editing UI in the first implementation.
- Q: How should category art direction be keyed so category renames are handled? -> A: Resolve category art direction by stable category ID where a real category exists.
- Q: How should `/draw character Almos` treat `character`? -> A: Command category words may supply category context, but matched entity metadata wins when the subject resolves to an entity with a category.
- Q: Should custom art direction be edited in dedicated Vault Settings? -> A: No. The first implementation should not add a dedicated art-style settings editor; user-authored art direction should be represented through normal notes/entities.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Predictable Art Prompt Resolution (Priority: P1)

As a user generating an image for an entity, I want Codex Cryptica to apply the most specific available art direction so generated art feels consistent with my vault and the entity I am drawing.

**Why this priority**: The current image prompt path can feel inconsistent from request to request. The core value is a deterministic fallback hierarchy that makes art generation feel attached to the world rather than a standalone AI feature.

**Independent Test**: Configure art direction at multiple levels, trigger image generation for an entity, and verify the resolved prompt uses the highest-priority available art direction without skipping to less specific defaults.

**Acceptance Scenarios**:

1. **Given** an entity has entity-specific art direction available from its content/context, **When** the user draws that entity, **Then** the resolved prompt MUST use the entity-specific direction ahead of user-authored vault art direction, category defaults, theme defaults, or global defaults.
2. **Given** an entity lacks entity-specific art direction and relevant user-authored art direction content is available in the draw context, **When** the user draws that entity, **Then** the resolved prompt MUST use the user-authored art direction.
3. **Given** neither entity-specific nor user-authored art direction exists and the entity category has a shipped category default, **When** the user draws an entity, **Then** the resolved prompt MUST use the category default art direction.
4. **Given** no entity, user-authored, or category art direction exists and the vault has a theme with default art direction, **When** the user draws an entity, **Then** the resolved prompt MUST use the theme default art direction.
5. **Given** no specific art direction exists anywhere, **When** the user draws an entity, **Then** the resolved prompt MUST use the global Codex Cryptica default art direction.

---

### User Story 2 - Category-Aware Composition Defaults (Priority: P1)

As a user drawing different kinds of world objects, I want category defaults to guide composition so characters, locations, items, factions, events, and notes do not all produce the same kind of image.

**Why this priority**: Issue #867 identifies category-specific fallback as the strongest improvement. Theme supplies mood, but category supplies the shot type and framing needed for useful art.

**Independent Test**: Draw entities in different categories with the same vault/theme art direction and verify the resolved prompts differ by category composition while retaining the same world style.

**Acceptance Scenarios**:

1. **Given** a Character category default exists, **When** the user draws a character, **Then** the prompt SHOULD emphasize readable silhouette, pose, clothing, and character design.
2. **Given** a Location category default exists, **When** the user draws a location, **Then** the prompt SHOULD emphasize establishing shot, atmosphere, architecture or landscape, and sense of place.
3. **Given** an Item category default exists, **When** the user draws an item, **Then** the prompt SHOULD emphasize prop design, materials, craftsmanship, and a clear presentation background.
4. **Given** categories such as Creature, Faction, Event, or Note have defaults, **When** the user draws matching entities, **Then** the prompt SHOULD use category-specific composition guidance rather than only the vault default.

---

### User Story 3 - User Authored Art Direction Content (Priority: P2)

As a world owner, I want custom art direction to live as normal world content so style guidance remains part of the vault rather than a separate settings form.

**Why this priority**: Users can already express world knowledge through notes and entities. Keeping custom art direction in that content model avoids adding another configuration surface and lets style guidance be discovered, edited, searched, and synced like other lore.

**Independent Test**: Create or identify a note/entity intended as art direction, include it in the draw context, and verify the resolver can use user-authored art direction when available without requiring a dedicated settings editor.

**Acceptance Scenarios**:

1. **Given** a vault contains user-authored art direction content, **When** a draw request includes that content in its context, **Then** the resolver SHOULD use that art direction ahead of shipped theme or global defaults.
2. **Given** a user wants a custom art style, **When** they create a note/entity for that guidance, **Then** the feature MUST NOT require them to duplicate that guidance into a dedicated settings form.
3. **Given** no user-authored art direction content is available, **When** the user draws an image, **Then** the resolver MUST fall back to shipped category, theme, and global defaults.
4. **Given** a user-authored art direction note/entity is edited or deleted, **When** future draw context changes, **Then** the resolver MUST use the current available content and fall back safely if it is absent.

---

### User Story 4 - Theme Defaults For Art Style (Priority: P2)

As a user who selects a world theme, I want that theme to provide an appropriate default art style so image generation starts with a coherent mood before I customize anything.

**Why this priority**: Theme defaults make first-use image generation consistent and reduce setup work, but they should not override relevant user-authored art direction content.

**Independent Test**: Select different world themes with no user-authored art direction in context, draw the same subject, and verify the resolved prompt reflects the selected theme's default art style.

**Acceptance Scenarios**:

1. **Given** a vault uses a fantasy theme and no user-authored art direction is available, **When** the user draws a subject, **Then** the resolved prompt SHOULD use a fantasy-appropriate descriptive art style.
2. **Given** a vault uses a sci-fi, cyberpunk, modern, post-apocalyptic, gothic horror, steampunk, mythic, or pulp-adventure theme and no user-authored art direction is available, **When** the user draws a subject, **Then** the resolved prompt SHOULD reflect that theme's mood and materials.
3. **Given** relevant user-authored art direction content is available, **When** the vault theme changes, **Then** the user-authored art direction MUST remain higher priority than the shipped theme default.
4. **Given** a shipped default art style is used, **When** its prompt is assembled, **Then** it MUST avoid naming living artists as style targets.

---

### User Story 5 - Draw Entry Points Use Resolved Art Direction (Priority: P2)

As a user using `/draw`, entity sidebar draw, Zen mode draw, graph context menu draw, front page cover generation, or chat draw actions, I want all image generation entry points to use the same art direction resolver so generated results are consistent.

**Why this priority**: Users should not get different style behavior depending on which draw button or command they use.

**Independent Test**: Trigger image generation through `/draw`, entity sidebar draw, Zen mode draw, graph context menu draw, front page cover generation, and chat draw for the same or equivalent subject and verify each path uses the same resolver with the best available subject/category/vault/theme context.

**Acceptance Scenarios**:

1. **Given** the user enters `/draw character Almos`, **When** the command resolves the subject and category, **Then** it MUST apply the Character art direction fallback chain.
2. **Given** the user draws from an entity sidebar, **When** the entity has a category, **Then** the resolver MUST use that entity and category context.
3. **Given** the user draws from Zen mode, **When** the active entity has a category, **Then** the resolver MUST use that entity and category context.
4. **Given** the user draws from the graph context menu for a selected node, **When** the selected node maps to an entity, **Then** the resolver MUST use that entity and category context.
5. **Given** the user generates front page cover art, **When** the request is for the world cover rather than a specific entity, **Then** the resolver MUST use vault, theme, and global art direction with cover/world composition context.
6. **Given** the user draws from an Oracle chat message, **When** the message is associated with an entity or category context, **Then** the resolver SHOULD use that context where available and fall back safely where it is not.
7. **Given** a draw request is missing category context, **When** the resolver builds the prompt, **Then** it MUST fall back to vault, theme, or global art direction instead of failing.

### Edge Cases

- Entity-specific art direction is empty or whitespace-only.
- A category is renamed after shipped or inferred category art direction was resolved.
- User-authored art direction content is extremely long.
- Prompt templates omit the `{subject}` placeholder.
- Prompt templates include multiple `{subject}` placeholders.
- No theme art direction exists for the selected world theme.
- Image generation is disabled by tier or capability guard.
- Demo or shared-session vaults should not persist unauthorized art direction content edits.
- Existing image generation prompts and visual distillation should keep working when no art direction data exists.

### Assumptions

- Art direction is a text prompt template that may include `{subject}` as the subject insertion point.
- Entity-specific art direction remains the highest-priority resolver input, but entity-level editing UI is out of scope for the first implementation.
- The first implementation should cover resolver support for entity/user-authored context where already available, shipped category defaults, theme defaults, global default, and resolver integration for existing draw entry points including `/draw`, entity sidebar draw, Zen mode draw, graph context menu draw, front page cover generation, and Oracle chat draw.
- Existing image generation model calls remain unchanged; this feature prepares the prompt before it reaches the image generation service.
- Prompt defaults should be concise enough to guide style without producing unwieldy prompts.
- Shipped defaults should describe style through medium, composition, lighting, mood, materials, and visual constraints rather than named artist imitation.
- For `/draw` commands, a recognized category word may provide category context, but matched entity metadata takes precedence over the command-provided category when both are present.
- The first implementation should not add a dedicated Vault Settings editor for art style. User-authored art direction belongs in ordinary notes/entities and can be included through existing context mechanisms or a later content-linking enhancement.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide a single art direction resolver used by all image generation entry points.
- **FR-002**: The resolver MUST apply this fallback order: entity-specific art direction from context, relevant user-authored art direction content, shipped category default art direction, theme default art direction, global Codex Cryptica default art direction.
- **FR-003**: The resolver MUST skip empty, whitespace-only, or invalid art direction values and continue to the next fallback level.
- **FR-004**: The resolver MUST insert the requested subject into the selected art direction template.
- **FR-005**: If a selected template does not include `{subject}`, the system MUST still include the subject in the final prompt.
- **FR-006**: The first implementation MUST NOT add a dedicated Vault Settings editor for art direction.
- **FR-007**: User-authored art direction SHOULD be represented through ordinary notes/entities rather than separate art-style settings.
- **FR-007a**: When user-authored art direction is available in draw context, the resolver SHOULD treat it as higher priority than shipped category, theme, or global defaults.
- **FR-008**: Art direction represented as normal notes/entities MUST follow existing per-vault content persistence and sharing behavior.
- **FR-009**: If user-authored art direction content is unavailable, removed, or empty, the resolver MUST fall back to shipped category, theme, or global defaults.
- **FR-010**: The system MUST provide shipped global default art direction.
- **FR-011**: The system SHOULD provide shipped theme default art directions for supported world themes.
- **FR-012**: The system SHOULD provide category-specific default templates for common categories including Character, Creature, Location, Item, Faction, Event, and Note.
- **FR-013**: Theme default and category default prompts MUST avoid naming living artists or directly imitating a living artist's style.
- **FR-014**: Default prompts SHOULD remain concise and focused on subject, medium, composition, lighting, mood, materials, and readability.
- **FR-015**: Existing `/draw` command behavior MUST use the art direction resolver before calling image generation.
- **FR-015a**: `/draw` command parsing MUST allow recognized category words to provide category context, while matched entity category metadata MUST take precedence when the subject resolves to an entity.
- **FR-016**: Existing entity sidebar draw behavior MUST use the art direction resolver before calling image generation.
- **FR-016a**: Existing Zen mode draw behavior MUST use the art direction resolver before calling image generation.
- **FR-016b**: Existing graph context menu image generation behavior MUST use the art direction resolver before calling image generation.
- **FR-016c**: Existing front page cover generation behavior MUST use the art direction resolver with world cover context before calling image generation.
- **FR-017**: Existing Oracle chat draw behavior SHOULD use the art direction resolver when subject or category context is available.
- **FR-018**: If AI image generation is unavailable because of tier, capability, or missing configuration, normal notes/entities MUST remain editable according to existing permissions but generation controls MUST keep existing gating behavior.
- **FR-019**: Users SHOULD be able to understand which fallback level was used for a resolved draw prompt when troubleshooting art direction.
- **FR-020**: Automated verification MUST cover resolver fallback order, template subject insertion, empty-value fallback, shipped category defaults, user-authored context fallback, and existing draw entry points including `/draw`, entity sidebar, Zen mode, graph context menu, front page cover generation, and Oracle chat where context is available.
- **FR-021**: User-facing labels and help text MUST use clear wording such as "Art Direction", "Default Art Style", and "Category Defaults" without implying a dedicated settings editor.

### Key Entities _(include if feature involves data)_

- **Art Direction Template**: A prompt template that guides image style and may include `{subject}`.
- **Resolved Art Direction**: The final prompt text assembled for a draw request after applying fallback rules and subject insertion.
- **User Authored Art Direction Content**: A normal note/entity that describes desired visual style, mood, materials, or composition and can be included in draw context.
- **Category Art Direction Default**: A shipped art direction template associated with a category or category-like type.
- **Theme Art Direction Default**: A shipped default prompt associated with a world theme.
- **Global Art Direction Default**: The final fallback prompt used when no more specific art direction is available.
- **Draw Request Context**: Subject text plus optional entity id, category, vault id, theme id, and surface context such as entity visual, chat visual, graph node image, or world cover used by the resolver.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A draw request with entity, category, vault, theme, and global art direction available uses the entity-specific art direction.
- **SC-002**: A draw request without entity-specific art direction but with category default art direction uses the category default art direction.
- **SC-003**: A draw request with relevant user-authored art direction content uses that content ahead of shipped category, theme, or global defaults.
- **SC-004**: Custom art direction can be represented as ordinary vault content without adding a dedicated art-style settings editor.
- **SC-005**: `/draw`, entity sidebar draw, Zen mode draw, graph context menu image generation, front page cover generation, and Oracle chat draw all use the same resolver where context is available.
- **SC-006**: Shipped default prompts pass review for concise descriptive language and avoid named living-artist style imitation.
- **SC-007**: Verification covers the fallback hierarchy and existing image generation still works with no user-authored art direction content.

---

## 2026-05-23 Update: Art Direction Clarification (#874)

An architectural and content review of the initial implementation identified a few key issues to address as an improvement to this spec:

1. **Composition Over Selection**: Instead of picking only one template (e.g., category blocking theme), category and theme default templates must compose with the global default: `category template + theme template + global template`.
2. **Normalized Theme Mapping**: Aligned theme IDs to match `theme.ts` definitions, adding explicit theme mapping/aliases (horror, apocalyptic).
3. **Missing Themes**: Implemented fallout, starwars, and startrek default templates.
4. **Visual Quality Refinements**: Theme prompts updated with explicit medium, palette, and conditional lighting. Banned "cinematic" word removed. Global default is genre-neutral.
