# Feature Specification: ToV-Aware Encounter Assistance and Verified Doom Mechanics

**Feature Branch**: `feat/3949-tov-encounter-guidance`  
**Created**: 2026-10-15  
**Status**: Draft  
**Input**: User description: "https://github.com/eserlan/Codex-Cryptica/issues/3949 next" (Issue #3949: ToV P1: Add ToV-aware encounter assistance and verified Doom mechanics)

---

## Overview & Goal

Augment the existing system-neutral Encounter Generator and VTT play aids with optional Tales of the Valiant (BFRD) mechanical guidance without turning the generator into a 5e-only combat encounter builder.

The feature preserves today's system-neutral encounter generator behaviour (including non-combat, social, and exploration encounters) while providing qualitative GM-facing combat balance advice, valid BFRD creature participant suggestions with rollable stat blocks, entity/token linkage, and an optional verified Doom resource tracker strictly tied to supported use cases (boss creatures/abilities).

---

## User Scenarios & Testing

### User Story 1 - Encounter Assistance with Party Profile & Qualitative Guidance (Priority: P1) 🎯 MVP

As a Game Master preparing a Tales of the Valiant session,  
I want to provide my party's composition (character count, levels) to the Encounter Generator when in ToV mode,  
So that I receive GM-facing tactical caveats, suggested challenge pacing, and combat expectations without losing the rich narrative, social, and environmental situation of the encounter.

**Why this priority**: Core value of Issue #3949. GMs need context-aware encounter assistance aligned with their party without forcing combat-only encounters or rigid non-open 5e encounter maths.

**Independent Test**: Generate an encounter with `gameSystem: "tales-of-the-valiant"` and party configuration (e.g. 4 characters at Level 3). Verify that the result includes standard narrative sections (Situation & Stakes, Environment, Possible Approaches, Complications) PLUS an explicit `### Game Mechanics & Challenge Guidance (Tales of the Valiant)` section offering qualitative challenge estimates, suggested tactics, and clear provenance without altering neutral generator behaviour.

**Acceptance Scenarios**:

1. **Given** a campaign or generator with `gameSystem: "tales-of-the-valiant"` and a specified party (e.g. 4 characters, Level 3), **When** generating an encounter, **Then** the output contains a distinct `mechanics` block with qualitative difficulty assessment, suggested creature CR ranges, tactical guidance, and caveats, while preserving player-facing text and non-combat approaches.
2. **Given** `gameSystem: "system-neutral"` (default), **When** generating an encounter, **Then** no rules-specific mechanics, levels, or CR references are injected, preserving existing neutral behaviour 100%.
3. **Given** offline mode or AI generation disabled, **When** generating in ToV mode, **Then** standard neutral tables generate the narrative situation with an informational notice stating that mechanical assistance requires AI lore generation.

---

### User Story 2 - BFRD Creature Participant Integration & Token Linkage (Priority: P1)

As a GM reviewing a generated encounter,  
I want suggested encounter adversaries and NPC participants to link to valid ToV creature stat blocks (from existing vault entities or generated BFRD templates),  
So that I can immediately inspect their defences, rollable attacks, and add them directly to my VTT map or combat tracker as interactive tokens.

**Why this priority**: Bridges encounter prep with actual tabletop play, reusing Codex Cryptica's VTT token placement and `builtin-tov-monster`/`builtin-tov-npc` stat sheet capabilities.

**Independent Test**: Generate a combat or mixed encounter with ToV enabled. In the draft review, verify that participants list recommended BFRD creature/NPC profiles with CR, AC, and HP. Save the encounter to the vault and verify that participants can be spawned as VTT combat tokens with functional roll formulas and stat sheets.

**Acceptance Scenarios**:

1. **Given** an encounter generated under ToV mode, **When** reviewing the draft, **Then** combat participants present structured creature suggestions (name, CR, quantity, role, and optional reference to built-in ToV monsters or existing vault creatures).
2. **Given** saving the encounter note to the vault, **When** opening the encounter or dragging participants into VTT mode, **Then** participants can be instantiated as tokens with pre-linked ToV stat blocks.
3. **Given** participant mechanical recommendations, **When** inspecting their details, **Then** source-backed vs homebrew recommendations are clearly tagged.

---

### User Story 3 - Verified Optional Doom Resource Tracker in Encounter & VTT Play (Priority: P2)

As a GM running a high-stakes combat encounter featuring a ToV boss creature with Doom abilities,  
I want an optional, verified Doom resource tracker available in the VTT / encounter aid,  
So that I can track and spend Doom points according to official BFRD rules without imposing a universal GM pool on encounters that do not feature Doom creatures.

**Why this priority**: Issue #3949 explicitly mandates: "Investigate Doom in the verified BFRD and implement an appropriate, optional resource tracker only for supported use cases (creatures/abilities/encounter as specified by the actual rules); do not assume it is a universal GM-wide pool."

**Independent Test**: Load a combat encounter featuring a creature with Doom points (e.g. Doom > 0 in stat sheet). Verify an optional Doom tracker widget appears for that creature in the VTT active combat panel, allowing incrementing/decrementing Doom points (0–10) and displaying its specific Doom actions. For creatures/encounters with no Doom abilities, verify the tracker remains hidden.

**Acceptance Scenarios**:

1. **Given** an active encounter token with a ToV creature stat sheet containing `doom` > 0 or Doom actions, **When** viewing the combat tracker or token inspector, **Then** an interactive Doom Points tracker is displayed with increment/decrement buttons and a list of available Doom-fueled actions.
2. **Given** standard creatures or neutral encounters without Doom abilities, **When** viewing the VTT combat tracker, **Then** no Doom tracker is shown.
3. **Given** a creature spending Doom points during combat, **When** a point is spent, **Then** the value updates reactively and persists within the session snapshot.

---

### User Story 4 - Vault System Profile Inheritance & UI Review Controls (Priority: P2)

As a GM using Codex Cryptica with a campaign vault set to Tales of the Valiant,  
I want the Encounter Generator in the campaign and public generator pages to inherit my vault's rules system,  
So that party inputs and ToV mechanical options are pre-selected while remaining fully editable.

**Why this priority**: Consistency with Constitution principles and the pattern established in #3948 (ToV generator mechanics).

**Independent Test**: Open the Encounter Generator in a vault configured with the ToV system profile; verify `gameSystem: "tales-of-the-valiant"` is pre-selected and party level/size options appear.

**Acceptance Scenarios**:

1. **Given** a vault with `systemProfileStore.vaultSystemId === "tales-of-the-valiant"`, **When** opening the Encounter generator form, **Then** `gameSystem` defaults to `tales-of-the-valiant` and party inputs (Party Size, Average Level) are displayed.
2. **Given** a public generator page or neutral vault, **When** opening the Encounter generator, **Then** `gameSystem` defaults to `system-neutral` and party inputs are hidden until ToV is explicitly selected.
3. **Given** any generated mechanical advice or stats, **When** reviewing the draft, **Then** all mechanical suggestions can be edited prior to saving.

---

## Functional Requirements

- **FR-001**: Extend encounter generator options in `packages/generator-engine` with `gameSystem` (`"system-neutral"` | `"tales-of-the-valiant"`), `partySize` (default 4, range 1–8), and `partyLevel` (default 3, range 1–20).
- **FR-002**: Update `encounterPrompt` in `packages/generator-engine` to inject Black Flag Roleplaying encounter guidance guidelines when ToV is selected:
  - Qualitative encounter challenge rating (Trivial, Moderate, Dangerous, Deadly) relative to the party.
  - Recommended CR distribution for adversary groups (e.g. single boss vs minions/mobs).
  - Explicit instruction not to invent rigid mathematical XP budgets not defined in the open BFRD; provide qualitative GM pacing advice instead.
  - Distinction between source-backed rules and GM homebrew.
- **FR-003**: Extend `GeneratorOutput` and `GeneratedDraft` encounter outputs with optional `encounterMechanics` bundle containing:
  - `systemId`: `"tales-of-the-valiant"`.
  - `qualitativeDifficulty`: string description.
  - `recommendedCr`: string or range.
  - `suggestedCreatures`: list of participant creatures with name, CR, count, role, and optional ToV template id.
  - `tacticalAdvice`: string or bullet points.
  - `doomNotes`: optional Doom usage guidance if high-threat or boss adversaries are present.
- **FR-004**: Format ToV encounter mechanics into note markdown under `### Game Mechanics & Challenge Guidance (Tales of the Valiant)` on save, keeping narrative situation intact.
- **FR-005**: Provide interactive Doom tracking in VTT combat aids scoped strictly to combatants with `doom` points in their stat sheet (`builtin-tov-monster` or custom).
- **FR-006**: Ensure full backwards compatibility for neutral encounters: zero changes to neutral prompt outputs, zero schema migrations.

---

## Non-Functional Requirements

- **Local-First & Offline Resilience**: No remote network calls required for neutral generation; offline mode gracefully falls back to neutral with informational notices when AI is disabled.
- **Library-First Architecture**: Core encounter mechanics parsing, schemas, and prompts live framework-free in `packages/generator-engine`.
- **UI Consistency**: Use Svelte 5 Runes, Tailwind 4 semantic tokens, and Iconify utility icons (`icon-[lucide--...]`).
- **Privacy & Security**: Zero telemetry or remote image leakage; participant references remain strictly local.

---

## Out of Scope

- Inventing proprietary Kobold Press or D&D 5e encounter balance algorithms (such as proprietary budget multipliers or non-BFRD formulas).
- Implementing Doom as a universal or campaign-wide resource pool; Doom is scoped strictly to supported creatures/abilities per official BFRD rules.
- Automated tactical AI battle simulators.
