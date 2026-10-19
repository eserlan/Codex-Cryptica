# Implementation Plan: ToV-Aware Encounter Assistance and Verified Doom Mechanics

**Branch**: `feat/3949-tov-encounter-guidance` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from [`specs/3949-tov-encounter-guidance/spec.md`](./spec.md)

---

## Summary

Extend Codex Cryptica's Encounter Generator with optional Tales of the Valiant (BFRD) challenge guidance without compromising system neutrality or converting the tool into a rigid 5e combat calculator. When ToV mode is active, the generator accepts party composition (party size and level) to provide qualitative challenge pacing, recommended CR distributions, creature participant suggestions, tactical advice, and optional encounter-level BFRD Doom guidance (labelling any custom creature-specific Doom abilities or alternate Doom economies as homebrew). Additionally, implement an optional Doom counter on `builtin-tov-monster` stat sheets and VTT token controls as a per-creature UI tracker for points allocated from the encounter's Doom pool.

---

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14  
**Primary Dependencies**: `packages/schema`, `packages/generator-engine`, `packages/stat-sheet-engine`, `@codex/vault-engine`, Tailwind 4 semantic tokens, Iconify utility classes  
**Storage**: Browser-local IndexedDB and OPFS via existing `Entity` model (`Entity.statSheet`, `Entity.systemId`, note markdown `lore`). Zero new database stores or schema migrations.  
**Testing**: Vitest (`bun run test:changed`)  
**Target Platform**: Browser (desktop & mobile)  
**Project Type**: Monorepo packages (`generator-engine`, `stat-sheet-engine`) + SvelteKit web client (`apps/web`)  
**Performance Goals**: <5ms client transformation and template mapping time; zero frame drops during streaming generation  
**Constraints**: 100% backward compatibility for System Neutral mode; strict adherence to CC BY 4.0 BFRD licensing baseline; no duplicate generator forks; BFRD Doom described as an optional encounter-level GM pool with published spends, while the UI counter on ToV monster sheets/tokens tracks per-creature allocations from that pool.  
**Scale/Scope**: 1 generator extended (`encounter`), 2 internal engine packages extended, 1 new Svelte 5 control (`TovDoomControl.svelte`) + VTT token integration.

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Core Principles

- [x] **I. Library-First**: All core mechanics parsing, prompt composition, and Doom adjustment logic reside in `packages/generator-engine` and `packages/stat-sheet-engine`. The Svelte UI in `apps/web` is a thin consumer.
- [x] **II. Test-Driven Development (TDD)**: Every new mapper, option definition, and validator is accompanied by comprehensive success, negative, and edge-case unit tests.
- [x] **III. Simplicity & YAGNI**: Reuses existing `GeneratorOptionDefinition`, `visibleWhen`, `systemProfileStore`, and `builtin-tov-monster` templates instead of inventing new frameworks or universal Doom engines.
- [x] **IV. AI-First Extraction**: Clean JSON output schema with strict Zod validation for LLM responses.
- [x] **V. Privacy & Client-Side Processing**: All generation and mapping executes directly in client memory; entities persist to local OPFS/IndexedDB.
- [x] **VI. Clean Implementation**: Adheres to Svelte 5 Runes, Tailwind 4 tokens, Iconify classes, and impacted-only verification (`bun run lint:changed`, `bun run test:changed`).
- [x] **VIII. Dependency Injection**: Services use constructor DI with default singletons.

### Discovery Intent Check

- **N/A**: No new public discovery routes (`/for`, `/answers`, `/examples`, etc.) are created. Existing encounter generator receives additive optional parameters.

### Bounded Responsibility Check

- [x] Files touched:
  - `packages/generator-engine/src/tov-mechanics-schema.ts`: Additive schema for `TovEncounterMechanics`.
  - `packages/generator-engine/src/tov-mechanics-prompt.ts`: Additive prompt builder for `encounter`.
  - `packages/generator-engine/src/public-encounter.ts`: Accepts `gameSystem`, `partySize`, `partyLevel` options.
  - `packages/generator-engine/src/campaign-generator-registry.ts`: Register options and link prompt builder.
  - `packages/stat-sheet-engine/src/rules-sources/tov-doom.ts`: Dedicated pure helper for Doom fields and adjustments.
  - `apps/web/src/lib/components/generators/GeneratorMechanicsPreview.svelte`: Encounter preview card.
  - `apps/web/src/lib/components/seo/generator-save.ts`: Markdown formatting for encounter mechanics.
  - `apps/web/src/lib/components/stats/TovDoomControl.svelte`: Svelte 5 UI control for Doom counters.
  - `apps/web/src/lib/components/vtt/TokenQuickStats.svelte`: Render Doom control when token has Doom field.

### User Help Check

- [x] Ensure in-app help and inline reference copy clarify that ToV encounter guidance is qualitative, that the BFRD optional Doom rule is an encounter-level GM resource pool with published spends, and that the per-creature Doom counter on monster sheets/tokens tracks allocations from that encounter pool.

---

## Project Structure

### Documentation (this feature)

```text
specs/3949-tov-encounter-guidance/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Architectural decisions & research findings
├── data-model.md        # Entities, schemas & field transformation mappings
├── quickstart.md        # Step-by-step developer & verification guide
├── contracts/           # Prompt contract
│   └── tov-encounter-prompt.contract.md
└── tasks.md             # Implementation tasks
```

### Source Code Layout

```text
packages/
├── generator-engine/
│   └── src/
│       ├── tov-mechanics-schema.ts         # Add TovEncounterMechanicsSchema
│       ├── tov-mechanics-prompt.ts         # Add buildTovEncounterPromptInstructions
│       ├── public-encounter.ts             # Extend EncounterGeneratorOptions
│       └── campaign-generator-registry.ts  # Add gameSystem, partySize, partyLevel options to encounter
└── stat-sheet-engine/
    └── src/
        ├── rules-sources/
        │   ├── tov-doom.ts                 # isTovDoomField, adjustTovDoom, TOV_DOOM_REFERENCE
        │   └── index.ts
        └── index.ts

apps/web/
└── src/
    └── lib/
        ├── components/
        │   ├── generators/
        │   │   └── GeneratorMechanicsPreview.svelte  # Render TovEncounterMechanics card
        │   ├── stats/
        │   │   ├── TovDoomControl.svelte             # Svelte 5 Doom counter UI
        │   │   └── StatSheetView.svelte              # Integrate TovDoomControl
        │   ├── vtt/
        │   │   └── TokenQuickStats.svelte            # Integrate TovDoomControl for tokens
        │   └── seo/
        │       └── generator-save.ts                 # Format encounter mechanics markdown on save
```
