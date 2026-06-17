# Plan: Vault-Aware Generator Sessions → Gemini Interactions API

> **Tracking issue:** [#1359](https://github.com/eserlan/Codex-Cryptica/issues/1359)
> **ADR:** [019-generator-sessions-on-interactions-api](adr/019-generator-sessions-on-interactions-api.md)
> **Builds on:** [ADR 018](adr/018-oracle-server-side-conversation-state.md) ·
> [`docs/plan-oracle-interactions-api.md`](plan-oracle-interactions-api.md)

## Goal

Make a run of generations behave as one **session**: the faction, NPCs, item,
and locations a user creates become server-side context for the next generation,
so a rival faction is generated in light of what came before — without
re-uploading the stable world-context block each time. Reuse the Interactions
worker path and `LoreDeltaTracker` from ADR 018.

## Principles (from ADR 019)

- **Hybrid context:** vault-aware selection decides _what's relevant_; the delta
  tracker decides _what still needs sending_. History never grows unbounded.
- **Commit on accept, not on draft.** Only accepted entities enter the thread.
- **Proxy-only, in-memory, flagged off,** with a stateless replay fallback.

## Current touch-points

- `apps/web/src/lib/services/generators/ai-generator-gateway.ts` — single-shot
  `generateContent` via `aiClientManager`; today returns text only.
- `apps/web/src/lib/services/generators/generator-vault-context.ts` — builds the
  vault-aware context (source/neighbours/world sample/etc.).
- `apps/web/src/lib/components/generators/CampaignGeneratorModal.svelte` —
  `onGenerate` builds context + calls the service; `onSave` creates the entity and
  pushes a pending draft; accept/discard happen later via `RevisionService`.
- `packages/generator-engine/src/campaign-generator-service.ts` — orchestrates
  generation; gateway boundary (`AIGeneratorGateway`).
- Reuse: `packages/oracle-engine/src/lore-delta.ts` (`LoreDeltaTracker`,
  `entityContentHash`), the worker Interactions path, `client-manager` proxy
  interaction wiring (all from the merge).

## Phases

### Phase 0 — Spike & contract (de-risk)

- [ ] 0.1 Run `apps/workers/oracle-proxy/scripts/verify-interactions.sh` with a
      live key; confirm `previous_interaction_id` retains generator `input` turns
      and the `{ id, text }` shape (shared with ADR 018; do once).
- [ ] 0.2 Confirm a generator prompt works as an interaction `input` turn (same
      `system_instruction` / `generation_config` we send today).

### Phase 1 — Session scaffolding (no behaviour change)

- [ ] 1.1 `GeneratorSession` holder (in-memory): `previousInteractionId?`,
      a `LoreDeltaTracker`, and a `worldSynced` flag. Lives for the generator
      workflow; reset on close/vault-switch.
- [ ] 1.2 Decide session granularity: per generator-workflow open vs. per vault
      while the panel is mounted. Default: **per workflow session**, surviving
      multiple generations until the modal flow is dismissed/reset.
- [ ] 1.3 Unit tests for the session/delta selection logic (pure), mirroring
      `lore-delta.test.ts`.

### Phase 2 — Interaction-aware gateway path (flagged)

- [ ] 2.1 Extend `AIGeneratorGateway.complete` (or add `completeInteractive`) to
      accept `{ previousInteractionId?, store }` and return `{ text, interactionId? }`,
      mirroring the oracle proxy interaction path. Keep the stateless signature
      working when the flag is off.
- [ ] 2.2 In `generator-vault-context`, split context into **stable** (theme,
      campaign date, world sample, ban list) and **dynamic** (source entity,
      instruction). On the first session turn send everything; subsequently send
      only delta lore (via the tracker) + dynamic.
- [ ] 2.3 Wire the modal/service to pass `previousInteractionId` and store the
      returned id back on the session. Preserve banned-name retry semantics
      (retries reuse the held context instead of re-sending the full prompt).
- [ ] 2.4 Replay fallback: on invalid/expired id, resend full context once and
      resume delta mode (reuse ADR 018 fallback shape).

### Phase 3 — Commit on accept

- [ ] 3.1 On accept (`RevisionService.acceptDraft` for a generator draft), commit
      the finalized entity to the session tracker so it's canonical context for
      the next generation. On discard, commit nothing.
- [ ] 3.2 Invalidate a committed entity if it's later edited in the session
      (reuse the event-driven lore invalidation added in ADR 018).

### Phase 4 — Measure & enable

- [ ] 4.1 Instrument prompt/token size per generation; compare a representative
      session (faction → 4 NPCs → item → 4 locations → rival faction) flag on/off.
- [ ] 4.2 Enable behind the interactions flag once 0.1 passes and savings are
      confirmed; document in ADR 019.

## Non-goals

- Streaming (dropped for oracle in ADR 018; flash-lite is fast enough).
- `cached_content` (separate optimization; can layer on later for the stable block).
- Persisting sessions across reloads (in-memory only, by design).
- Changing the custom-key direct path (stays stateless).

## Open questions

- **Session scope/UX:** is a session the modal-open lifetime, or a longer
  "generation flow" the user can explicitly start/stop? (affects 1.2)
- **Cross-type relevance:** when generating an item after NPCs, how much of the
  NPC context should the vault-aware selector pull vs. rely on thread history?
- **Reset affordance:** do we expose a visible "new session" control, or reset
  implicitly on vault switch / modal close?
