# Research & Technical Architecture Decisions: Guided Mode & Quick Start Experience

**Feature Branch**: `148-guided-mode-quickstart`  
**Created**: 2026-07-30  
**Spec**: [`spec.md`](./spec.md)

---

## 1. Starter Constellation Generation Engine Location

### Decision

Implement the starter constellation generator inside `packages/generator-engine/src/starter-constellation.ts` and expose it via the `@codex/generator-engine` package export.

### Rationale

- **Principle I (Library-First)**: Core lore and data generation belongs in workspace packages (`packages/generator-engine`), keeping `apps/web` as a thin UI presentation layer.
- **Offline Reliability**: Provides deterministic theme-based local generation (5–6 archetypes per theme: Region, Settlement, Faction, Character, Threat for Fantasy; District, Corporation, Gang, Character, Conflict for Cyberpunk) alongside optional Gemini AI prompt embellishment.
- **Reusability**: Allows both web app and potential CLI or import tools to generate starter constellations using the exact same service.

### Alternatives Considered

- _Inline component generation in SvelteKit page_: Rejected—violates Principle I (Library-First) and duplicates generator code.
- _Pure LLM prompt without local tables_: Rejected—violates offline capability requirement (`FR-005`) and increases startup latency.

---

## 2. Guided Mode State Persistence & Reactive Disclosure

### Decision

Add an `isGuidedMode: boolean` property to `uiStore` (`apps/web/src/lib/stores/ui/ui.svelte.ts`), backed by `localStorage` key `codex_guided_mode_active` (defaulting to `true` for first-time visits).

### Rationale

- **Principle V (Privacy & Client-Side Processing)**: Local preference stored client-side in the browser.
- **Svelte 5 Runes**: Using `$state` in `uiStore` allows instantaneous (<100ms) UI updates without page reloads.
- **Clarification Decision**: Users agreed Guided Mode should be a global browser preference that stays active until explicitly toggled off.

### Alternatives Considered

- _IndexedDB per-world field_: Rejected—clarification decision established that Guided Mode is a global user preference across all worlds, not isolated per world.

---

## 3. Intent-First Context-Aware `+ Create` Architecture

### Decision

Introduce a `IntentCreateModal.svelte` and helper `contextual-intent-helper.ts` in `apps/web/src/lib/components/guided/`.

### Rationale

- **Context Inference**: When invoked from an active entity view (e.g. Faction "Iron Syndicate"), the helper extracts active `themeId`, `parentEntityId`, `location`, and passes them directly to `generator-engine` to produce a draft.
- **Evaluate → Customize Flow**: Displays the generated draft immediately with 1-click "Accept/Save". A "Customize" button expands advanced generator fields (e.g. archetype, sub-theme, prompt parameters) without losing inferred context.

### Alternatives Considered

- _Redirecting to standard full generator page_: Rejected—creates modal jump and cognitive overload for new users (`FR-009`).

---

## 4. Contextual Structural Recommendations Engine

### Decision

Implement `evaluateEntityRecommendations(entity, worldEntities)` as a pure, deterministic function in `apps/web/src/lib/services/contextual-recommendations.ts`.

### Rationale

- **Principle III (Simplicity & YAGNI)**: Deterministic rules (e.g. `entity.type === 'faction' && !hasLeader(entity, worldEntities)`) execute in sub-millisecond time with zero AI API costs or latency.
- **UI Integration**: Rendered as a clean `<SuggestionBanner>` component at the bottom of `DetailHeader.svelte` / entity detail panel (`FR-014`).

### Alternatives Considered

- _LLM-driven recommendation requests_: Rejected—adds unnecessary API latency and costs for simple structural checks.
