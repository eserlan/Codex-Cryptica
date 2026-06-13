# Feature Specification: In-App RPG Generators

**Feature Branch**: `130-in-app-rpg-generators`  
**Created**: 2026-06-13  
**Status**: Draft  
**Input**: User description: "Bring the public RPG generators into the Codex Cryptica campaign app as a native workflow for configuring, generating, reviewing, and saving NPC, Faction, Settlement, and Magic Item drafts directly into the active vault, with theme-aware defaults, local fallback generation, and existing Oracle privacy controls."

## References

- Master issue: [#1129](https://github.com/eserlan/Codex-Cryptica/issues/1129)
- Roadmap: [docs/plans/in-app-rpg-generators.md](../../docs/plans/in-app-rpg-generators.md)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Generate And Save A Campaign Entity (Priority: P1)

As a Game Master working inside a campaign, I want to open an in-app generator, choose an NPC, Faction, Settlement, or Magic Item generator, configure its options, review the generated draft, and save it directly into my active campaign so I can create usable campaign content without leaving the app.

**Why this priority**: This is the core value of the feature. Without direct generation and save, the public generators remain separate from campaign preparation.

**Independent Test**: Can be fully tested by opening the generator workflow in an active campaign, generating one supported entity type, editing the draft, saving it, and confirming the new entity appears in the campaign with the reviewed content and labels.

**Acceptance Scenarios**:

1. **Given** a Game Master has an active writable campaign, **When** they choose the NPC generator, configure required options, generate a draft, review it, and save it, **Then** a new character entity is added to the active campaign with the reviewed title, summary, lore, and labels.
2. **Given** a generated draft is visible in review, **When** the Game Master changes the title, body text, entity type, or labels before saving, **Then** the saved entity reflects the edited draft rather than the original generated text.
3. **Given** a Game Master cancels during configuration or review, **When** they confirm cancellation, **Then** no new entity is added to the campaign.

---

### User Story 2 - Generate Without AI When Needed (Priority: P2)

As a Game Master who has disabled AI features, lacks an active AI connection, or prefers not to use AI for a draft, I want generator output to remain available through non-AI generation so I can still create campaign-ready drafts privately.

**Why this priority**: The feature must respect local-first and privacy expectations. A generator hub that fails whenever AI is unavailable would be less useful than the existing public generators.

**Independent Test**: Can be tested by disabling AI features, opening the generator workflow, generating each supported entity type, and confirming usable draft output is produced without sending campaign context to an AI service.

**Acceptance Scenarios**:

1. **Given** AI features are disabled, **When** the Game Master generates a supported entity, **Then** the workflow produces a usable draft without requiring AI.
2. **Given** an AI generation attempt fails, **When** a non-AI fallback is available, **Then** the workflow offers or uses fallback generation and clearly communicates what happened.
3. **Given** a user is not allowed to use AI-backed generation in the current session, **When** they open the generator workflow, **Then** unavailable AI controls are disabled or explained without blocking non-AI generation.

---

### User Story 3 - Use Campaign Theme And Context (Priority: P3)

As a Game Master, I want generator options to start with defaults that match my campaign's current theme and, when launched from an existing entity through the existing Generate Related action, include relationship context so new drafts feel connected to the campaign.

**Why this priority**: Theme and context reduce setup time and make generated content more useful, but the base workflow remains valuable without them.

**Independent Test**: Can be tested by changing the active campaign theme, opening a supported generator, confirming defaults change appropriately, launching generation from an existing entity via the current Generate Related entry point, and saving a draft with a relationship back to the source.

**Acceptance Scenarios**:

1. **Given** a campaign uses a gothic or noir theme, **When** the Game Master opens a supported generator, **Then** defaults favor genre-appropriate options while still allowing manual override.
2. **Given** the Game Master launches generation from an existing entity, **When** they save the generated draft and choose to link it, **Then** the new entity is connected back to the source entity with the selected relationship.
3. **Given** no theme-specific mapping exists for the current campaign theme, **When** the Game Master opens the generator, **Then** neutral defaults are used and generation still works.
4. **Given** the existing entity sidebar or Zen Mode Generate Related button is visible, **When** the Game Master clicks it, **Then** the unified generator workflow opens with the source entity context prefilled instead of opening a separate legacy related-entity workflow.

---

### User Story 4 - Keep Public Generators On The Shared Engine (Priority: P4)

As a visitor or Game Master using the existing public generator pages, I want those pages to keep working while they move onto the same generator package as the in-app workflow so public and campaign generation stay aligned without duplicated logic.

**Why this priority**: The new package should become the shared generator source, not a second implementation. This protects existing public generator behavior while making future generator improvements available to both surfaces.

**Independent Test**: Can be tested by running the existing public generator flows for NPC, Faction, Settlement, and Magic Item after package extraction and confirming the public pages still produce usable output from the shared package APIs.

**Acceptance Scenarios**:

1. **Given** a user opens an existing public generator page, **When** they generate NPC, Faction, Settlement, or Magic Item output, **Then** the page completes its existing primary flow using shared package logic.
2. **Given** public and in-app workflows support the same generator type, **When** non-AI generation runs with equivalent options, **Then** both workflows use the same package-owned generator contract and output mapping rules.
3. **Given** a public generator has SEO copy, routing, or discovery behavior, **When** the underlying logic moves into the package, **Then** the public page keeps its current route and user-facing public-page behavior.

---

### User Story 5 - Understand And Discover The Workflow (Priority: P5)

As a Game Master discovering the feature, I want clear in-app guidance and help content so I understand when to use generators, what is saved, and how privacy is handled.

**Why this priority**: Guidance improves adoption and reduces confusion, but it follows the core creation workflow.

**Independent Test**: Can be tested by viewing help content and first-use guidance, then completing a generation and save flow without needing external instructions.

**Acceptance Scenarios**:

1. **Given** a user opens the generator workflow for the first time, **When** guidance is shown, **Then** it explains the generator's purpose, review-before-save behavior, and privacy expectations in plain language.
2. **Given** a user reads the relevant help article, **When** they follow its steps, **Then** they can complete a generator draft and save it into the campaign.

### Edge Cases

- No active campaign is open: the generator entry point is unavailable or explains that a campaign must be opened first.
- The active campaign is read-only, guest-controlled, or otherwise not writable: draft generation may be allowed, but saving is blocked with clear language.
- Generation fails before producing a draft: the user sees a clear error and can retry or cancel without changing campaign data.
- Saving fails after review: the draft remains available so the user can retry or copy their work.
- A generated draft has missing or invalid required fields: the review step requires the user to fix them before saving.
- A generated title duplicates an existing entity title: the user can edit the title before saving, and the workflow follows existing campaign duplicate-handling behavior.
- A selected generator is unsupported or unavailable: the workflow prevents generation and clearly identifies the unsupported choice.
- Theme-derived defaults are wrong for the user's intent: every theme-derived option remains editable before generation.
- AI-backed generation has access to entity context: only explicitly selected or necessary context is used, and full campaign contents are not included by default.
- Existing public generator pages depend on package logic that changes: the page route and public-facing behavior remain stable while shared logic is migrated behind the page.
- Existing Generate Related users expect the old sidebar behavior: the entry point remains visible in the same places, but it launches the unified generator workflow with relationship controls.
- A vault has many entities or very large lore entries: generator context is summarized, capped, and inspectable instead of passing the full vault or full entity text.
- A user removes optional context before generation: the generator still works from selected options, theme defaults, and any remaining explicit context.
- A target entity type has a custom vault template: generated campaign drafts use that custom structure instead of only the system default.
- Generator output contains details that do not match any template heading: the unmatched details remain reviewable and are placed in an appropriate editable section rather than being discarded.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide an in-app generator workflow accessible from the campaign workspace when a campaign is active.
- **FR-002**: The system MUST initially support NPC, Faction, Settlement, and Magic Item generation.
- **FR-003**: Users MUST be able to select the generator type before generating a draft.
- **FR-004**: Users MUST be able to configure generator options relevant to the selected generator type before generation.
- **FR-005**: The system MUST produce a reviewable draft before any generated content is saved into the campaign.
- **FR-006**: Users MUST be able to edit the generated draft's title, entity type, summary or main text, lore or detail text, and labels before saving.
- **FR-007**: The system MUST save approved drafts directly into the active campaign as campaign entities.
- **FR-008**: The system MUST preserve generated and user-edited metadata as labels and MUST NOT present this metadata as tags.
- **FR-009**: The system MUST avoid requiring users to leave the campaign app or complete an external transfer step in order to import generated content.
- **FR-010**: The system MUST support non-AI generation for each initial generator type.
- **FR-011**: The system MUST respect current AI availability, user choices, and session permissions when offering AI-backed generation.
- **FR-012**: The system MUST clearly communicate when AI-backed generation is unavailable, disabled, or has failed.
- **FR-013**: The system MUST not include full campaign contents in AI-backed generation by default.
- **FR-014**: The system MUST allow theme-derived generator defaults based on the active campaign theme.
- **FR-015**: Users MUST be able to override any theme-derived default before generating.
- **FR-016**: The system MUST allow generator launch from an existing entity when that context is available.
- **FR-017**: When launched from an existing entity, users MUST be able to save an optional relationship between the source entity and the generated entity.
- **FR-018**: The system MUST prevent saving generated drafts into campaigns where the current user or session cannot write.
- **FR-019**: The system MUST preserve the unsaved draft when save fails.
- **FR-020**: The system MUST provide clear cancellation behavior that leaves campaign data unchanged.
- **FR-021**: The system MUST keep existing public generator pages available and behaviorally aligned where they share generator outcomes.
- **FR-022**: The system MUST include user-facing help or guidance for the in-app generator workflow.
- **FR-023**: The system MUST merge existing context-aware Generate Related behavior into the broader generator workflow rather than maintaining a separate competing related-entity workflow.
- **FR-024**: Existing public NPC, Faction, Settlement, and Magic Item generator pages MUST transition to shared `packages/generator-engine` logic for supported generator contracts, defaults, and output mapping.
- **FR-025**: The public generator transition MUST preserve existing public routes, SEO/discovery behavior, and primary generation flows.
- **FR-026**: Existing Generate Related entry points in the entity sidebar and Zen Mode MUST remain available to hosts and MUST open the unified generator workflow with `sourceEntityId` context.
- **FR-027**: The legacy related-entity modal MUST be retired or reduced to a compatibility wrapper once the unified workflow covers source context, relationship selection, review-before-save, and linked save behavior.
- **FR-028**: The system MUST build a bounded vault context packet before generator execution when campaign context is used.
- **FR-029**: The vault context packet MUST include only explicit, relevant context such as active theme, target category, template outline, selected source entity excerpt, capped neighboring entity excerpts, title hints, and label suggestions.
- **FR-030**: Users MUST be able to inspect which vault context categories are included before AI-backed generation and remove optional source or neighbor context.
- **FR-031**: Generator package logic MUST receive vault context only through the context packet and MUST NOT read campaign vault stores directly.
- **FR-032**: Generated campaign drafts MUST apply the active entity template for the selected target entity type when a template exists.
- **FR-033**: Vault-level custom templates MUST take precedence over system default templates for generated campaign draft structure.
- **FR-034**: Users MUST be able to review and edit generated template sections before saving.
- **FR-035**: Users MUST be able to disable template application for a generated draft before generation or review.
- **FR-036**: Non-AI generation MUST map generated fields into known template sections where possible and preserve unmatched generated details in an editable section.
- **FR-037**: AI-backed generation MUST receive the resolved template outline as a structural requirement when template application is enabled.

### Key Entities

- **Generator**: A selectable content creator for a specific kind of campaign entity, such as NPC, Faction, Settlement, or Magic Item.
- **Generator Option**: A user-configurable choice that influences generated output, such as genre, role, scope, alignment, rarity, or other generator-specific settings.
- **Generated Draft**: A temporary, reviewable result that contains proposed entity content before it is saved into the campaign.
- **Campaign Entity**: The saved campaign record created from an approved draft, with title, type, text content, lore or details, labels, and optional relationships.
- **Active Campaign**: The currently opened campaign workspace where approved generator drafts are saved.
- **Campaign Theme**: The active thematic setting used to suggest generator defaults.
- **Source Entity**: An existing campaign entity that can provide optional context when launching a generator.
- **Relationship**: An optional connection from a source entity to a generated entity.
- **Label**: User-facing metadata used to categorize generated and saved entities.
- **Public Generator Surface**: An existing public-facing generator page that remains available for discovery while delegating shared generator logic to the package.
- **Generator Engine Package**: The workspace package that owns shared generator contracts, defaults, output mapping, non-AI generation, and package-safe AI policy boundaries.
- **Contextual Generator Entry Point**: An existing campaign UI action, such as Generate Related in the entity sidebar or Zen Mode, that opens the unified generator workflow with a source entity.
- **Legacy Related Workflow**: The current standalone related-entity generation modal that is replaced or wrapped by the unified workflow during migration.
- **Vault Context Packet**: A bounded, explicit summary of active campaign context prepared by the web app before generator execution. It can include theme, category/template information, selected source entity excerpts, capped neighbor excerpts, existing-title hints, and label suggestions.
- **Entity Template**: A markdown outline used to structure entity lore/content. Templates can come from system defaults or vault-level custom files.
- **Template-Applied Draft**: A generated draft whose lore/detail text follows the resolved entity template while remaining editable before save.

### Assumptions

- The initial release is limited to NPC, Faction, Settlement, and Magic Item generators.
- Draft generation and draft review happen before any campaign data is changed.
- Non-AI generation is available for every initial generator type.
- AI-backed generation is optional and follows existing user permissions and privacy controls.
- Public generator pages remain available for discovery, while the in-app workflow is optimized for campaign creation.
- Public generator pages transition behind their existing routes to package-backed logic instead of keeping a separate generator implementation.
- The existing Generate Related button placement remains the preferred contextual entry point for entity-scoped generation.
- Vault context is built by the campaign app layer from existing stores and passed to generator package functions as plain data.
- Source and neighbor text excerpts are capped to avoid sending full campaign contents by default.
- Template outlines are resolved by the campaign app layer using the same template service as manual entity creation.
- Template application is enabled by default for campaign saves and can be disabled for a draft.
- Existing campaign duplicate-name and entity-type rules continue to apply unless later planning identifies a required change.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A Game Master can generate, review, and save one supported entity into an active campaign in under 2 minutes during usability testing.
- **SC-002**: 100% of initial generator types produce a reviewable draft when AI features are disabled.
- **SC-003**: 100% of saved generator drafts are created only after an explicit user save action from the review step.
- **SC-004**: 95% of users in a guided test can identify whether generated content will be saved before they click save.
- **SC-005**: 100% of blocked save attempts in guest, read-only, or unavailable campaign states leave campaign data unchanged and show a user-readable explanation.
- **SC-006**: Theme-derived defaults are visible and editable before generation for every generator that supports theme-based defaults.
- **SC-007**: Existing public generator pages and existing context-aware related-entity generation continue to complete their primary flows after the feature is introduced.
- **SC-008**: 100% of public NPC, Faction, Settlement, and Magic Item generator flows call shared `packages/generator-engine` logic for supported non-AI generation and output mapping.
- **SC-009**: 100% of existing Generate Related entry points open the unified generator workflow with source entity context and no longer require a separate related-entity modal to complete the primary contextual generation flow.
- **SC-010**: 100% of AI-backed contextual generation attempts show the included context categories before generation and exclude full vault contents by default.
- **SC-011**: 100% of generated campaign drafts for templated entity types preserve the resolved template headings or clearly show template application was disabled before save.
