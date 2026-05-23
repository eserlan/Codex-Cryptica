# Feature Specification: Default Art Prompts

**Feature Branch**: `115-default-art-prompts`  
**Created**: 2026-05-23  
**Status**: Draft  
**Input**: User description: "GitHub issue #867 proposes default AI art prompts with a predictable fallback hierarchy: entity-specific art direction, category-specific art direction, vault/world art direction, theme default art style, and a global Codex Cryptica default. Users should be able to edit vault art direction and category overrides, and draw commands should resolve the right prompt automatically."

## Clarifications

### Session 2026-05-23

- Q: Is this part of the neutral world theming spec? -> A: No. It is a separate spec because it affects AI art prompt resolution, vault settings, category overrides, and draw-command behavior rather than app chrome theming.
- Q: Should shipped default prompts copy named artist styles? -> A: No. Defaults should use descriptive visual direction and avoid named living-artist imitation while preserving mood, composition, medium, lighting, and material guidance.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Predictable Art Prompt Resolution (Priority: P1)

As a user generating an image for an entity, I want Codex Cryptica to apply the most specific available art direction so generated art feels consistent with my vault and the entity I am drawing.

**Why this priority**: The current image prompt path can feel inconsistent from request to request. The core value is a deterministic fallback hierarchy that makes art generation feel attached to the world rather than a standalone AI feature.

**Independent Test**: Configure art direction at multiple levels, trigger image generation for an entity, and verify the resolved prompt uses the highest-priority available art direction without skipping to less specific defaults.

**Acceptance Scenarios**:

1. **Given** an entity has entity-specific art direction, **When** the user draws that entity, **Then** the resolved prompt MUST use the entity-specific direction ahead of category, vault, theme, or global defaults.
2. **Given** an entity lacks entity-specific art direction and its category has an art direction override, **When** the user draws that entity, **Then** the resolved prompt MUST use the category override.
3. **Given** neither entity nor category art direction exists and the vault has default art direction, **When** the user draws an entity, **Then** the resolved prompt MUST use the vault default art direction.
4. **Given** no entity, category, or vault art direction exists and the vault has a theme with default art direction, **When** the user draws an entity, **Then** the resolved prompt MUST use the theme default art direction.
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

### User Story 3 - Editable Vault Art Direction (Priority: P2)

As a world owner, I want a Vault Settings area for AI Art Direction so I can control the visual style of generated art without rewriting every draw prompt.

**Why this priority**: Defaults should be useful out of the box, but users need control because every vault has its own visual identity.

**Independent Test**: Open vault settings, edit the default art style and one category override, save, reload the vault, and verify future draw prompts use the saved settings.

**Acceptance Scenarios**:

1. **Given** a user opens Vault Settings, **When** they view AI Art Direction, **Then** they MUST be able to see and edit the vault's default art style.
2. **Given** a user edits a category override, **When** they save settings, **Then** the override MUST persist for that vault and apply to future draws in that category.
3. **Given** a user clears a category override, **When** they save settings, **Then** that category MUST fall back to the next available art direction level.
4. **Given** a user changes art direction settings in one vault, **When** they open another vault, **Then** the other vault's art direction MUST remain unchanged.

---

### User Story 4 - Theme Defaults For Art Style (Priority: P2)

As a user who selects a world theme, I want that theme to provide an appropriate default art style so image generation starts with a coherent mood before I customize anything.

**Why this priority**: Theme defaults make first-use image generation consistent and reduce setup work, but they should not override explicit user choices.

**Independent Test**: Select different world themes with no vault or category overrides, draw the same subject, and verify the resolved prompt reflects the selected theme's default art style.

**Acceptance Scenarios**:

1. **Given** a vault uses a fantasy theme and no art overrides, **When** the user draws a subject, **Then** the resolved prompt SHOULD use a fantasy-appropriate descriptive art style.
2. **Given** a vault uses a sci-fi, cyberpunk, modern, post-apocalyptic, gothic horror, steampunk, mythic, or pulp-adventure theme and no art overrides, **When** the user draws a subject, **Then** the resolved prompt SHOULD reflect that theme's mood and materials.
3. **Given** a vault has an explicit default art style, **When** the vault theme changes, **Then** the explicit vault art style MUST remain the active fallback until cleared or changed.
4. **Given** a shipped default art style is used, **When** its prompt is assembled, **Then** it MUST avoid naming living artists as style targets.

---

### User Story 5 - Draw Command Uses Resolved Art Direction (Priority: P2)

As a user using `/draw`, sidepanel draw, or chat draw actions, I want all image generation entry points to use the same art direction resolver so generated results are consistent.

**Why this priority**: Users should not get different style behavior depending on which draw button or command they use.

**Independent Test**: Trigger image generation through `/draw`, entity sidepanel draw, and chat draw for the same subject and verify each path uses the same resolved art direction for equivalent subject/category context.

**Acceptance Scenarios**:

1. **Given** the user enters `/draw character Almos`, **When** the command resolves the subject and category, **Then** it MUST apply the Character art direction fallback chain.
2. **Given** the user draws from an entity sidepanel, **When** the entity has a category, **Then** the resolver MUST use that entity and category context.
3. **Given** the user draws from an Oracle chat message, **When** the message is associated with an entity or category context, **Then** the resolver SHOULD use that context where available and fall back safely where it is not.
4. **Given** a draw request is missing category context, **When** the resolver builds the prompt, **Then** it MUST fall back to vault, theme, or global art direction instead of failing.

### Edge Cases

- Entity-specific art direction is empty or whitespace-only.
- Category override exists for a category that no longer exists in the vault.
- A category is renamed after an art direction override was saved.
- Vault art direction is extremely long.
- Prompt templates omit the `{subject}` placeholder.
- Prompt templates include multiple `{subject}` placeholders.
- No theme art direction exists for the selected world theme.
- Image generation is disabled by tier or capability guard.
- Demo or shared-session vaults should not persist unauthorized art direction edits.
- Existing image generation prompts and visual distillation should keep working when no art direction data exists.

### Assumptions

- Art direction is a text prompt template that may include `{subject}` as the subject insertion point.
- Entity-specific art direction is optional and may be added later if entity editing UI is not part of the first implementation.
- The first implementation should cover vault default art direction, category overrides, theme defaults, global default, and resolver integration for existing draw entry points.
- Existing image generation model calls remain unchanged; this feature prepares the prompt before it reaches the image generation service.
- Prompt defaults should be concise enough to guide style without producing unwieldy prompts.
- Shipped defaults should describe style through medium, composition, lighting, mood, materials, and visual constraints rather than named artist imitation.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide a single art direction resolver used by all image generation entry points.
- **FR-002**: The resolver MUST apply this fallback order: entity-specific art direction, category-specific art direction, vault default art direction, theme default art direction, global Codex Cryptica default art direction.
- **FR-003**: The resolver MUST skip empty, whitespace-only, or invalid art direction values and continue to the next fallback level.
- **FR-004**: The resolver MUST insert the requested subject into the selected art direction template.
- **FR-005**: If a selected template does not include `{subject}`, the system MUST still include the subject in the final prompt.
- **FR-006**: Users MUST be able to configure vault default art direction per vault.
- **FR-007**: Users MUST be able to configure category-specific art direction overrides per vault.
- **FR-008**: Saved art direction settings MUST persist per vault and MUST NOT affect other vaults.
- **FR-009**: Clearing a category-specific override MUST restore fallback to the next available art direction level.
- **FR-010**: The system MUST provide shipped global default art direction.
- **FR-011**: The system SHOULD provide shipped theme default art directions for supported world themes.
- **FR-012**: The system SHOULD provide category-specific default templates for common categories including Character, Creature, Location, Item, Faction, Event, and Note.
- **FR-013**: Theme default and category default prompts MUST avoid naming living artists or directly imitating a living artist's style.
- **FR-014**: Default prompts SHOULD remain concise and focused on subject, medium, composition, lighting, mood, materials, and readability.
- **FR-015**: Existing `/draw` command behavior MUST use the art direction resolver before calling image generation.
- **FR-016**: Existing entity sidepanel draw behavior MUST use the art direction resolver before calling image generation.
- **FR-017**: Existing Oracle chat draw behavior SHOULD use the art direction resolver when subject or category context is available.
- **FR-018**: If AI image generation is unavailable because of tier, capability, or missing configuration, art direction settings MUST remain editable but generation controls MUST keep existing gating behavior.
- **FR-019**: Users MUST be able to preview or understand which fallback level will be used for a category before saving settings.
- **FR-020**: Automated verification MUST cover resolver fallback order, template subject insertion, empty-value fallback, per-vault persistence, category overrides, and at least one draw entry point.
- **FR-021**: User-facing labels and help text MUST use clear wording such as "AI Art Direction", "Default Art Style", and "Category Overrides".

### Key Entities _(include if feature involves data)_

- **Art Direction Template**: A prompt template that guides image style and may include `{subject}`.
- **Resolved Art Direction**: The final prompt text assembled for a draw request after applying fallback rules and subject insertion.
- **Vault Art Direction Settings**: Per-vault settings containing a default art style and category overrides.
- **Category Art Direction Override**: A per-vault art direction template assigned to a category or category-like type.
- **Theme Art Direction Default**: A shipped default prompt associated with a world theme.
- **Global Art Direction Default**: The final fallback prompt used when no more specific art direction is available.
- **Draw Request Context**: Subject text plus optional entity id, category, vault id, and theme id used by the resolver.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A draw request with entity, category, vault, theme, and global art direction available uses the entity-specific art direction.
- **SC-002**: A draw request without entity-specific art direction but with category art direction uses the category art direction.
- **SC-003**: A user can edit vault default art direction and category overrides, reload the vault, and see those settings persist.
- **SC-004**: Two vaults can maintain different art direction settings without affecting each other.
- **SC-005**: `/draw` image generation uses the same resolver as at least one existing draw button path.
- **SC-006**: Shipped default prompts pass review for concise descriptive language and avoid named living-artist style imitation.
- **SC-007**: Verification covers the fallback hierarchy and existing image generation still works with no saved art direction settings.
