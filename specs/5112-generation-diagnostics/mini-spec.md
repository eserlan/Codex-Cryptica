# GM Director 04 — Generation-Path and Narrative-Progress Diagnostics Mini-Spec

> Issue: [#5112 — Add generation-path and narrative-progress diagnostics](https://github.com/eserlan/Codex-Cryptica/issues/5112)
> Parent epic: [#5108 — AI GM Director](https://github.com/eserlan/Codex-Cryptica/issues/5108) (04/06, P2)
> Depends on: Director brief 01 ([#5109](https://github.com/eserlan/Codex-Cryptica/issues/5109), merged) and meaningful-progress 02 ([#5110](https://github.com/eserlan/Codex-Cryptica/issues/5110), merged). Generation metadata can start independently.

## 1. Specification (What & Why)

### Problem Statement

The current diagnostic snapshot shows committed turns and generic quiet/stall counters, but cannot establish whether a reply came from retained provider history or stateless fallback, what context shape was sent, why history reset, which scenario the Director selected, or whether an apparent state change actually advanced anything. Live-model playtest failures are therefore hard to diagnose.

### Scope & Boundaries

- **In Scope**:
  - Persist small, privacy-conscious **generation metadata** with the validated committed turn: model _registry key_ (never provider raw IDs or keys), requested reasoning effort, transport kind (provider interaction vs. stateless generation), thread mode (`new | continued | reset`), reset reason category (bounded enum), request sizes/budgets (byte/char counts, never raw prompt), source counts, selected scenario IDs (GM-only export only), and optional Director-progress category from #5110.
  - Instrument actual transport decisions and distinguish three moments: request sent, proposal accepted, local save succeeded. Never report a successful retained interaction before acknowledgement.
  - Explicit reset reason categories: 80-turn refresh, provider expiry, model change, changed authoritative source, scene boundary, revision mismatch, rejected turn, worker/app lifetime — plus `unknown` when metadata is unavailable. Never guess a reason.
  - Expose metadata in the existing GM-only Adventure diagnostic JSON (`adventure-review-capture.ts`, full + delta) and optionally a concise diagnostics summary. Player surfaces never receive it.
  - Backward compatibility: earlier sessions/turns without metadata parse and export unchanged, with missing fields marked `unknown`/absent, never invented.
  - Bounded storage: metadata is a few small enums and numbers per turn; verify against the existing session state budget. No narration, prompt bodies, secrets, API keys, player identifiers, or token-level content; nothing is sent to analytics.
- **Out of Scope**:
  - No raw prompt/narration capture, no analytics pipeline, no new server state, no reconstruction of provider history (that is #5114's question), no UI redesign beyond the existing diagnostic copy/summary surface.

### Acceptance Criteria

- [ ] A synthetic 100-turn fixture shows when the provider thread was reused/refreshed and what the GM received (sizes/counts/categories), without exposing confidential content.
- [ ] Custom-key/stateless, fallback-after-provider-failure, reload, failed save, retry, OOC, and imported scene changes have correct classifications (request vs. accepted vs. saved are distinct).
- [ ] Compact export identifies active/focused scenario IDs and narrative-progress signals (when available) without displaying GM-only truth in player surfaces.
- [ ] Backwards-compatible parser, local-first guarantees, bounded storage, verified budget and secret-leak tests.
- [ ] A short "capture and interpret a diagnostic for a stalled adventure" note is documented (in the diagnostic `_readme` or a linked doc section).

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - `packages/adventure-engine/src/types.ts` + schemas: optional `generation` metadata on `CommittedAdventureTurn` (all fields optional/enum-bounded so old turns parse); `CommitMetadata` extended with an optional generation descriptor supplied by the app layer. No schema-version bump if additive-optional parses cleanly — verify.
  - `packages/adventure-engine/src/completed-turn.ts` / `turn-state.ts`: copy validated generation metadata onto the committed turn; absent descriptor stays absent.
  - `apps/web/src/lib/stores/oracle/adventure-runtime.ts` + `adventure-generation.svelte.ts` + `adventure-turn-retry.ts`: record the actual transport decision (retained vs. stateless, new/continued/reset + reason) at generation time, thread it through `newTurnMetadata`/`rollMetadata`, and only mark retained-success after provider acknowledgement. Reset call sites supply their reason category (80-turn refresh, scene boundary, rejected turn, revision mismatch, model/source change, lifetime).
  - `apps/web/src/lib/services/adventure/adventure-review-capture.ts`: include per-turn generation metadata and a bounded summary (thread reuse/reset counts, last reset reason, Director focus + progress category) in full and delta GM-only diagnostic JSON; reuse the existing leak guards so player projections stay clean.
  - Model registry key/effort source: the existing model registry selection in the AI transport (registry key only, never raw provider IDs).
- **Data Contracts & State Flow**: transport decision → generation descriptor on commit metadata → validated reducer stamps it on the committed turn → diagnostic export reads turns. A failed save or rejected proposal records nothing as "retained success"; the existing `lastTurnRejection` diagnostic stays the rejection channel.

### Key Technical Decisions & Tradeoffs

- Per-turn optional metadata over a separate diagnostic ring: the turn is already the durable, revision-checked record, and old sessions need no migration. The ring alternative is only justified if budget tests show real inflation — measure first, decide from evidence.
- Enums and counts only: categories travel safely in GM-only exports; raw content never does.
- `unknown` is a first-class value: instrumentation gaps must be visible, not papered over.

### Failure, Edge & Cancellation Paths

- **Positive**: retained turn records `continued` with sizes; diagnostic shows thread reuse across a 100-turn fixture.
- **Negative**: provider failure → stateless fallback is classified as stateless (not retained); failed local save does not mark retained success; a rejected turn leaves no generation record on a committed turn.
- **Cancellation / Edge**: cancelled generation records nothing; reload classifies the next turn from actual transport state; legacy sessions export with `unknown` instead of guessed reasons.

---

## Decisions (Final — accepted by owner, 2026-11-23)

- **Settled by code (not judgement calls)**: ack-gated retained success already exists — `confirmGenerationInteraction` runs only after `repository.save` succeeds in `saveTurn` (`adventure-runtime.ts:210-231`), and scene changes clear the interaction there. Reset call sites today: rejected-turn retry (`adventure-turn-retry.ts:62`, wired in actions/opening/rolls), opening, and scene-boundary discard. Effort already exists as `reasoningEffort: low|medium|high|xhigh` (`packages/ai-engine/src/adventure-generation.types.ts:47`). Compact state budget is 32,000 chars (`session-budget.ts:3`) and does not include turn history, so per-turn metadata costs session-file bytes (~150/turn), not state-budget headroom.
- **Q1 — storage: SETTLED (per-turn field only)**. Optional `generation` on each committed turn; no diagnostic ring. It survives reload/export/delta, and legacy turns simply lack it.
- **Q2 — reset reason source: SETTLED (call-site supplied)**. Every reset/discard call passes its reason category; uninstrumented paths record `unknown`, never an inferred guess.
- **Q3 — model identity: SETTLED (registry key only)**. The LLM's registry key is resolved at capture time and stored; provider raw model strings/IDs never enter diagnostics. Missing mapping records `unknown`. (Rationale: verifies model-change resets, explains quality drift, feeds #5113 benchmarking.)
- **Q4 — Director-progress category: SETTLED (reuse #5110 verbatim)**. The existing meaningful-progress classification is stamped on the turn; one vocabulary for brief, diagnostics, and #5113 replays.
- **Q5 — summary surface: SETTLED (diagnostic JSON only)**. A bounded generation summary joins the existing summary block in full and delta GM-only diagnostic JSON; no separate summary surface.

## 3. Tasks & Execution Sequence (When)

- [x] **Task 1: Audit note** — See Decisions: reset/confirm call sites, effort values, and budget analysis recorded from code.
- [x] **Task 2: Tests (TDD)** — Engine generation-metadata (7), AI generation-info (5), web descriptor (8), diagnostic generation (5) tests, incl. legacy-absent, leak, and not-retained cases.
- [x] **Task 3: Engine** — Optional `generation` on committed turns + `CommitMetadata` plumbing; #5110 progress category classified in-engine verbatim.
- [x] **Task 4: Transport Instrumentation** — Descriptor from the actual transport decision; `modelKey` resolved at capture in the generation service (registry key, both transports default `luna-fast`); reset reasons wired at real call sites (rejected-turn, scene-boundary); ack-gated retained success untouched. Interaction `threadMode: continued` remains unrecorded (`unknown`) because the interaction context does not expose reuse — never guessed, per Q2.
- [x] **Task 5: Diagnostic Export + Note** — Full/delta per-turn metadata + bounded `summary.generation`; capture/interpret note in the diagnostic `_readme`.
- [x] **Task 6: Verification Gate** — `test:changed`, `lint:changed`, fallow (pass, 0 introduced), svelte-check 0 errors.

---

## 4. Verification Gate

```bash
bun run test:changed
bun run lint:changed
bunx fallow audit --format json --quiet --explain --gate-marker agent
```
