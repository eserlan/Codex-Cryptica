# Implementation Plan: Smart Multi-Format Copy

**Branch**: `2815-smart-copy` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/2815-smart-copy/spec.md`

## Summary

Standardise document-like Copy actions on a shared `ClipboardService.copyContent(...)` contract. Callers provide canonical Markdown/plain content; the service renders or accepts corresponding semantic HTML, sanitises every rich representation, writes one clipboard item containing both MIME types (and an optional image), and falls back to the canonical text when rich writes are unavailable or rejected. Extract generator document assembly from the oversized public-generator page, reuse it for current, section, and Session Hub copies, migrate the ad-hoc entity read-modal write, and leave audited literals and image-only actions deliberately unchanged.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5.55.9 Runes, SvelteKit 2.60.1, Bun 1.3.14  
**Primary Dependencies**: Existing browser Clipboard API, `marked` 18.0.4, `dompurify` 3.4.2, existing generator document-layout helpers; no new dependency  
**Storage**: N/A — clipboard payloads are transient and browser-local  
**Testing**: Vitest 4.1.7, jsdom, Testing Library Svelte 5.3.1  
**Target Platform**: Secure-context browsers and supported mobile WebViews, progressively enhanced from plain-text clipboard writes  
**Project Type**: SvelteKit web application with shared client-side services  
**Performance Goals**: Text-only copy preparation performs no network or persistence work and completes within the initiating user interaction; optional existing image preparation may remain asynchronous  
**Constraints**: Preserve exact canonical Markdown, sanitise every HTML payload, retain compatibility APIs and optional entity image support, preserve user activation by completing work from the Copy interaction, and fall back without destination detection  
**Scale/Scope**: One shared service, three immediate generator/Session Hub copy flows, one existing ad-hoc document copy, two existing shared smart-copy consumers, and an audit of the current web-app clipboard call sites

## Constitution Check

_Gate result before research: PASS. Re-checked after design: PASS._

- **I. Library-First — PASS**: This is a browser-specific application capability already owned by the shared web service, not a new domain engine. The web app remains thin by centralising clipboard policy in that service and generator document assembly in a focused sibling module.
- **II. TDD — PASS**: Start each slice with failing service/helper/component tests. Cover successful rich writes plus missing capability, rejected rich write, total failure, sanitisation, and optional-image degradation.
- **III. Simplicity & YAGNI — PASS**: Reuse `ClipboardService`, `marked`, DOMPurify, document-layout data, and existing feedback/analytics. Add no destination picker, browser polyfill, new dependency, or lint rule.
- **IV. AI-First Extraction — N/A**: No extraction or AI behaviour changes.
- **V. Privacy & Client-Side Processing — PASS**: Clipboard payload preparation remains local; no user content is transmitted or persisted.
- **VI. Clean Implementation — PASS**: Svelte changes retain runes, semantic theme tokens, Iconify icons, and targeted validation. No visual redesign is planned.
- **VII. User Documentation — PASS**: The behaviour is transparent and does not introduce a new workflow needing a help article. Developer-facing guidance will document the smart-versus-literal convention.
- **VIII. Dependency Injection — PASS**: `ClipboardService` keeps constructor defaults while accepting clipboard, clipboard-item creation, Markdown rendering, sanitisation, fetch, and document collaborators for tests. Component copy behaviour is exercised through injected callbacks/services.
- **IX. Natural Language — PASS**: Controls remain “Copy” with existing “Copied!” and failure feedback; no MIME or destination jargon is exposed.
- **X. Quality & Coverage — PASS**: New shared logic and migrated high-value surfaces gain success and meaningful failure-path coverage.
- **XI. Operational Protocol — PASS**: Work is limited to the issue’s contract, immediate adoption, audit, tests, and guidance; verification is explicit below.
- **XII. Labels Over Tags — PASS**: Existing generator `labels` terminology is preserved.
- **XIII. Discovery Intent Governance — N/A**: Existing generator pages change an interaction only; no route, indexable content position, canonical intent, or discovery page is added.
- **XIV. Bounded Responsibility — PASS**: The only planned source file over 500 lines is listed below. Clipboard document assembly is extracted instead of appended to it.

### Discovery Intent Check

N/A. The feature changes Copy behaviour on existing pages and does not add or materially reposition a public discovery page. `bun scripts/discovery-audit.mjs` is therefore not required for this plan’s scope.

### Bounded Responsibility Check

- [x] `apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte` is currently 1,001 lines and is the only over-500-line source file planned for modification.
- [x] Its remaining responsibility is orchestration of the public generator page: generation state, page composition, Session Hub coordination, save/refine/copy actions, analytics, and child-component wiring.
- [x] Canonical copy-document construction does not belong in that orchestrator and will move to `generator-copy.ts`; the page retains only short event handlers and state feedback.
- [x] The extracted helper receives focused unit coverage, while existing layout tests retain integration coverage.

Post-design result: PASS. `ZenView.svelte` and other over-trigger files are existing callers or literal-copy owners and need not be touched merely to satisfy an audit. If implementation reveals a required change to another over-trigger file, it must receive the same responsibility check before editing.

## Project Structure

### Documentation (this feature)

```text
specs/2815-smart-copy/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── smart-copy.md
└── tasks.md                 # created later by /speckit.tasks
```

### Source Code (repository root)

```text
apps/web/src/lib/
├── services/
│   ├── ClipboardService.ts
│   ├── ClipboardService.test.ts
│   ├── character-chat-export.ts
│   └── character-chat-export.test.ts
├── components/
│   ├── oracle/
│   │   ├── chat-message-controller.svelte.ts
│   │   └── chat-message-controller.test.ts
│   ├── modals/
│   │   ├── NodeReadModal.svelte
│   │   └── NodeReadModal.test.ts              # add if absent
│   └── seo/
│       ├── generator-copy.ts                  # new canonical document assembly
│       ├── generator-copy.test.ts             # new
│       ├── SEOGeneratorLayout.svelte
│       ├── SEOGeneratorLayout.test.ts
│       ├── EntityDetailModal.svelte
│       └── EntityDetailModal.test.ts           # new

docs/
└── STYLE_GUIDE.md                              # smart content vs literal copy convention
```

**Structure Decision**: Keep browser clipboard behaviour in the existing app-level service because it depends on browser APIs and serves multiple web surfaces. Extract only generator-specific canonical document assembly beside the existing generator layout helpers. Do not create a workspace package for a browser adapter with no cross-package consumer.

## Phase 0: Research Decisions

The completed decisions and alternatives are recorded in [research.md](./research.md). There are no unresolved `NEEDS CLARIFICATION` items.

## Phase 1: Design and Contracts

The transient model is defined in [data-model.md](./data-model.md), the callable behaviour in [contracts/smart-copy.md](./contracts/smart-copy.md), and the validation path in [quickstart.md](./quickstart.md).

Implementation should proceed in dependency order:

1. Add failing `ClipboardService` contract tests for dual MIME output, sanitisation, missing `ClipboardItem`/`write`, rejected rich writes, total failure, and optional image preservation.
2. Implement `copyContent(...)`; make `copyHtmlAndText(...)` and `copyEntity(...)` compatibility delegates so there is one write/fallback policy.
3. Add failing generator-copy helper tests, extract canonical full-result and historical-result assembly from `SEOGeneratorLayout.svelte`, and confirm title, summary, labels, content, and optional “At the Table” ordering.
4. Migrate full-result and section Copy handlers to the helper/shared service while preserving timers, error behaviour, and analytics metadata. Keep inline name copies plain because they are literal labels.
5. Add Session Hub detail Copy through an injected async handler, including success/error state that does not close or mutate the draft and analytics source `session_hub_detail`.
6. Migrate `NodeReadModal.svelte` from its hand-built multi-MIME write to the shared service, gaining plain fallback without duplicating conversion/sanitisation.
7. Verify compatibility for Oracle, character-chat export, and entity copy. Record all other current direct writes as literal/plain or special image actions and leave them unchanged.
8. Add the developer convention to the style guide and run the validation matrix in `quickstart.md`.

## Complexity Tracking

No constitution violations require exceptions.
