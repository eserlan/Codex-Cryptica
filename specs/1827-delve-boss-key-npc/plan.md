# Implementation Plan: Contextual Dungeon Boss & Key NPC Follow-up Action

**Branch**: `feat/1827-delve-boss-key-npc` | **Date**: 2026-08-26 | **Spec**: [Issue #1827](https://github.com/eserlan/Codex-Cryptica/issues/1827)

## Summary

Implement a contextual **"Generate Boss / Key NPC"** follow-up action for the Dungeon / Delve Generator by extending the existing **NPC generation pipeline** (`packages/generator-engine/src/public-npc.ts`) rather than creating a disconnected standalone generator.

When a user generates or views a Dungeon/Delve, they can trigger a 1-click action to generate an NPC tightly anchored to that specific site. The NPC generator ingests the parent delve's lore (conflict, inhabitants, central secret, and key sectors) to produce a Character entity equipped with lair context, alert responses, inhabitant relationships, and automatic graph links back to the delve.

---

## Key Design Principles

1. **Reuse Existing NPC Pipeline**: Build directly on `public-npc.ts` and the `character` entity model (per Constitution Principle III: Simplicity & YAGNI, and Issue #1827 non-goals).
2. **Context-Aware Lair Enrichment**: When delve context is present (or a boss/delve role is selected), enrich the NPC prompt and local fallback to generate:
   - **Delve Role & Lair Sector**: Which sector they occupy (e.g. Sanctum, Sub-level 3) and their function (Mastermind, Bound Guardian, Outlaw Chief, Captive VIP, Cursed Caretaker).
   - **Inhabitant Relationship**: How they command, terrorize, exploit, or hide from the other delve factions.
   - **Tie to Central Secret**: How they guard, seek, or are corrupted by the delve's underlying mystery.
   - **Alert & Escalation**: A 3-stage response describing how they react as intruders progress through outer sectors (Unaware → Alerted → Lair Defense / Confrontation).
   - **Leverage & Negotiation**: Exploitable weaknesses, terms they might accept, or consequences if defeated/rescued.
3. **Seamless Handoff in UI**:
   - Add a `Generate Boss / Key NPC` follow-up button in `GeneratorDraftReview.svelte` when reviewing a `dungeon` draft (matching the `Generate Plot Twist` pattern on quest hooks).
   - Automatically configure `CampaignGeneratorModal.svelte` to pass the delve's context, default to the parent delve's theme, and pre-check "Link to source entity".

---

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (Runes), Bun 1.3.14  
**Primary Dependencies**: `packages/generator-engine`, `@codex/events`, `schema`, `zod`  
**Storage**: OPFS (Vault notes) & IndexedDB (via vault stores)  
**Testing**: Vitest (`bun run test`)  
**Target Platform**: Browser / SvelteKit Web Application  
**Project Type**: Workspace package (`packages/generator-engine`) + Web UI (`apps/web`)  
**Performance Goals**: < 10ms for offline local random generation; instant modal handoff  
**Constraints**: Zero client-side latency offline; strict Svelte 5 Runes; system-neutral (no combat stat blocks).

---

## Constitution Check

- **I. Library-First**: All prompt builders, contextual delve injection, and schema parsers reside in `packages/generator-engine`. UI in `apps/web` is a thin client layer. (PASS)
- **II. TDD**: Tests will verify prompt construction with delve context, offline local generation with delve roles, response parsing, and UI button handoff. (PASS)
- **III. Simplicity & YAGNI**: No new generator subsystem or separate schema; enriches the existing NPC generator with delve context. (PASS)
- **IV. AI-First Extraction**: Structured delve fields are injected into the prompt and parsed into standard Character markdown. (PASS)
- **V. Privacy & Client-Side Processing**: Offline fallback uses local archetype and delve-role tables without remote calls. (PASS)
- **VI. Clean Implementation**: Svelte 5 Runes, Tailwind 4 semantic tokens, zero unused vars. (PASS)
- **VII. User Documentation**: Updates help content in `apps/web/src/lib/config/help-content.ts`. (PASS)
- **VIII. Dependency Injection**: Integrates via `CampaignGeneratorService` and existing registry mappings. (PASS)
- **IX. Natural Language**: Clear, evocative tabletop RPG terminology. (PASS)
- **X. Quality & Coverage**: Full test coverage in `packages/generator-engine` and `apps/web`. (PASS)

---

## Project Structure

### Documentation

```text
specs/1827-delve-boss-key-npc/
└── plan.md                   # This implementation plan
```

### Source Code Changes

```text
packages/generator-engine/
└── src/
    ├── public-npc.ts             # Extend buildNpcPrompt, parseNpcResponse, generateNpcLocal to support delve context & lair sections
    ├── public-npc-constants.ts   # Add delve-specific roles (Dungeon Mastermind, Bound Guardian, Apex Beast, Outlaw Chief, Captive VIP, Cursed Caretaker)
    ├── public-npc.test.ts        # Unit tests for delve-context NPC generation and parsing
    └── campaign-generator-registry.ts # Ensure delve context propagation and relationship suggestion

apps/web/
└── src/
    └── lib/
        ├── components/
        │   └── generators/
        │       ├── GeneratorDraftReview.svelte   # Add onGenerateBoss action for delve drafts
        │       ├── GeneratorDraftReview.test.ts  # Test boss button rendering and event firing
        │       └── CampaignGeneratorModal.svelte # Wire delve draft -> NPC generator pre-seeded handoff
        └── config/
            └── help-content.ts                   # Update help docs to mention Dungeon Boss / Key NPC generation
```

---

## Implementation Steps

### Phase 1: Engine Enhancement (`packages/generator-engine`)

1. **Extend NPC Constants (`public-npc-constants.ts`)**:
   - Add delve/boss-oriented roles to `npcConfig.roles` (e.g. `Dungeon Mastermind`, `Bound Vault Guardian`, `Lair Boss`, `Outlaw Chief`, `Captive VIP`, `Cursed Caretaker`).
   - Add helper constants for delve alert escalation stages.
2. **Context-Aware Prompt Building (`public-npc.ts`)**:
   - When `options.campaignContext` contains delve metadata (or when a delve role is selected), include instructions for generating:
     - `### Delve Role & Lair Sector`
     - `### Relation to Inhabitants`
     - `### Tie to the Central Secret`
     - `### Alert Response` (3 stages)
     - `### Leverage & Negotiation`
3. **Offline Fallback Enrichment**:
   - Update `generateNpcLocal` to populate lair/delve sections when generated with delve context.
4. **Unit Tests**:
   - Add test cases in `public-npc.test.ts` verifying prompt construction with delve context, parsing of lair sections, and offline local fallback.

### Phase 2: UI Handoff in `apps/web`

1. **Draft Review Action (`GeneratorDraftReview.svelte`)**:
   - Add `onGenerateBoss?: () => void` prop.
   - When reviewing a `dungeon` draft, display a `Generate Boss / Key NPC` button alongside `Open in Editor` (matching `onGeneratePlotTwist`).
2. **Modal Handoff Wiring (`CampaignGeneratorModal.svelte`)**:
   - Implement `handleGenerateBossFromDungeon()`:
     - Formats the current dungeon draft's title, summary, key sectors, inhabitants, and secret into `campaignContext`.
     - Switches the active generator to `npc`.
     - Sets role to `Dungeon Mastermind` or `Random`.
     - Sets target link to the dungeon draft's title so the resulting character is pre-linked.
3. **Unit Tests**:
   - Update `GeneratorDraftReview.test.ts` to assert the `Generate Boss / Key NPC` button appears on dungeon drafts and triggers the handler.

### Phase 3: Documentation & Verification

1. Update `apps/web/src/lib/config/help-content.ts` describing the contextual Boss / Key NPC generator flow.
2. Run `bun run test` across workspace packages to ensure 100% test pass.
3. Run `bun run lint` to verify clean code hygiene.

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| None      | N/A        | N/A                                  |
