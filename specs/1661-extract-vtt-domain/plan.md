# Implementation Plan: VTT Domain Extraction

**Branch**: `1661-extract-vtt-domain` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/1661-extract-vtt-domain/spec.md`

## Summary

Move the framework-independent VTT model and session-normalization rules from
`apps/web` into the existing `map-engine` workspace package. The web application
will keep its Svelte managers, persistence, P2P transport, and UI, consuming the
new package API through a compatibility re-export.

## Technical Context

**Language/Version**: TypeScript 6.0.3
**Primary Dependencies**: `schema` workspace types, existing `map-engine`, Svelte 5
Runes in the web adapters
**Storage**: No storage changes; browser persistence remains in `apps/web`
**Testing**: Vitest package tests plus existing web VTT snapshot tests
**Target Platform**: Browser application; package code remains platform-neutral
**Project Type**: Workspace library extraction within a web application
**Performance Goals**: Session normalization remains synchronous and linear in the
number of tokens
**Constraints**: No imports from `apps/web`, no DOM, storage, or P2P dependencies
in the package; preserve legacy visibility handling
**Scale/Scope**: Shared VTT types and snapshot invariants only; reactive managers
remain app-local in this slice

## Constitution Check

_GATE: evaluated against constitution v1.3.0._

| Principle                  | Status | Notes                                                                          |
| -------------------------- | ------ | ------------------------------------------------------------------------------ |
| I. Library-First           | PASS   | Pure VTT rules extend the existing `map-engine` package.                       |
| II. TDD                    | PASS   | Package tests precede the extraction and web regression tests remain in place. |
| III. Simplicity & YAGNI    | PASS   | Extends one existing package; no new abstraction or package is introduced.     |
| V. Privacy & Client-Side   | PASS   | No network or persistence behavior changes.                                    |
| VI. Clean Implementation   | PASS   | Strict TypeScript and existing lint/test validation apply.                     |
| VIII. Dependency Injection | PASS   | No new service/store dependencies; web adapters retain injected collaborators. |
| X. Quality & Coverage      | PASS   | New pure helpers receive package-level success and failure-path tests.         |

## Project Structure

### Documentation (this feature)

```text
specs/1661-extract-vtt-domain/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── vtt-domain.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/map-engine/src/
├── index.ts                         # package public API
├── vtt.ts                           # shared VTT model and normalization
└── vtt.test.ts                      # package-level behavior tests

apps/web/src/
├── types/vtt.ts                     # compatibility re-export
└── lib/stores/vtt/
    ├── vtt-token-manager.svelte.ts  # consumes package normalization
    └── vtt-session-snapshot-manager.ts # consumes package session invariants
```

**Structure Decision**: Extend `map-engine` because this behavior is map/VTT domain
logic and it already depends only on shared schema types. Keep reactive managers in
the web app because they own Svelte state and browser-side effects.

## Complexity Tracking

No constitution violations require justification.
