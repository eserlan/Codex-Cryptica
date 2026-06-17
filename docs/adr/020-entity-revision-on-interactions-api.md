# ADR 020: Entity Revision on the Gemini Interactions API

- **Status:** Accepted
- **Tracking issue:** [#1406](https://github.com/eserlan/Codex-Cryptica/issues/1406)
- **Builds on:** [ADR 018 — Server-Side Oracle Conversation State](018-oracle-server-side-conversation-state.md)
- **Implementation plan:** [`docs/proposals/1406-revision-interactions-api.md`](../proposals/1406-revision-interactions-api.md)

## Context and Problem Statement

Entity revision (`TextGenerationService.reviseEntityUpdate`) is **stateless**:
each run sends the stable system instruction plus a full user prompt — including
the entire `RELATED ENTITY CONTEXT` block — to the `oracle-proxy` worker, which
forwards it to Gemini's `:generateContent`.

Users revise in a **flow**, not in isolation: they iterate on one entity — adjust
the instruction, re-run, refine — and frequently revise neighbouring entities in
the same sitting. Every run re-uploads and re-pays for the same related-entity
thumbnails, even when nothing about those neighbours changed since the last call.

We want a revision **session** to retain already-sent related context server-side
so subsequent revisions of the same entity send only what changed, without
re-uploading the shared related block every time — and without giving up the
local-first model where the client owns the record.

## Decision Drivers

- Cut repeated Google-side token cost/latency and browser→worker payload from
  re-sending unchanged related-entity context on every revision.
- Reuse the Interactions + lore-delta machinery from ADR 018 rather than building
  a parallel mechanism.
- Keep per-call context **relevant**, not merely cumulative — a revision session
  must not balloon into unbounded history.
- Preserve the local-first model and keep user-supplied API keys off the worker.
- Hold the existing revision output contract (`{content, lore, categoryId}` JSON).

## Considered Options

- **Option 1: Status quo (stateless resend).** Every revision re-sends the full
  related block. Simple; pays the repeated-payload cost we want to remove.
- **Option 2: Client-side context cache only (hash/dedupe).** Reuse
  `entityContentHash` to cache assembled related context client-side. Saves
  assembly churn, but still re-uploads to the worker and gives no server-side
  continuity (the model never "keeps" what it already saw).
- **Option 3: Gemini `cached_content`.** Cache the stable related block by id.
  Cuts Google-side cost for the stable part, but adds cache lifecycle/TTL
  management and no cross-revision continuity.
- **Option 4: Entity revision on the Interactions API.** Treat one entity's
  revision session as one interaction thread (`store: true` +
  `previous_interaction_id`). Related context is delivered as `input` turns
  retained server-side; subsequent revisions send only the new instruction plus
  delta related-context. Reuses ADR 018's worker path, `LoreDeltaTracker`, and
  client wiring.

## Decision Outcome

Chosen option: **Option 4 — Entity revision on the Interactions API**, layered on
the ADR 018 infrastructure, with these scoping decisions:

- **Session = per entity, in memory.** The session key is the entity id; a
  `previousInteractionId` + a per-session `LoreDeltaTracker` live in memory for
  the revision workflow (not persisted). Repeated revisions of the same entity
  reuse its already-sent related context; a different entity, or a reload, starts
  a fresh thread. Chosen over an app-session scope for thread coherence and to
  avoid mixing unrelated revisions into one server-side history. (Cross-entity
  dedup remains a future option if metrics justify it.)
- **Hybrid context, not raw history.** `buildRelatedEntityContext` still decides
  _what is relevant_ for each revision; the `LoreDeltaTracker` decides _what still
  needs sending_ (skip what the thread already holds). Keeps each call both lean
  and relevant and prevents unbounded growth.
- **Unsaved entities stay stateless.** A revision of a new/draft entity with no
  stable id always uses the stateless path (no session key to thread on).
- **Proxy path only.** Sessions use Interactions only through the proxy; the
  custom-key direct path stays stateless. Same constraint as ADR 018.
- **Feature-flagged**, gated behind the same interactions flag. Falls back to the
  current stateless path when the flag, proxy path, or interaction id is
  unavailable (replay fallback on expiry).
- **Output contract unchanged.** The interaction `result.text` is parsed as the
  same `{content, lore, categoryId}` JSON the stateless path returns.

### Consequences

**Positive**

- Iterating on one entity sends its related context once instead of N times —
  meaningful payload/token savings in the common refine-in-place flow.
- Reuses ADR 018 machinery; no new transport or persistent state.
- Related-entity invalidation is already handled: related entities are vault
  entities, so the existing `InteractionSessionManager` vault-event eviction
  re-sends them when they change.

**Negative / risks**

- Adds an interaction-aware branch and per-entity session lifecycle to the
  revision service.
- Continuity is best-effort: an expired/invalid interaction id triggers a
  full related-context replay for that revision.
- Benefit is concentrated in repeated revisions of the same entity; a one-off
  revision sees little gain (acceptable — it behaves like today).
- Per-entity scope means context sent while revising entity A is not reused when
  revising entity B (intended trade-off for thread coherence).

## Validation

- Unit-test the partition/input logic (pure) the way `lore-delta` is tested.
- Re-use `apps/workers/oracle-proxy/scripts/verify-interactions.sh` to confirm the
  Interactions contract before enabling the flag.
- Measure prompt/token size across a representative session (revise one entity
  three times; revise an edited neighbour) with the flag on vs. off.
