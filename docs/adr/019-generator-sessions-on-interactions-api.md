# ADR 019: Vault-Aware Generator Sessions on the Gemini Interactions API

- **Status:** Proposed
- **Builds on:** [ADR 018 — Server-Side Oracle Conversation State](018-oracle-server-side-conversation-state.md)
- **Implementation plan:** [`docs/plan-generator-interactions.md`](../plan-generator-interactions.md)

## Context and Problem Statement

The in-app campaign generators (NPC, faction, settlement, item, event) are
**single-shot**: each generation builds a fresh, vault-aware prompt — full source
entity, neighbours, a search-ranked world sample, theme, campaign date, ban list,
template — and POSTs the whole ~8–9 KB block to the `oracle-proxy` worker, which
forwards it to Gemini's `:generateContent`.

In practice users generate in a **flow**, not in isolation: a faction, then a few
NPCs within it, an important item, a location or two, then a rival faction. Each
step is highly relevant context for the next. Today that continuity is achieved
only indirectly — an accepted entity lands in the vault, so the _next_
generation's search may surface it — and every call still re-uploads and re-pays
for the unchanged bulk of world context.

We want a generation **session** to accumulate context server-side so each
subsequent generation is informed by the prior ones, without re-uploading the
shared world context every time.

## Decision Drivers

- Make sequential generations **aware of each other** (continuity) so a rival
  faction is generated in light of the faction and NPCs just created.
- Cut repeated Google-side token cost/latency and browser→worker payload from
  re-sending the stable world-context block on every generation.
- Reuse the Interactions + lore-delta machinery from ADR 018 rather than building
  a parallel mechanism.
- Preserve the local-first model and keep user API keys off the worker.
- Keep per-call context **relevant**, not just cumulative — a long session must
  not balloon into an unbounded, mostly-irrelevant history.

## Considered Options

- **Option 1: Status quo (stateless, vault-aware per call).** Every generation
  re-sends full world context; continuity only via the vault/search on the next
  call. Simple; pays the repeated-payload cost and gives no true model continuity.
- **Option 2: Client-side context cache only (hash/dedupe).** Reuse
  `entityContentHash` to cache the assembled context client-side. Saves assembly
  work and browser memory churn, but still re-uploads to the worker and gives no
  server-side continuity.
- **Option 3: Gemini `cached_content`.** Cache the stable world block and
  reference it by id. Cuts Google-side cost for the stable part, but adds cache
  lifecycle/TTL management and still no cross-generation continuity.
- **Option 4: Generator sessions on the Interactions API.** Treat one generator
  session as one interaction thread (`store: true` + `previous_interaction_id`).
  World context and each **accepted** entity are delivered as `input` turns
  retained server-side; subsequent generations send only the new instruction plus
  delta lore. Reuses ADR 018's worker path, `LoreDeltaTracker`, and client wiring.

## Decision Outcome

Chosen option: **Option 4 — Generator sessions on the Interactions API**, layered
on the ADR 018 infrastructure, with these scoping decisions:

- **Hybrid context, not raw history.** Vault-aware selection (search + world
  sample) still decides _what is relevant_ for each generation; the
  `LoreDeltaTracker` decides _what still needs sending_ (skip what the thread
  already holds). This keeps each call both lean and relevant and prevents
  unbounded history growth from dominating the prompt.
- **Session = thread, in memory.** A `previousInteractionId` + a per-session
  `LoreDeltaTracker` live in memory for the duration of the generator workflow
  (not persisted). A new session (or a reload) starts a fresh thread and
  re-syncs context on the first generation.
- **Commit on accept, never on draft.** A generated entity is committed to the
  thread (as a lore `input` turn) only when the user **accepts** the proposal.
  Discarded drafts never pollute the session's context.
- **Proxy path only.** Sessions use Interactions only through the proxy; the
  custom-key direct path stays stateless. Same constraint as ADR 018.
- **Feature-flagged, off by default**, gated behind the same interactions flag and
  the pending live verification (`verify-interactions.sh`). Falls back to the
  current stateless, vault-aware path when the flag or interaction id is
  unavailable (replay fallback).

### Consequences

**Positive**

- Sequential generations gain genuine continuity; later entities reference
  earlier ones coherently.
- Significant payload/token savings in multi-generation sessions (the common
  flow), where the stable world block is sent once instead of N times.
- No new persistent state; reuses ADR 018 machinery.

**Negative / risks**

- Adds session lifecycle to the generator flow (start/reset/commit) and an
  interaction-aware branch in the generator gateway.
- Continuity is best-effort: an expired/invalid interaction id triggers a
  full-context replay for that generation.
- Benefit is concentrated in active sessions; a single one-off generation sees
  little gain (acceptable — it simply behaves like today).
- Accept-time commit means a generation references only _accepted_ predecessors,
  not drafts still under review (intended, but worth documenting).

## Validation

- Unit-test the session/delta logic (pure) the way `lore-delta` is tested.
- Re-use `apps/workers/oracle-proxy/scripts/verify-interactions.sh` to confirm the
  Interactions contract before enabling the flag.
- Measure prompt/token size across a representative session (faction → NPCs →
  item → locations → rival faction) with the flag on vs. off.
