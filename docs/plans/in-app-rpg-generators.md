# In-App RPG Generators Plan

**Master issue**: [#1129](https://github.com/eserlan/Codex-Cryptica/issues/1129)  
**Status**: Planning  
**Date**: 2026-06-13

## Goal

Bring the public RPG generators into the Codex Cryptica campaign app as a native creation workflow. Game Masters should be able to configure, generate, review, and save generator drafts directly into the active vault without using the public marketing pages or a `localStorage` transfer.

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

The public generators already expose reusable service logic through `apps/web/src/lib/services/seo/generator-engine.ts` and individual generator modules under `apps/web/src/lib/services/seo/generators/`.

The campaign app already has a context-aware `Generate Related Entity` flow in `apps/web/src/lib/components/entity-detail/RelatedEntityModal.svelte`. That flow creates entities directly through the vault store and can create a directed relationship back to the source entity.

The new work should reuse these capabilities, but separate the concerns:

- Generator definitions and output mapping should be reusable and testable.
- Campaign UI should be native Svelte 5, not marketing-page reuse.
- Vault import should be a direct draft-to-entity operation.
- AI use should respect existing Oracle settings, guest constraints, and AI-disabled policy.

## Architecture Direction

### Generator Registry

Create a campaign-facing registry that describes each supported generator:

- `id`
- display label
- target entity type
- option schema
- default options
- theme option mapping
- generator function
- output-to-entity draft mapper

The registry can start in the web app while the API settles. If the logic grows beyond UI orchestration, extract it into a workspace package such as `packages/generator-engine` to satisfy the constitution's library-first rule.

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
- API keys must not be persisted in generator-specific state.

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
- Avoid changing the public generator page behavior in this phase.

### Phase 4: Contextual Launch And Theme-Aware Defaults

Connect generator defaults to the active vault theme and allow context-aware launching from an existing entity.

Acceptance criteria:

- Active vault/world theme preselects relevant generator defaults.
- Users can override any theme-derived default before generation.
- Launching from an entity can prefill relationship context.
- Saving from an entity-launched flow can create a relationship back to the source entity.
- AI-backed generation receives only explicit, minimal context.
- Tests cover theme mapping and source-entity relationship creation.

Notes:

- This should extend the current `Generate Related Entity` concept without bloating the Oracle facade.
- Any Oracle-related state should live in the correct decomposed manager if needed.

### Phase 5: Documentation, Release Polish, And Public Generator Alignment

Document the in-app workflow and make sure public and in-app generator behavior stay aligned where they share logic.

Acceptance criteria:

- Add or update user-facing help content for in-app generators.
- Add a first-use hint if the interaction is not self-evident.
- Confirm public generator pages still work.
- Confirm in-app generator import does not regress existing `Generate Related Entity` behavior.
- Add a user-facing changelog entry only if the release includes visible in-app functionality.
- Run lint and relevant tests before merge.

Notes:

- Do not include internal refactors in user-facing changelog highlights.
- Keep the public SEO pages optimized for discovery; keep campaign UI optimized for workflow.

## Issue Breakdown

| Phase   | Issue                                                          |
| ------- | -------------------------------------------------------------- |
| Master  | [#1129](https://github.com/eserlan/Codex-Cryptica/issues/1129) |
| Phase 1 | [#1345](https://github.com/eserlan/Codex-Cryptica/issues/1345) |
| Phase 2 | [#1346](https://github.com/eserlan/Codex-Cryptica/issues/1346) |
| Phase 3 | [#1347](https://github.com/eserlan/Codex-Cryptica/issues/1347) |
| Phase 4 | [#1348](https://github.com/eserlan/Codex-Cryptica/issues/1348) |
| Phase 5 | [#1349](https://github.com/eserlan/Codex-Cryptica/issues/1349) |

## Success Criteria

- A GM can generate a campaign-ready NPC, Faction, Settlement, or Magic Item inside the app.
- The generated draft can be reviewed before it touches the vault.
- Saving writes directly to the active vault.
- The workflow works without AI through local fallback generation.
- AI-backed generation respects existing Oracle settings and privacy constraints.
- Theme-aware defaults reduce setup without hiding user control.
