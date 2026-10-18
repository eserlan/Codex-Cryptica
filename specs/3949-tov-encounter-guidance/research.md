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
2. Align encounter Doom guidance with the verified optional BFRD encounter-level Doom pool and published spends, and provide an interactive Doom counter on `builtin-tov-monster` stat sheets and VTT token controls to track per-creature allocations from that encounter pool without implying that the UI storage model changes the BFRD rule.

---

## 2. Research Findings: Black Flag / ToV Encounter & Doom Mechanics

### A. Encounter Balance in BFRD

- Traditional D&D 5e uses an XP-budget algorithm with encounter multipliers that often break down with group sizes and does not exist in open BFRD.
- Tales of the Valiant / Black Flag Roleplaying provides **qualitative challenge tiers** (Trivial, Moderate, Dangerous, Deadly) relative to party size and level, focusing on action economy and Challenge Rating (CR) distribution (e.g. single apex boss vs squad of minions/mobs).
- BFRD distinguishes between what is source-backed versus GM homebrew.
- **Architectural Decision**: Do not write proprietary mathematical formulas or XP calculators. Instead:
  - Formulate structured LLM guidance in `tov-mechanics-prompt.ts` requiring the model to assess qualitative difficulty against party size (1–8) and level (1–20).
  - Produce a structured `TovEncounterMechanics` schema containing `qualitativeDifficulty`, `recommendedCrRange`, `suggestedCreatures`, `tacticalAdvice`, `doomNotes`, and `isHomebrew`.

### B. Doom Mechanics in BFRD & Per-Creature UI Allocation Decision

- In the verified BFRD, the **optional Doom rule** gives the GM a CR-based resource pool at the start of an encounter that can affect creatures in that encounter. It is an encounter-level GM resource, not a campaign-wide currency and not a creature-only pool.
- Published BFRD Doom spends are strictly:
  1. Give a creature advantage on an attack.
  2. Give a PC disadvantage on a save.
  3. Once per encounter: refresh, recharge, or gain one additional use of a limited-use feature.
- Any added creature-specific Doom abilities (such as spending Doom to summon minions, extinguish light as a reaction, or trigger bespoke lair hazards) or alternate Doom economies are **homebrew** and must be explicitly labelled as `[Homebrew]` with `isHomebrew: true`.
- In `packages/stat-sheet-engine`, `TOV_MONSTER_TEMPLATE` defines `{ id: "doom", label: "Doom Points", type: "counter", min: 0, max: 10 }`.
- **Architectural Decision (Per-Creature UI Counter vs. Encounter Pool)**:
  - Keep the `doom` counter field on `builtin-tov-monster` and expose `TovDoomControl.svelte` in `StatSheetView.svelte` and `TokenQuickStats.svelte` as a **per-creature allocation tracker**: GMs use a creature's Doom counter to track the portion of the encounter's Doom pool allocated to or spent through that creature during combat.
  - Storing `doom` on `entity.statSheet.fields` is a local UI/storage convenience so token quick stats and monster sheets stay synchronized without introducing a separate encounter-state database store; it does **not** imply that the BFRD Doom rule is creature-only.
  - `TOV_DOOM_REFERENCE` (`summary`, `note`, and `allocationGuidance`) is rendered directly inside `TovDoomControl.svelte` (`How Doom Points work`) to state the encounter-level BFRD rule, list the published spends, and explain that the per-creature counter tracks allocations from the encounter pool.
  - `isPublishedBfrdDoomGuidance` in `packages/generator-engine/src/tov-mechanics-parser.ts` inspects generated `doomNotes` so valid published encounter-pool guidance stays standard (`isHomebrew: false`), while any custom creature-specific Doom abilities or creature-only claims are automatically flagged and labelled `[Homebrew]`.

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
  - `doomNotes`?: optional string explaining how to use the optional encounter-level BFRD Doom pool and its published spends (or `[Homebrew]`-labelled custom Doom variants).
  - `isHomebrew`: boolean.

### C. Draft Review & Markdown Persistence

- When saving an encounter to the vault:
  - The player-facing content and GM lore remain pure Markdown.
  - Under GM lore, format a clean `### Game Mechanics & Challenge Guidance (Tales of the Valiant)` section containing the difficulty, CR range, creature suggestions, tactical notes, and Doom guidance (appending `*(Homebrew)*` if the Doom guidance uses custom/non-published rules).
  - Attach `metadata.tovMechanics` for downstream tools (such as VTT token instantiation).
- In `GeneratorDraftReview.svelte` and `GeneratorOutputCard.svelte`, `GeneratorMechanicsPreview.svelte` renders the encounter mechanics preview card under `Encounter Doom Guidance (Optional BFRD Rule)`.

---

## 4. VTT Combat & Token Integration

- Combat tokens linked to vault entities with a `builtin-tov-monster` stat sheet surface `TovDoomControl` in `TokenQuickStats.svelte` and `StatSheetView.svelte` to track Doom points allocated from the encounter pool to that creature.
- When incrementing or decrementing Doom points, the value updates reactively in `entity.statSheet.fields` using `vault.updateEntity`, which propagates across VTT sessions and map snapshots without requiring any separate database tables.
