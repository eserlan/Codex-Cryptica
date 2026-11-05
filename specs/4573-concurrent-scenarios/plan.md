# Implementation Plan: Concurrent Adventure situations

**Branch**: `4573-concurrent-scenarios` · **Date**: 2026-11-03 · **Spec**: [spec.md](spec.md)
**Base**: `origin/staging` at `d5c17dbaf`, containing merged #4628. Future PR base is staging; there is no outstanding parent PR to stack against.

## Summary

Extend adventure-engine with a versioned scenario collection inside the current Adventure document. Migrate to schema version 3 and remove singular state as a writable authority. Reuse #4623 grounding, the existing rumour selector and revision/lease persistence. Keep fluid exploration central; add only compact known-situation controls and an optional add-to-current-adventure shortcut.

## Technical Context

- Repository TypeScript 6, Svelte 5 runes, SvelteKit, Bun; existing schema/Zod, adventure-engine, generator-engine and local Vault services. No new third-party dependency.
- Existing `.codex/adventures/<id>.json` remains the sole durable owner. No new database, remote storage, campaign store or canonical entity writes.
- Existing limits: 32,000 serialised state characters, 96,000 generation input characters, 600 per normal text field, 160 per ID, 60 secrets and 40 GM threads. Validate the combined state; eight scenarios and 100 events each are independent upper bounds, not additive capacity guarantees.
- Tests: focused engine migration/reducer/secrecy fixtures, web workflow/component tests, deterministic 15+ turn revisit/roll/reload fixture. New engine logic targets at least 70% coverage.

## Constitution Check

Pre-design and post-design: PASS, with no exception. Domain policy/types/migrations stay in adventure-engine; app workflow uses constructor DI and existing runtime authority. Tests precede changed behaviour and cover negative/cancellation paths. Help is updated. Retrieval remains local; canon remains reviewed; no public discovery surface is added.

**Bounded responsibility**: schemas.ts is 493 lines, reducer.ts 477 and AdventureSurface.svelte 499. Extract scenario schemas/migration policy into sibling domain modules and put new mutations in scenario-collection.ts. Extract the existing rumour-conflict view before expanding the near-limit surface. Keep its wrapper as the sole session migration/budget entry point. If a touched file crosses 500 lines, name its single responsibility or split it; carry tests. No Oracle facade expansion beyond delegation.

## Design and delivery

1. **One authority**: schema v3 has optional `scenarioCollection` (version 1, items, focus ID). Omission means no structured scenarios. The v2→v3 migration converts a singular scenario to one known item and removes `scenarioState`; reject mixed representations. v1 runs the existing migration first. Parsing clones input, never saves. If migration metadata pushes a previously valid legacy record over the aggregate limit, retain a validated legacy read-only projection/recovery path and leave the original document untouched; do not silently truncate history or call it corrupt. Existing old readers are not expected to understand v3; unknown future versions fail safely.
2. **State and commands**: reuse the existing seed/event shapes in a versioned collection item with separate `knowledge: unheard | heard`, existing open/resolved/abandoned outcome, explicit anchor references and secret bindings. Commands target stable scenario/event IDs and expected session revision. Same import origin with identical immutable seed is already-applied without stealing focus; a different truth is a provenance conflict. Focus is known/open only; terminal transitions clear focus without closing the Adventure. No hidden scenario becomes player-known via focus.
3. **Provenance**: allocate one batch ID at the app generation boundary and retain it with the same draft through retry/cancel/handoff. Extend rumour-selection origin metadata without changing six-rumour parsing/output. An older in-memory draft without a batch ID gets one once when adopted; preserve that augmented draft through restore/cancel so reselecting it cannot allocate another identity. New imports require stable origin identity; names/titles are never dedupe keys. A saved-source adapter, if already used, identifies its immutable snapshot, not just an editable record ID. No new saved-note import UI is required.
4. **Secrets**: new scenarios allocate opaque bounded secret IDs through injected IDs and persist bindings. Never derive IDs by concatenating arbitrary 160-character IDs or reuse reveal status by text equality. Migration preserves existing registered secret IDs/reveal references; allocate deterministic free legacy IDs only for missing bindings. Validate collisions across scenario/event/secret identities. Protect immutable bound truth from later hiddenPatch edits. Approved reveal decisions use secret bindings, not text matching: revealing A must not unlock B, and a legitimate A reveal must not be rejected solely because its text also occurs in B. Freeform attribution remains a model-evaluation concern. Historical turn/reveal and world-time thread references remain valid.
5. **Background**: new three-situation background batches become structured unheard items committed with the same opening/action transaction. Legacy free-text threads/secrets remain as legacy GM state, with no guessed pairing or automatic reseeding. Structured scenarios become the source of their own derived secret/thread context; do not persist a second editable copy of the same new background situations. Continue accepting legacy thread IDs in existing time events; leave a typed scenario reference seam for #4530. Do not emit invented GM-thread IDs for new scenarios: elapsed-time updates can continue, while scenario-specific developments must use validated collection events.
6. **Grounding and projections**: adapt prompt, hidden-state guard, recap and player projection across the collection. The guard considers all undisclosed scenarios, including nonfocused ones. Compact context derives from the one durable collection using existing budgets and explicit references; it never modifies history or invents a summary. Preserve existing #4623 provider reset, pending-roll context and scope checks. Full canonical facts outrank provisional scenario detail.
7. **App/UI**: add a sibling scenario workflow to AdventureRuntime. A new rumour in an active session offers Add to current adventure, Continue, Cancel, or the existing explicit archive/start path. A valid pending roll blocks add/focus/status mutations until resolved or explicitly dismissed, preserving its context. A compact known-situation control in existing tools exposes focus/clear/resolve/abandon; free action remains available with no focus. Offline/AI-disabled state-only commands work locally when writable; read-only/conflict/error cases preserve state and handoff.
8. **Bounds/compaction**: store shared actors as references and events once, derive player/model context on demand, and retain meaningful history. Do not silently shrink truth, provenance or discovered facts to make a save fit. If a collection/event/secret/aggregate limit is reached, return a typed full-state failure and retain the prior session. Lossy summarisation or an archive subsystem is outside this mini slice.

## Project Structure

- `packages/adventure-engine/src/{types.ts,schemas.ts,scenario-state.ts,scenario-collection.ts,scenario-schemas.ts,scenario-migration.ts,hidden-state.ts,prompt.ts,reducer.ts}` and focused `tests/` fixtures.
- `packages/generator-engine/src/rumour-play-selection.ts` plus its tests: stable optional origin metadata for compatibility; new scenario commands enforce required identity.
- `apps/web/src/lib/stores/oracle/{adventure-scenarios.ts,adventure-runtime.ts,adventure-manager.svelte.ts,rumour-adventure-handoff.svelte.ts}`.
- `apps/web/src/lib/services/adventure/{world-entry-background.ts,adventure-grounding-service.ts,adventure-context-service.ts}` as needed for collection projection/ref handling; reuse retrieval infrastructure.
- Existing generator draft boundary and `AdventureSurface.svelte`; new `AdventureRumourConflict.svelte` and `AdventureScenarioControls.svelte`, mounted through existing management tools.
- `apps/web/src/lib/content/help/adventure-mode.md`.

## Dependencies and phases

Contracts/migration → collection commands + secrecy → background/grounding integration → minimal controls and sustained regression gate. #4531 consumes `markHeard` and structured provenance later; #4529 does not add a discovery ranking pipeline or another AI pass.
