# Implementation Plan: Entity Revision over the Gemini Interactions API

**Status:** Draft
**Date:** 2026-06-17
**Branch:** `1406-revision-interactions-api`
**Issue:** #1406
**Decision record:** [ADR 020](../adr/020-entity-revision-on-interactions-api.md) (the *why*; this doc is the *how*)
**Related:** ADR 018 (server-side conversation state), ADR 019 (generator sessions — sibling precedent), PR #1404 (related-context quality), `docs/proposals/revision-context-quality.md`
**Scope:** Route `reviseEntityUpdate` through the existing Interactions API flow so related-entity context is delta-sent (only new/changed) and threaded server-side, instead of re-sending the full related block on every revision.

## Problem

Entity revision (`TextGenerationService.reviseEntityUpdate`) is a stateless
`generateContent` call: the stable system instruction plus a full user prompt —
including the **entire** related-entity context block — is sent on every run.
When a user iterates on the same entity (tweaking instructions, re-running the
revise dialog), the same related-entity thumbnails are re-sent each time.

The chat path already solved this: it uses the **Gemini Interactions API**
(server-side conversation state via `previous_interaction_id`) and a
`LoreDeltaTracker` hash cache to send only lore the server hasn't seen. This
proposal applies the same pattern to revisions.

## Goals

- Reuse the existing Interactions infrastructure (`LoreDeltaTracker`,
  `InteractionSessionManager`, `sendInteraction`, expiry→replay) — no new
  transport, no new retention model.
- Send each related entity's context **once per revision session**; on later
  turns send only new/changed related entities plus a lightweight hint naming
  retained ones.
- Keep `@codex/oracle-engine` pure; app-specific session/flag concerns stay in
  the web service.
- Preserve current behaviour when off the proxy path (personal API key) or when
  the Interactions flag is disabled — fall back to stateless `generateContent`.

## Non-goals

- Changing the chat Interactions flow.
- Cross-entity context sharing (session is **per entity** — see Decisions).
- Persisting session state across reloads (in-memory only, per ADR 018).

## Decisions

- **Session scope: per entity.** `interactionSessions.getSession(entityId)`.
  Iterating on the same entity reuses its already-sent related context; distinct
  entities start cold. Chosen for thread coherence and low model confusion over
  the broader (app-session) dedup. Revising a new/unsaved entity (no stable id)
  always uses the stateless path.
- **Proxy-only + flag-gated**, identical to chat: requires `!apiKey` and
  `interactionSessions.enabled`.
- **Output contract unchanged**: parse `result.text` as `{content, lore, categoryId}`.

## Mapping (chat → revision)

| Chat concept | Revision equivalent |
|---|---|
| `conversationId` session key | entity id being revised |
| delta-tracked lore entries | the related-entity context (one `LoreEntry` per related entity) |
| `[USER QUERY]` | revision prompt core: ENTITY + CURRENT RECORD + NEW PASSAGE + INSTRUCTIONS |
| stable system instruction | `buildEntityRevisionSystemInstruction()` |
| `result.text` | the revision JSON payload |

---

## Implementation phases & tasks

Files:
- **SCHEMA** = `packages/schema/src/ai.ts`
- **ENGINE** = `packages/oracle-engine/src/revision-context.ts`
- **DELTA** = `packages/oracle-engine/src/lore-delta.ts`
- **SVC** = `apps/web/src/lib/services/ai/text-generation.service.svelte.ts`
- **MGR** = `apps/web/src/lib/stores/oracle/revision-manager.svelte.ts`
- **PROMPT** = `apps/web/src/lib/services/ai/prompts/entity-revision.ts`

### Phase 1 — Foundation: thread related-entity id + hash

> Lets each related entity become a delta-trackable `LoreEntry`.

- [ ] **T101** SCHEMA — add `id: string` to `RelatedEntityContext`.
- [ ] **T102** ENGINE — carry the internal candidate `id` into the
      `buildRelatedEntityContext` result (also update the local duplicate
      `RelatedEntityContext` interface in this file, or import schema's).
- [ ] **T103** ENGINE/DELTA — add `relatedToLoreEntries(related[])` →
      `{ id, snippet: formatted "<title> (<type>) [<relation>]: <summary>" block,
      hash: entityContentHash(summary) }`. Pure; worker-safe.
- [ ] **T104** ENGINE-TEST — `buildRelatedEntityContext` output includes `id`;
      `relatedToLoreEntries` produces stable hashes that change with summary.

### Phase 2 — Revision-shaped interaction input

> The structured revision prompt with the related block reduced to the delta.

- [ ] **T201** DELTA — `buildRevisionInteractionInput(promptCore, partition)`:
      emit `[RELATED ENTITY CONTEXT]` from `partition.newOrChanged` only, append a
      `[RELEVANT EARLIER RECORDS] …` hint for `partition.unchanged`, then the
      revision prompt core.
- [ ] **T202** PROMPT — refactor `buildEntityRevisionUserPrompt` so the related
      section can be supplied pre-filtered (or split out a `…Core` builder that
      omits the related block), enabling the delta path to inject only new ones.
- [ ] **T203** TEST — input contains only new/changed related entities; retained
      ones appear only in the hint line; prompt core (entity/incoming/instructions)
      is intact and still `u()`-wrapped.

### Phase 3 — `reviseViaInteraction`

> Mirror `generateViaInteraction` for the revision call.

- [ ] **T301** SVC — add `reviseViaInteraction(...)`: get per-entity session,
      partition related `LoreEntry`s, `sendInteraction({model, input,
      systemInstruction, previousInteractionId})`, on `InteractionExpiredError`
      reset + replay full related context once, then `commit` + parse JSON.
- [ ] **T302** SVC — in `reviseEntityUpdate`, branch into `reviseViaInteraction`
      when `interactionsEnabled && !apiKey && entity.id` present; else current path.
- [ ] **T303** SVC — `[Interactions] revision related sent x/total (n retained)`
      metric, matching the chat log.
- [ ] **T304** TEST — interaction path used when gated on; stateless path when a
      key is set / flag off / unsaved entity; expiry triggers single replay.

### Phase 4 — Wiring + invalidation

- [ ] **T401** MGR — pass `interactionsEnabled: interactionSessions.enabled`
      (and ensure the entity id reaches the service as the session key).
- [ ] **T402** Verify the existing `InteractionSessionManager` vault-event
      eviction already invalidates related entities on edit (they are vault
      entities); add a test asserting an edited related entity is re-sent.
- [ ] **T403** Confirm worker-scope caveat (per ADR 018) — revision runs on the
      main thread, so eviction subscription applies; note if not.

### Phase 5 — Validation & ship

- [ ] **T501** Run affected suites (engine revision-context, lore-delta,
      text-generation interactions, revision-manager).
- [ ] **T502** Manual: revise one entity twice in a session; confirm the second
      turn's proxy request omits already-sent related entities and names them in
      the hint; confirm output quality holds.
- [ ] **T503** Manual: edit a related entity mid-session; confirm it is re-sent.
- [ ] **T504** Status → Done; open/extend PR against `staging`.

## Dependency summary

```
Phase 1 ─▶ Phase 2 ─▶ Phase 3 ─▶ Phase 4 ─▶ Phase 5
```

## Risks

- **Per-entity sessions limit savings** to repeated revisions of the same entity.
  Acceptable first cut; app-session scope is a later option if metrics justify it.
- **Stale server-side context** if a related entity changes mid-session. Mitigated
  by per-turn body hashing (re-sends on hash change) + vault-event eviction.
- **Replay cost** on interaction expiry (full related context re-sent once).
  Bounded and identical to the chat path's handling.
