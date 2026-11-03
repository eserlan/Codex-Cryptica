# Implementation Plan: World-grounded Adventure interactions

**Branch**: `4572-adventure-world-retrieval` | **Date**: 2026-11-03 | **Spec**: [spec.md](spec.md)
**Issue**: #4623

## Summary

Require local world/session context preparation before every existing Adventure AI request. Reuse AdventureContextService and temporal projection, add one app-level constructor-injected coordinator, and share its prepared context between turn transport and background rumour generation. Deliver source precedence, bounded retrieval and safe retry without implementing new gameplay systems.

## Technical Context

**Language/Version**: Repository TypeScript 6, Svelte 5, Bun 1.3.14.
**Primary Dependencies**: Existing adventure-engine, ai-engine, generator-engine, Vault search/record loading and chronology-engine; no new third-party dependency.
**Storage**: Existing local Vault/Adventure records, unchanged. Transient context only.
**Testing**: Existing Vitest engine/service/manager tests, stubbed provider and worker routes.
**Target Platform**: Browser app and existing Oracle worker transport.
**Project Type**: Existing workspace libraries plus app orchestration.
**Performance Goals**: Explicit source/text budgets in data-model.md; bounded body reads on 10,000-record fixture; record local latency separately from generation, no extra AI pass.
**Constraints**: Local-first, one active session, no canon writes, no retrieval cache initially, no new UI flow.
**Scale/Scope**: Opening/action/roll-resolution and world-entry background generation. Future standalone summaries/dialogue/extraction integrate later.

## Constitution Check

Pre-design and post-design: PASS; no exceptions.

- I/III: Reuse packages; framework-free types/budget policy in adventure-engine, Vault orchestration in app services. No new retrieval database or package.
- II/X: Tests precede behaviour changes, cover success and failure/cancellation; preserve existing coverage floors and target 70% for major engine extractions.
- IV/V: Existing configured AI pipeline only; local retrieval, no new remote storage or logging of lore.
- VI/VIII: Constructor DI with production defaults and singleton export for coordinator; impacted-only checks. No new UI component; existing style/animation rules apply if retry messaging needs adjustment.
- VII/IX: Update apps/web/src/lib/content/help/adventure-mode.md for grounding, uncertainty and recoverable lookup failures; no FeatureHint needed for an automatic internal step.
- XI/XII: Surgical change, plain language, no new terminology/categories.
- XIII: Discovery intent check N/A: no public discovery page.
- XIV: adventure-turn-generation.service.ts is currently 648 lines; if edited, retain its provider-generation responsibility and put context signature/invalidation helper in a sibling module. New retrieval behaviour belongs outside it. AdventureContextService is 329 lines, prompt.ts 128; review trigger again during implementation. Carry helper tests on extraction.

## Project Structure

Feature artifacts: spec.md, plan.md, tasks.md, research.md, data-model.md, contracts/grounding.md, quickstart.md, checklists/requirements.md and implementation-review.md.

Source targets:

- packages/adventure-engine/src/grounding.ts (new pure types/budget policy), index.ts and focused tests.
- apps/web/src/lib/services/adventure/adventure-context-service.ts (purpose-aware retrieval, existing temporal helpers).
- apps/web/src/lib/services/adventure/adventure-grounding-service.ts (new DI orchestration and outcome handling).
- apps/web/src/lib/stores/oracle/adventure-runtime.ts (coordinator installation and current-scope checks), adventure-generation.svelte.ts, adventure-opening.ts, adventure-actions.ts, adventure-rolls.ts, adventure-background.ts (shared integration).
- apps/web/src/lib/components/oracle/adventure/AdventureSurface.svelte (background generator registration only; avoid adding orchestration here).
- packages/ai-engine/src/adventure-turn-generation.service.ts and sibling context-signature helper if needed (retained interaction safety only).
- apps/web/src/lib/content/help/adventure-mode.md and existing service/manager/provider tests.

## Phase 0 — Research findings

See research.md. Turn adapter alone is insufficient: AdventureSurface registers backgroundRumourService.generateDraft through campaignGeneratorRequestBuilder, invoked by adventure-background.ts. No standalone AI summary/dialogue/extraction service currently exists; provisionalFacts are returned within turns. Existing repair/expired-interaction retries reuse a prepared request and should continue doing so while that snapshot remains valid.

## Phase 1 — Design

1. Define plain context intent/envelope/outcomes in adventure-engine and reuse `allocatePromptBudget` for final prompt allocation; limit and deduplicate candidate reads before hydration. Include provenance and disclosure/time applicability without inventing new persistence.
2. Add purpose-aware preparation in existing context service, using canonical anchors, existing search/world-entry graph and chronology helpers, then merge bounded committed session knowledge. Recheck session/control after asynchronous reads. Wire dependencies so injected transport receives prepared requests too; caller-built empty excerpts cannot opt out.
3. Coordinator prepares on main thread, validates ready state, then dispatches through the existing direct/worker adapter. Thread AbortSignal through reads where supported and always check after completion. Remove duplicate caller retrieval.
4. Adapt the separate background generator to consume the same purpose-prepared context with explicit temporal/disclosure policy. Audit the campaign request builder for accidental extra unprojected lore. Preserve background preparation within existing optimistic commit semantics.
5. Use pending roll's persisted originating action and supplied outcome for retrieval. Never evaluate dice during context preparation or repair.
6. Clear retained provider interaction before every new interaction until a reliable Vault-wide validity signal exists; omission from incremental sources does not erase provider history. Preserve repair on the same valid snapshot; reject stale requests. No cross-turn retrieval cache in this slice.
7. On failed or required-source-unavailable resolution, invoke no provider. Grounding failures must bypass the background generator fallback; after successful grounding, optional rumour generation failure may still use the existing local fallback. Use existing recoverable error/retry lifecycle and preserve drafts, pending outcomes and committed history. Successful empty lookup remains a valid prepared envelope.
8. Add entry-point inventory and future-call integration rule in contracts/grounding.md, deterministic direct/worker/background coverage, bounded large-Vault fixture and 30-turn continuity fixture.

## Delivery and dependencies

US1 is the MVP but includes background generation as an existing path. US2 applies temporal/disclosure policy and retained-context safety to that shared boundary; US3 proves recovery. All three must pass before #4623 closes. Reuse #4557 implementation as available; do not wait for historical anchors, #4529 multi-scenario or #4533 entity materialisation.

## Complexity Tracking

No constitution violations. AdventureRuntime installs the coordinator around the dependency-injected transport so freshness checks can use its current state. The existing final prompt allocator remains authoritative. The 24-record retrieval cap is an initial bound; benchmark evidence may justify a documented adjustment. No atomic Vault snapshot is promised without a reliable revision signal.
