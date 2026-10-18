# Architectural Research: ToV Encounter Guidance & Verified Doom Tracking

**Feature**: ToV-Aware Encounter Assistance and Verified Doom Mechanics  
**Issue**: [#3949](https://github.com/eserlan/Codex-Cryptica-2/issues/3949)  
**Date**: 2026-10-15

---

## 1. Context & Background

The Codex Cryptica Encounter Generator (#2441) generates narrative, playable encounter situations (combat, social, exploration, environmental, or mixed) rather than mere monster lists. It includes player-facing descriptions ("What the Players See"), At-a-Glance summaries, and GM-only details (Situation & Stakes, Participants, Environment, Possible Approaches, Complications, and Outcomes).

Under #3948, Codex Cryptica introduced Tales of the Valiant (BFRD) mechanics support into the NPC, Creature, and Magic Item generators via `packages/generator-engine` (Zod schemas, prompt injection, parser) and `packages/stat-sheet-engine` (stat sheet mapping to `builtin-tov-npc`, `builtin-tov-character`, `builtin-tov-monster`).

Issue #3949 addresses two complementary goals:

1. Provide qualitative GM-facing challenge guidance and participant recommendations for Tales of the Valiant based on party composition (party size, average level), without turning the generator into a rigid 5e-only combat encounter builder or compromising system neutrality when ToV is disabled.
2. Implement an optional, verified Doom resource tracker strictly scoped to creatures and abilities that support it (per official BFRD rules), avoiding universal GM-wide pool assumptions.

---

## 2. Research Findings: Black Flag / ToV Encounter & Doom Mechanics

### A. Encounter Balance in BFRD

- Traditional D&D 5e uses an XP-budget algorithm with encounter multipliers that often break down with group sizes and does not exist in open BFRD.
- Tales of the Valiant / Black Flag Roleplaying provides **qualitative challenge tiers** (Trivial, Moderate, Dangerous, Deadly) relative to party size and level, focusing on action economy and Challenge Rating (CR) distribution (e.g. single apex boss vs squad of minions/mobs).
- BFRD distinguishes between what is source-backed versus GM homebrew.
- **Architectural Decision**: Do not write proprietary mathematical formulas or XP calculators. Instead:
  - Formulate structured LLM guidance in `tov-encounter-prompt.ts` requiring the model to assess qualitative difficulty against party size (1–8) and level (1–20).
  - Produce a structured `TovEncounterMechanics` schema containing `qualitativeDifficulty`, `recommendedCrRange`, `suggestedCreatures`, `tacticalAdvice`, `doomNotes`, and `isHomebrew`.

### B. Doom Mechanics in BFRD

- In BFRD, Doom is **not** a universal GM resource pool or a campaign-wide currency.
- Doom points are an adversary mechanic: certain powerful boss creatures and monsters possess Doom points (tracked on their stat block, typically 0–10) which can be accumulated or spent to trigger specific villainous actions, legendary actions, or lair hazards.
- In `packages/stat-sheet-engine`, `TOV_MONSTER_TEMPLATE` already defines:
  `{ id: "doom", label: "Doom Points", type: "counter", min: 0, max: 10 }`.
- **Architectural Decision**:
  - Implement a dedicated `isTovDoomField(templateId, field)` predicate in `packages/stat-sheet-engine/src/rules-sources/tov-doom.ts` matching `builtin-tov-monster` (or custom ToV templates) where `field.id === "doom" && field.type === "counter"`.
  - Provide pure, reversible adjustment logic `adjustTovDoom(current, delta, max)` mirroring `adjustTovLuck`.
  - Create a reusable Svelte 5 component `TovDoomControl.svelte` and integrate it into `TokenQuickStats.svelte` and `StatSheetView.svelte`.
  - Only tokens with a stat sheet featuring `doom` > 0 or Doom actions will show this tracker. Neutral creatures and encounters without Doom creatures display no Doom UI.

---

## 3. Schema & Data Flow Decisions

### A. Generator Options

In `packages/generator-engine`:

- Add `gameSystem?: string` ("system-neutral" | "tales-of-the-valiant").
- Add `partySize?: number` (default: 4, range: 1–8).
- Add `partyLevel?: number` (default: 3, range: 1–20).
- Make `partySize` and `partyLevel` conditionally visible in the UI when `gameSystem === "tales-of-the-valiant"`.

### B. Generator Output & Mechanics Bundle

- Extend `GeneratorMechanicsBundleSchema` in `packages/generator-engine/src/tov-mechanics-schema.ts` with a new variant:
  ```ts
  z.object({
    systemId: z.literal(TOV_SYSTEM_ID),
    kind: z.literal("tov-encounter"),
    isHomebrew: z.boolean().default(false),
    homebrewNotice: z.string().optional(),
    data: TovEncounterMechanicsSchema,
  });
  ```
- `TovEncounterMechanicsSchema` defines:
  - `qualitativeDifficulty`: string ("Trivial" | "Moderate" | "Dangerous" | "Deadly" with explanation).
  - `recommendedCrRange`: string (e.g. "CR 1–3 minions with a CR 5 leader").
  - `suggestedCreatures`: array of objects `{ name: string, cr: string, count: number, role: string, templateId?: string, isHomebrew?: boolean }`.
  - `tacticalAdvice`: string or array of strings.
  - `doomNotes`?: optional string explaining Doom usage if any high-threat participants utilize Doom points.
  - `isHomebrew`: boolean.

### C. Draft Review & Markdown Persistence

- When saving an encounter to the vault:
  - The player-facing content and GM lore remain pure Markdown.
  - Under GM lore, format a clean `### Game Mechanics & Challenge Guidance (Tales of the Valiant)` section containing the difficulty, CR range, creature suggestions, tactical notes, and Doom guidance.
  - Attach `metadata.tovMechanics` for downstream tools (such as VTT token instantiation).
- In `GeneratorDraftReview.svelte` and `GeneratorOutputCard.svelte`, `GeneratorMechanicsPreview.svelte` renders the encounter mechanics preview card.

---

## 4. VTT Combat & Token Integration

- Combat tokens linked to vault entities with a `builtin-tov-monster` stat sheet (or any ToV sheet with a `doom` counter field) will automatically surface the `TovDoomControl` in `TokenQuickStats.svelte` and `TokenDetail.svelte`.
- When incrementing or decrementing Doom points, the value updates reactively in `entity.statSheet.fields` using `vault.updateEntity`, which propagates across VTT sessions and map snapshots without requiring any separate database tables.
