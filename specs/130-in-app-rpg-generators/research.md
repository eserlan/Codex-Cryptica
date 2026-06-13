# Research: In-App RPG Generators

## Decision: Use A Shared Package Registry Over Existing Generator Functions

**Decision**: Add `packages/generator-engine` with a shared generator registry that wraps or extracts the existing generator engine for NPC, Faction, Settlement, and Magic Item. The registry defines supported generator ids, labels, option metadata, defaults, output mapping, public-page adapters, and optional theme default hooks.

**Rationale**: Existing public generator functions already provide local fallback and AI-backed generation paths. A package registry gives the campaign app and public generator pages a stable shared contract without duplicating generator logic or embedding marketing pages in the campaign app.

**Alternatives considered**:

- Embed public generator pages: rejected because it would preserve the external workflow and make direct vault import awkward.
- Keep campaign generator logic app-local: rejected because the constitution requires major features to live in standalone `packages/` workspace packages. The package boundary is required from Phase 1.
- Leave existing public pages on separate logic: rejected because it would create two generator implementations and let public/in-app behavior drift.

## Decision: Transition Public Generator Pages Behind Existing Routes

**Decision**: Existing public NPC, Faction, Settlement, and Magic Item generator pages keep their current routes and public UI but delegate supported generation, defaults, and output mapping to `packages/generator-engine`.

**Rationale**: This preserves SEO/discovery behavior while making the package the source of truth for both public and in-app generator flows.

**Alternatives considered**:

- Replace public pages with campaign app links: rejected because public generator discovery remains valuable and must stay available.
- Duplicate package behavior in `apps/web/src/lib/services/seo/generator-engine.ts`: rejected because duplicated logic would undermine the package transition.

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

## Decision: Build A Bounded Vault Context Packet In The Web App

**Decision**: Build generator context in the web app layer as a plain `GeneratorVaultContext` packet. The packet includes active theme, category/template information, optional source entity excerpt, capped neighbor excerpts, bounded title hints, label suggestions, and a user-visible included-context summary. The generator package consumes only this packet and never imports vault stores.

**Rationale**: Context-aware generation needs campaign relevance, but the privacy principle requires explicit minimal context. A bounded packet makes context inspectable, testable, removable, and safe to pass to AI-backed generation without exposing full vault contents.

**Alternatives considered**:

- Let `packages/generator-engine` read `vault.entities` directly: rejected because it inverts the package boundary and makes privacy review harder.
- Pass full source entities and full neighbor records: rejected because contextual generation only needs excerpts and relationship cues.
- Build prompts directly in Svelte components: rejected because context selection, caps, and privacy rules need service-level tests.

## Decision: Apply Resolved Entity Templates To Campaign Drafts

**Decision**: Resolve the active entity template in the web app layer and pass it as plain markdown in the context packet. Generated campaign drafts apply the template by default, with vault-custom templates taking precedence over system defaults. Users can disable template application or edit the generated sections before save.

**Rationale**: Manual entity creation already uses entity templates, and generated campaign drafts should not bypass the same structure users configured for their vault. Resolving the template in the web app preserves access to vault-local override files while keeping the generator package free of filesystem and store dependencies.

**Alternatives considered**:

- Let generators ignore templates: rejected because generated entities would feel structurally inconsistent with manual entries.
- Let `packages/generator-engine` read vault template files: rejected because package code must not depend on browser file handles or vault stores.
- Require AI to perfectly fill every template section: rejected because non-AI generation and partial outputs need a safe editable fallback for unmatched details.

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
