# Implementation Plan: Advanced Oracle Draw Button

**Branch**: `050-oracle-draw-button` | **Date**: 2026-02-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/050-oracle-draw-button/spec.md`

## Summary

Implement a one-click "Draw" button across three key UI areas: Oracle Chat, Entity Detail Sidepanel, and Zen Mode. This feature is exclusive to the Advanced Tier and automates the visual generation flow by grounding requests in existing entity lore and any detected "Art Style" guides in the vault.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+
**Primary Dependencies**: Svelte 5 (Runes), Google Gemini SDK (@google/generative-ai), OPFS (Vault Storage)
**Storage**: N/A (Transient UI state for chat; OPFS for persistent entity images)
**Testing**: Vitest (Logic), Playwright (E2E)
**Target Platform**: Browser (Web)
**Project Type**: Monorepo (apps/web)
**Performance Goals**: < 200ms UI feedback; < 10s for full image generation and persistence.
**Constraints**: Must respect tier boundaries (Advanced only).

## Constitution Check

- [x] **Library-First**: Core generation logic is encapsulated in `AIService` and `OracleStore`.
- [x] **TDD**: Unit tests will be added for the new `OracleStore` draw methods.
- [x] **Simplicity & YAGNI**: Leverages existing AI infrastructure instead of building a new service.
- [x] **AI-First Extraction**: Uses text-to-visual distillation to optimize the prompt for the image model.
- [x] **Privacy & Client-Side**: All image generation and saving occurs client-side via browser APIs and Gemini SDK.
- [x] **Clean Implementation**: Strict use of Svelte 5 runes and proper prefixing for unused variables.
- [x] **User Documentation**: Feature documentation will be added to `help-content.ts`.

## Phase 0: Outline & Research

1. **Research existing image generation flow**: Verified that `AIService` already handles art style grounding and prompt distillation.
2. **Identify UI integration points**: Confirmed `ChatMessage`, `DetailImage`, and `ZenModeModal` as primary hosts for the new button.
3. **Analyze state persistence**: Determined that chat-triggered images are transient in history (unless archived), while entity-triggered images update the vault record.

## Phase 1: Design & Contracts

1. **Data Model**: Updated `ChatMessage` and `OracleStore` entities to support tracking and triggering "Draw" actions.
2. **API Contracts**: Defined `IDrawActions` interface for standardized visualization triggers.
3. **Agent Context**: Updated `GEMINI.md` with feature-specific technical context.

## Phase 2: Implementation

1. **OracleStore Enhancements**:
   - Implement `drawEntity(entityId)` and `drawMessage(messageId)` methods.
   - Integrate with `aiService.retrieveContext` using the `isImage: true` flag.
2. **UI Integration**:
   - Add "Draw" button to `ChatMessage.svelte` for assistant messages.
   - Integrate "Draw" trigger into the empty state of `DetailImage.svelte`.
   - Add high-visibility "Draw" button to `ZenModeModal.svelte` for image-less entities.
3. **Feedback & Refinement**:
   - Implement loading indicators for each UI context.
   - Add Style Grounding Indicators to indicate when a global art style is being used.
4. **Verification**:
   - Run E2E tests covering tier isolation and single-click generation.
