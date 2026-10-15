# Implementation Plan: Optional Tales of the Valiant Mechanics in NPC, Creature, and Item Generators

**Branch**: `feat/3948-tov-generator-mechanics` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from [`specs/3948-tov-generator-mechanics/spec.md`](./spec.md)

---

## Summary

Integrate optional Tales of the Valiant (BFRD) mechanics into Codex Cryptica's NPC, Creature/Monster, and Magic Item generators without creating separate generator forks. The system defaults to System Neutral across all public and campaign surfaces. When ToV is chosen (or inherited from a vault's system profile via `#3943`), the generator produces structured BFRD game mechanics alongside standard narrative lore. On save, NPCs and creatures automatically bind their corresponding native ToV stat sheet (`builtin-tov-npc`, `builtin-tov-character`, or `builtin-tov-monster` from `#3944`) with click-to-roll formulas, while magic items format their mechanics into structured Markdown and metadata.

---

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14  
**Primary Dependencies**: `packages/schema`, `packages/generator-engine`, `packages/stat-sheet-engine`, `@codex/vault-engine`, Tailwind 4 semantic tokens, Iconify utility classes  
**Storage**: Browser-local IndexedDB and OPFS via existing `Entity` model (`Entity.statSheet` and `Entity.systemId`). Zero database schema alterations or migrations required.  
**Testing**: Vitest (`bun run test:changed`)  
**Target Platform**: Browser (desktop & mobile)  
**Project Type**: Monorepo packages (`generator-engine`, `stat-sheet-engine`) + SvelteKit web client (`apps/web`)  
**Performance Goals**: <5ms client transformation and template mapping time; zero frame drops during streaming generation  
**Constraints**: 100% backward compatibility for System Neutral mode; strict adherence to CC BY 4.0 BFRD licensing baseline; no duplicate generator forks  
**Scale/Scope**: 3 core generators (`npc`, `creature`, `magic-item`), 2 internal engine packages extended

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Core Principles

- [x] **I. Library-First**: All core mechanics parsing, prompt composition, and stat-sheet mapping logic reside in `packages/generator-engine` and `packages/stat-sheet-engine`. The Svelte UI in `apps/web` is a thin consumer.
- [x] **II. Test-Driven Development (TDD)**: Every new mapper, option definition, and validator is accompanied by comprehensive success, negative, and edge-case unit tests.
- [x] **III. Simplicity & YAGNI**: Reuses existing `GeneratorOptionDefinition`, `visibleWhen`, `systemProfileStore`, and `builtin-tov-*` templates instead of inventing new frameworks.
- [x] **IV. AI-First Extraction**: Clean JSON output schema with strict Zod validation for LLM responses.
- [x] **V. Privacy & Client-Side Processing**: All generation and mapping executes directly in client memory; entities persist to local OPFS/IndexedDB.
- [x] **VI. Clean Implementation**: Adheres to Svelte 5 Runes, Tailwind 4 tokens, Iconify classes, and impacted-only verification (`bun run lint:changed`, `bun run test:changed`).
- [x] **VIII. Dependency Injection**: Services use constructor DI with default singletons.

### Discovery Intent Check

- **N/A**: No new public discovery routes (`/for`, `/answers`, `/examples`, etc.) are created. Existing generator routes (`/generators/npc`, `/generators/creature`, `/generators/magic-item`) receive an additive dropdown selector.

### Bounded Responsibility Check

- [x] Files touched:
  - `packages/generator-engine/src/campaign-generator-registry.ts`: Options and prompt builders extended modularly using helper functions.
  - `packages/generator-engine/src/campaign-generator-types.ts`: Additive types for mechanics.
  - `packages/stat-sheet-engine/src/stat-block/mapper.ts` or new `tov-generator-mapper.ts`: Extracted into a dedicated mapping module.
  - `apps/web/src/lib/components/generators/GeneratorConfigForm.svelte` & `CampaignGeneratorModal.svelte`: Reactive props and defaults.

### User Help Check

- [x] Update `apps/web/src/lib/content/help/` with a guide on generating Tales of the Valiant NPCs, monsters, and magic items.

---

## Project Structure

### Documentation (this feature)

```text
specs/3948-tov-generator-mechanics/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Architectural decisions & research findings
├── data-model.md        # Entities, schemas & field transformation mappings
├── quickstart.md        # Step-by-step developer & verification guide
├── contracts/           # Prompt contract
│   └── tov-generator-prompt.contract.md
├── checklists/
│   └── requirements.md  # Spec quality validation checklist
└── tasks.md             # Implementation tasks
```

### Source Code Layout

```text
packages/
├── generator-engine/
│   └── src/
│       ├── campaign-generator-types.ts          # Add mechanics to GeneratorOutput & GeneratedDraft
│       ├── campaign-generator-registry.ts       # Register gameSystem & npcDetail options
│       ├── tov-mechanics-prompt.ts              # ToV prompt instruction builder
│       └── tov-mechanics-parser.ts              # Parse & validate mechanics JSON block
└── stat-sheet-engine/
    └── src/
        ├── rules-sources/
        │   └── tov-generator-mapping.ts         # Map ToV mechanics to native StatSheetData
        └── index.ts

apps/web/
└── src/
    ├── lib/
    │   ├── components/
    │   │   ├── generators/
    │   │   │   ├── GeneratorConfigForm.svelte   # Inherit vault system profile as default
    │   │   │   └── GeneratorDraftReview.svelte  # Display mechanics preview & homebrew badges
    │   │   └── seo/
    │   │       └── GeneratorOutputCard.svelte   # Render ToV mechanics on public SEO cards
    │   └── content/
    │       └── help/
    │           └── tales-of-the-valiant-generators.md # Help article
```

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because                              |
| :-------- | :--------- | :---------------------------------------------------------------- |
| None      | N/A        | Fully conforms to all constitution principles without exceptions. |
