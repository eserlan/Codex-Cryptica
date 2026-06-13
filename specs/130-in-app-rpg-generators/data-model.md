# Data Model: In-App RPG Generators

## CampaignGeneratorDefinition

Represents one supported generator exposed inside the campaign app.

Fields:

- `id`: stable generator id (`npc`, `faction`, `settlement`, `magic-item`)
- `label`: user-facing generator name
- `description`: short plain-language description
- `entityType`: default campaign entity type produced by the generator
- `icon`: Iconify utility class
- `options`: list of option definitions used by the configuration form
- `defaults`: default option values before theme mapping
- `generate`: function that produces a generator output from resolved options
- `mapOutputToDraft`: function that maps generator output into a reviewable draft

Validation rules:

- `id` must be unique.
- `entityType` must match an available campaign entity category or have a safe fallback.
- `options` must have visible labels and deterministic default values.
- `mapOutputToDraft` must preserve generated labels as labels.

Relationships:

- Produces `GeneratedDraft`.
- Uses zero or one `ThemeDefaultMapping`.
- Can be exposed through one or more `PublicGeneratorSurface` adapters.

## GeneratorOptionDefinition

Represents a user-configurable field for a generator.

Fields:

- `id`: stable option key
- `label`: visible label
- `description`: optional help text
- `control`: radio, select, checkbox, text, textarea, or number
- `choices`: allowed choices for radio/select controls
- `required`: whether the option must be provided
- `defaultValue`: default value before user edits

Validation rules:

- Required fields must be validated before generation.
- Radio controls are preferred for small exclusive choice sets.
- Select controls are reserved for longer exclusive choice sets.
- Hidden defaults are not allowed; users must be able to inspect and override derived defaults.

## GeneratorRunRequest

Represents a request to generate a draft.

Fields:

- `generatorId`: selected generator id
- `options`: resolved option values
- `useAI`: whether AI-backed generation is requested and allowed
- `themeId`: active campaign theme id
- `sourceEntityId`: optional entity id when launched contextually
- `relationshipLabel`: optional relationship label for source-linked saves

Validation rules:

- `generatorId` must refer to a supported generator.
- `options` must satisfy the selected generator's option definitions.
- `useAI` must be false when AI is disabled or unavailable.
- `sourceEntityId` must refer to an existing entity when provided.

## GeneratedDraft

Represents temporary generated content before save.

Fields:

- `title`: proposed entity title
- `entityType`: proposed entity type/category
- `summary`: short main text or chronicle content
- `lore`: detailed body text
- `labels`: metadata labels
- `sourceGeneratorId`: generator id that produced the draft
- `sourceEntityId`: optional source entity id
- `relationshipLabel`: optional relationship label

Validation rules:

- `title` is required before save.
- `entityType` is required before save.
- `labels` are stored as labels, never tags.
- Draft remains transient until explicit save.

State transitions:

```text
empty -> configuring -> generating -> reviewing -> saving -> saved
                              |          |          |
                              v          v          v
                            error     cancelled   save-error
```

## DraftSaveRequest

Represents the user's explicit decision to save a reviewed draft.

Fields:

- `draft`: reviewed `GeneratedDraft`
- `createRelationship`: boolean
- `relationshipLabel`: optional relationship label

Validation rules:

- Active campaign must be writable.
- Guests/read-only sessions cannot save.
- Failed saves must preserve the draft for retry.
- Relationship creation only runs after entity creation succeeds.

## ThemeDefaultMapping

Represents how active campaign theme influences generator defaults.

Fields:

- `themeId`: active campaign theme id
- `generatorId`: supported generator id
- `optionDefaults`: partial option values
- `description`: user-visible explanation when useful

Validation rules:

- Theme defaults are suggestions only.
- Missing theme mappings fall back to neutral defaults.
- User-edited values override theme-derived defaults.

## GeneratorWorkflowState

Represents UI state for the modal flow.

Fields:

- `open`: whether the modal is open
- `sourceEntityId`: optional contextual source
- `stage`: configure, generating, review, saving, error
- `selectedGeneratorId`: current generator id
- `draft`: current generated draft or null
- `error`: current user-readable error or null

Validation rules:

- Closing or cancelling from configure/review must not mutate campaign data.
- Opening without an active campaign shows a clear unavailable state.
- Saving is disabled or blocked when campaign writes are unavailable.

## PublicGeneratorSurface

Represents an existing public-facing generator page that delegates supported generator behavior to the shared package while keeping public routing and SEO behavior in the web app.

Fields:

- `slug`: existing public route slug
- `generatorId`: supported shared generator id when the page maps to NPC, Faction, Settlement, or Magic Item behavior
- `adapter`: package-owned adapter from public page inputs to generator run options
- `preserveRoute`: whether the existing public route must remain stable
- `preserveSeoContent`: whether existing public copy/discovery behavior must remain stable

Validation rules:

- Public route slugs must not change as part of the package transition.
- Public page adapters must use shared `CampaignGeneratorDefinition` contracts for supported generators.
- Public page output mapping must remain behaviorally aligned with the in-app draft mapping for shared fields.
- Public pages must not depend on campaign vault state or campaign-only save behavior.
