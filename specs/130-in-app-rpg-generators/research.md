# Research: In-App RPG Generators

## Decision: Use A Campaign-Facing Registry Over Existing Generator Functions

**Decision**: Add an app-local campaign generator registry that wraps the existing generator engine for NPC, Faction, Settlement, and Magic Item. The registry defines supported generator ids, labels, option metadata, defaults, output mapping, and optional theme default hooks.

**Rationale**: Existing public generator functions already provide local fallback and AI-backed generation paths. A registry gives the campaign app a stable contract without duplicating generator logic or embedding marketing pages.

**Alternatives considered**:

- Embed public generator pages: rejected because it would preserve the external workflow and make direct vault import awkward.
- Immediately extract to `packages/generator-engine`: deferred because the campaign-facing contract should stabilize first. Extraction remains available if Phase 1 introduces substantial reusable logic.

## Decision: Keep Drafts Transient Until Explicit Save

**Decision**: Generated results become transient `GeneratedDraft` values. The draft is saved to the active vault only after the user reviews and explicitly saves it.

**Rationale**: This satisfies the spec's review-before-save requirement and prevents accidental campaign mutations during generation, failure, or cancellation.

**Alternatives considered**:

- Auto-save generated drafts as hidden draft entities: rejected because cancellation and failed review flows would require cleanup and could pollute the vault.
- Use `localStorage` transfer: rejected because the feature explicitly removes external import roundtrips.

## Decision: Save Through Existing Vault APIs

**Decision**: Save approved drafts through `vault.createEntity(...)` and optionally create source relationships through `vault.addConnection(...)`.

**Rationale**: These APIs already own persistence, graph updates, and local vault behavior. Reusing them avoids a parallel storage path.

**Alternatives considered**:

- Add generator-specific persistence: rejected as unnecessary and likely to bypass existing vault invariants.
- Write directly to OPFS/IndexedDB: rejected because stores already encapsulate persistence.

## Decision: Theme Defaults Are Hints, Not Hidden Rules

**Decision**: Theme mapping preselects generator defaults from the active campaign theme, but every derived option remains visible and editable before generation.

**Rationale**: Theme awareness should reduce setup friction without surprising the user or preventing off-theme content.

**Alternatives considered**:

- Hard-code theme choices into prompts only: rejected because users could not inspect or override them.
- Ignore theme mapping for MVP: rejected because the master issue explicitly requires dynamic alignment with active vault theme.

## Decision: AI Is Optional And Must Respect Existing Policy

**Decision**: Each supported generator must work through local generation. AI-backed generation uses existing generator/Oracle configuration and must respect AI-disabled, guest, and unavailable states.

**Rationale**: The constitution prioritizes local-first privacy while still allowing AI transformation where appropriate.

**Alternatives considered**:

- AI-only campaign generation: rejected because it fails privacy/offline requirements.
- Silent AI fallback after local generation: rejected because AI use must be explicit and policy-aware.

## Decision: Native Svelte Modal With Semantic Forms

**Decision**: Build a native Svelte 5 modal flow with semantic `<form>` behavior, visible labels, grouped controls, accessible names/descriptions, clear validation, keyboard navigation, and platform-compatible dismissal.

**Rationale**: Modern web guidance recommends semantic forms, visible labels, native submit buttons, focus management, and modal behavior that respects keyboard and platform close expectations. This also aligns with existing app modal patterns.

**Alternatives considered**:

- Div-based wizard controls: rejected due to accessibility and validation risks.
- A route page instead of a modal: deferred because the workflow is a focused creation task and should stay close to existing campaign context.

## Decision: Add Help Content In The Existing Help System

**Decision**: Add a help article and consider a first-use `FeatureHint` when the workflow ships.

**Rationale**: The constitution requires user documentation for major features, and the flow includes privacy and review-before-save behavior users need to understand.

**Alternatives considered**:

- Rely on labels/tooltips only: rejected because the workflow spans configuration, generation, review, and save.
