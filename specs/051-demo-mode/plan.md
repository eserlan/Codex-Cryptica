# Implementation Plan: Interactive Demo Mode

**Branch**: `051-demo-mode` | **Date**: 2026-02-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/051-demo-mode/spec.md`

## Summary

Implement a transient, theme-aware "Demo Mode" that allows users to explore Codex Cryptica with pre-loaded sample data. The system will support deep-linking (e.g., `?demo=vampire`) to instantly showcase theme-specific aesthetics and jargon, and provide a "Save as Campaign" path to convert transient exploration into a persistent local campaign.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+  
**Primary Dependencies**: Svelte 5 (Runes), Tailwind 4, `idb` (IndexedDB wrapper), Gemini SDK  
**Storage**: Transient (In-memory) for demo session; IndexedDB for conversion  
**Testing**: Vitest (Unit), Playwright (E2E)  
**Target Platform**: Web (Browser / PWA)
**Project Type**: Monorepo (apps/web)  
**Performance Goals**: < 500ms demo initialization; < 2s for "Save as Campaign" conversion.  
**Constraints**: 100% Client-side processing; zero data-bleed between demo and persistent vaults.  
**Scale/Scope**: 6+ themes with unique sample datasets (Fantasy, Sci-Fi, Vampire, Modern, Wasteland, Cyberpunk).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **Library-First**: Demo logic is encapsulated in `VaultStore` and `uiStore` enhancements.
- [x] **TDD**: Unit tests planned for transient loading and conversion logic.
- [x] **Simplicity & YAGNI**: Reuses existing `VaultStore` structure instead of creating a parallel system.
- [x] **AI-First Extraction**: Oracle persona adapted for guided demo assistance.
- [x] **Privacy & Client-Side Processing**: All demo assets and logic are handled entirely in the browser.
- [x] **Clean Implementation**: Strict adherence to Svelte 5 runes and Tailwind 4 standards.
- [x] **User Documentation**: Help documentation and "Demo Mode" UI indicators included.

## Project Structure

### Documentation (this feature)

```text
specs/051-demo-mode/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (Future)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── lib/
│   │   ├── stores/
│   │   │   ├── vault.svelte.ts   # Modified: loadDemoData, persistToIndexedDB
│   │   │   └── ui.svelte.ts      # Modified: isDemoMode, activeDemoTheme
│   │   ├── components/
│   │   │   ├── layout/           # Modified: Landing page links, Demo badge
│   │   │   └── settings/         # Modified: Save as Campaign CTA
│   └── routes/
│       └── +layout.svelte        # Modified: URL param detection
└── static/
    └── vault-samples/            # New: Theme-specific lore JSON
```

**Structure Decision**: Web application focused. Logic is centralized in `apps/web/src/lib/stores` to leverage existing vault architecture.
