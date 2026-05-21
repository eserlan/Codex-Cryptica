# Implementation Plan: Svelte 5 Rune Hardening & Performance

**Branch**: `785-rune-hardening` | **Date**: 2026-05-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/108-rune-hardening/spec.md`

## Summary

This plan outlines the complete migration of `apps/web/src` from legacy Svelte stores and auto-subscriptions to pure Svelte 5 Runes. The approach focuses on surgical replacement of reactive patterns, proactive bug fixing, and memory safety via `$state.snapshot`.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes  
**Primary Dependencies**: Svelte 5  
**Storage**: N/A (Transient reactive state)  
**Testing**: Vitest  
**Target Platform**: Browser  
**Project Type**: Web Application  
**Performance Goals**: <100ms interaction latency in large vaults  
**Constraints**: Zero `svelte/store` imports in `apps/web/src`  
**Scale/Scope**: ~392 component imports, ~30,000 potential reactivity points

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **Library-First**: N/A (UI hardening)
- [x] **TDD**: Mandated for all store conversions
- [x] **Simplicity**: Focus on native Runes
- [x] **Privacy**: Client-side state only
- [x] **DI**: Constructor-based DI preserved
- [x] **Validation**: `pnpm test` and `pnpm run lint` required

## Project Structure

### Documentation (this feature)

```text
specs/108-rune-hardening/
├── plan.md              # This file
├── research.md          # Identified legacy patterns and decisions
├── data-model.md        # Reactive state transformation rules
├── quickstart.md        # Performance and memory validation steps
├── contracts/
│   └── reactive-api.md  # Standards for Runic stores and components
└── tasks.md             # Implementation breakdown
```

### Source Code (repository root)

```text
apps/web/src/
├── lib/
│   ├── components/      # Target for $store removal
│   ├── stores/          # Target for Writable/Derived removal
│   └── services/        # Target for $state.snapshot integration
└── routes/              # Target for auto-subscription removal
```

**Structure Decision**: Standard web application structure; focusing on the `lib/` and `routes/` directories for reactivity hardening.
