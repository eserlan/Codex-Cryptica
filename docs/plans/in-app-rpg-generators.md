# In-App RPG Generators Plan

**Master issue**: [#1129](https://github.com/eserlan/Codex-Cryptica/issues/1129)  
**Status**: Planning  
**Date**: 2026-06-13

## Goal

Bring the public RPG generators into the Codex Cryptica campaign app as a native creation workflow and transition the existing public generator pages onto the same shared generator package. Game Masters should be able to configure, generate, review, and save generator drafts directly into the active vault without using the public marketing pages or a `localStorage` transfer.

Initial generator set:

- NPC
- Faction
- Settlement
- Magic Item

## Non-Goals

- Do not embed the public SEO generator pages inside the app.
- Do not require `localStorage` handoff for campaign imports.
- Do not add a server-side persistence path for generated drafts.
- Do not send full vault contents to AI-backed generation by default.
- Do not expose "tags" language; generated metadata remains "labels".

## Current Context

The public generators already expose reusable service logic through `apps/web/src/lib/services/seo/generator-engine.ts` and individual generator modules under `apps/web/src/lib/services/seo/generators/`. This feature should migrate supported shared logic into `packages/generator-engine` and keep the public pages as route/SEO/UI consumers of that package.

The campaign app already has a context-aware `Generate Related Entity` flow in `apps/web/src/lib/components/entity-detail/RelatedEntityModal.svelte`. That flow creates entities directly through the vault store and can create a directed relationship back to the source entity.

The new work should reuse these capabilities, but separate the concerns:

- Generator definitions and output mapping should be reusable and testable.
- Campaign UI should be native Svelte 5, not marketing-page reuse.
- Vault import should be a direct draft-to-entity operation.
- AI use should respect existing Oracle settings, guest constraints, and AI-disabled policy.
- Vault context should be passed as a bounded, inspectable plain-data packet rather than giving generator package code direct access to vault stores.
- Generated campaign drafts should use the same entity template structure as manual entity creation, including vault-level custom template overrides.

## Architecture Direction

### Generator Registry

Create a package-owned registry in `packages/generator-engine` that describes each supported generator:

- `id`
- display label
- target entity type
- option schema
- default options
- theme option mapping
- generator function
- output-to-entity draft mapper
- public-page adapter for supported existing generator pages

The registry and adapters must start in `packages/generator-engine` to satisfy the constitution's library-first rule. The web app should import the package and inject web-specific dependencies instead of owning duplicate generator logic.

### Draft Import

Use a two-step import model:

1. Generate a transient draft.
2. Let the user review/edit the draft before saving.

Saving should call existing vault APIs directly:

- `vault.createEntity(...)`
- optionally `vault.addConnection(...)` when launched from an existing entity

### Theme Awareness

Map the active vault/world theme into generator defaults. The user can override defaults before generation.

Examples:

- Gothic/noir themes bias factions toward secret societies, aristocratic courts, occult motives, and darker naming.
- Cyberpunk themes bias factions toward corporations, syndicates, crews, and synthetic names.
- Classic fantasy themes retain current fantasy defaults.

### Privacy And AI Guardrails

- Local fallback generation must work without AI.
- AI-backed generation must use existing Oracle configuration.
- AI-backed generation must respect guest and AI-disabled states.
- Context sent to AI must be explicit and minimal.
- Context packets must cap source and neighbor excerpts.
- Users should see which context categories are included before AI-backed generation and be able to remove optional source or neighbor context.
- API keys must not be persisted in generator-specific state.

### Vault Context Packet

Build vault context in the web app layer, then pass it to `packages/generator-engine` as plain data. The package must not import campaign stores or read the vault directly.

Packet construction:

1. Include theme and schema context: active theme, selected target type, categories, resolved template outline, template source, and whether template application is enabled.
2. For contextual Generate Related launches, include only the selected source entity excerpt.
3. Gather outbound and inbound neighbors from the source entity.
4. Rank directly connected neighbors by relationship presence, meaningful content, and labels.
5. Keep a capped neighbor set and convert each neighbor to a short excerpt.
6. Add bounded title hints for duplicate avoidance and bounded label suggestions.
7. Show a context summary before AI-backed generation.
8. Let users inspect or disable template application before save.
9. Never include full `vault.entities`, full graph state, full lore corpus, API keys, file handles, or live store references.

### Template Application

Use the same template resolution behavior as manual entity creation:

- Check vault-level custom templates under `.cc/templates/` first.
- Fall back to `.codex/templates/`.
- Fall back to theme-specific system templates.
- Fall back to generic system templates.

Generated campaign drafts apply the resolved template by default. Non-AI generation maps known generated fields into matching headings and preserves unmatched generated details in an editable fallback section. AI-backed generation receives the resolved template outline as a structural requirement when template application is enabled. Public generator pages can keep their public display format; template application happens when a generated result becomes a campaign draft.

## Phases

### Phase 1: Generator Contracts And Campaign Registry

Define the campaign generator contract, registry, option metadata, and output mapping for NPC, Faction, Settlement, and Magic Item.

Acceptance criteria:

- A typed generator registry exists for the initial four generator types.
- Each generator maps to a valid campaign entity type.
- Each generator exposes user-configurable options and sensible defaults.
- Each generator output maps to a transient entity draft with title, type, summary/content, lore, and labels.
- Tests cover a successful mapping path and at least one invalid/unsupported generator path.

Notes:

- Keep the registry UI-agnostic.
- Avoid extracting to a package until the contract proves stable, unless implementation complexity demands it.

### Phase 2: Native In-App Generator Hub

Add a campaign-side entry point for choosing and configuring generators.

Acceptance criteria:

- Users can open a native in-app generator panel or modal from the campaign workspace.
- Users can select NPC, Faction, Settlement, or Magic Item.
- The form renders the selected generator's configurable options.
- The form can generate a draft using local fallback generation when AI is disabled or unavailable.
- Loading, error, cancellation, and empty states use existing app style guide patterns.
- Tests cover successful draft generation and a meaningful failure or cancellation path.

Notes:

- Use Svelte 5 runes.
- Use Tailwind 4 semantic tokens.
- Use Iconify utility classes, not `lucide-svelte`.
- Keep app chrome neutral; use world theme only inside world/content surfaces.

### Phase 3: Direct Vault Import And Review

Convert generated drafts into editable campaign drafts and save them directly into the active vault.

Acceptance criteria:

- Users can review and edit title, entity type, summary/content, lore, and labels before saving.
- Saving creates the entity directly in the active vault.
- Generated labels are imported as labels, not tags.
- Save failures leave the draft intact and show a clear error.
- Guest or read-only states prevent saving with clear user-facing language.
- Tests cover successful save and at least one failed save path.

Notes:

- Do not use `localStorage` as an import bridge.
- Reuse existing vault creation APIs.
- Avoid changing the public generator page behavior in this phase; public-page delegation happens in the dedicated package transition phase.

### Phase 4: Contextual Launch And Theme-Aware Defaults

Connect generator defaults to the active vault theme and allow context-aware launching from an existing entity.

Acceptance criteria:

- Active vault/world theme preselects relevant generator defaults.
- Users can override any theme-derived default before generation.
- Launching from an entity can prefill relationship context.
- Existing Generate Related buttons open the unified generator workflow with source entity context.
- A bounded vault context packet is built from theme/schema/source/neighbor/title/label data.
- The packet includes the resolved entity template outline and template source.
- Generated drafts preserve template headings unless template application is disabled.
- Users can inspect included context categories before AI-backed generation and remove optional source or neighbor context.
- Saving from an entity-launched flow can create a relationship back to the source entity.
- AI-backed generation receives only explicit, minimal context.
- Tests cover theme mapping, context packet caps, context removal, custom template precedence, generated template heading preservation, and source-entity relationship creation.

Notes:

- This should merge the current `Generate Related Entity` concept into the unified generator workflow without bloating the Oracle facade.
- Any Oracle-related state should live in the correct decomposed manager if needed.

### Phase 5: Public Generator Package Transition

Move the supported public generator logic behind `packages/generator-engine` while preserving the existing public routes and SEO/discovery behavior.

Acceptance criteria:

- Existing public NPC, Faction, Settlement, and Magic Item pages delegate supported generator logic to the package.
- Public route slugs and SEO/discovery metadata remain stable.
- Public generator primary flows still generate usable output.
- Package parity tests cover supported public generator adapters.
- Route regression tests prove public pages still complete their primary flows.

Notes:

- Keep the public SEO pages optimized for discovery; keep campaign UI optimized for workflow.
- Do not replace public routes with in-app links.
- Avoid duplicating package behavior in `apps/web/src/lib/services/seo/generator-engine.ts`.

### Phase 6: Documentation, Release Polish, And Alignment

Document the in-app workflow and make sure public and in-app generator behavior stay aligned where they share logic.

Acceptance criteria:

- Add or update user-facing help content for in-app generators.
- Add a first-use hint if the interaction is not self-evident.
- Confirm public generator pages still work after package delegation.
- Confirm existing Generate Related entry points open the unified workflow with source entity context.
- Add a user-facing changelog entry only if the release includes visible in-app functionality.
- Run lint and relevant tests before merge.

Notes:

- Do not include internal refactors in user-facing changelog highlights.
- Keep public generator migration details out of user-facing changelog highlights unless the release changes visible behavior.

## Issue Tracking

Use [#1129](https://github.com/eserlan/Codex-Cryptica/issues/1129) as the single master tracker.

The implementation source of truth is the Speckit feature at `specs/131-in-app-rpg-generators/`.

## Success Criteria

- A GM can generate a campaign-ready NPC, Faction, Settlement, or Magic Item inside the app.
- The generated draft can be reviewed before it touches the vault.
- Saving writes directly to the active vault.
- The workflow works without AI through local fallback generation.
- AI-backed generation respects existing Oracle settings and privacy constraints.
- Theme-aware defaults reduce setup without hiding user control.
- Public NPC, Faction, Settlement, and Magic Item pages use shared package logic while preserving existing public routes and primary flows.
