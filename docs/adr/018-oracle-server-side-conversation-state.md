# ADR 018: Server-Side Oracle Conversation State via Gemini Interactions API

- **Status:** Accepted
- **Tracking issue:** [#1357](https://github.com/eserlan/Codex-Cryptica/issues/1357)
- **Implementation plan:** [`docs/plan-oracle-interactions-api.md`](../plan-oracle-interactions-api.md)

## Context and Problem Statement

Oracle chat is stateless today. Every turn re-uploads the full sliding-window
chat history plus the full `[VAULT LORE CONTEXT]` block to the proxy, which
forwards it to Gemini's `:generateContent`. Most traffic goes through the
Cloudflare `oracle-proxy` worker (system key), so the repeated history + lore
payload is paid for, re-processed, and re-transmitted on every message.

We want to stop re-sending the same data each turn without giving up the
local-first model where the client owns conversation history.

## Decision Drivers

- Cut repeated Google-side token cost/latency from re-sent history and lore.
- Cut browser→worker payload from re-uploading history every turn.
- Preserve local-first guarantees (offline, client owns history).
- Keep user-supplied API keys off the worker.
- Minimize architectural surface and new persistent state.

## Considered Options

- **Option 1: Status quo (stateless resend).** Keep sending full history + lore
  each turn. Simple, but pays the repeated-payload cost we're trying to remove.
- **Option 2: New `@google/genai` SDK / `chats` interface.** Modern SDK, but
  `chats` is client-side sugar that still re-sends full history under the hood —
  does not solve the problem.
- **Option 3: Gemini explicit context caching (`cached_content`).** Caches the
  stable lore/system-instruction to cut Google-side cost. Helps billing/latency
  but not browser→worker payload, and adds cache lifecycle/TTL management.
- **Option 4: Stateful proxy (Durable Object stores history).** Worker owns
  conversation state; client sends only a delta. Solves payload, but reimplements
  thread storage on top of stateless Gemini and introduces multi-device/offline
  sync conflicts with the local-first source of truth.
- **Option 5: Gemini Interactions API (`store: true` + `previous_interaction_id`).**
  Gemini retains conversation history server-side; the client sends only the new
  `input` plus the prior interaction id. Lore delivered as user `input` turns is
  retained as history, so a client-side delta tracker can ship only new/changed
  lore.

## Decision Outcome

Chosen option: **Option 5 — Gemini Interactions API**, with a client-side
**lore delta tracker** and these scoping decisions:

- **Proxy path only** adopts Interactions state; the **custom-key direct path
  stays stateless** so user keys never transit the worker.
- **`previousInteractionId` + `sentLore` map are in-memory**, not persisted. On
  reload the conversation restarts and lore re-syncs on the first turn, avoiding
  stale/expired-id handling at startup.
- **Local history remains the source of truth.** The interaction id is an
  optimization with a **replay fallback**: on an invalid/expired id we resend full
  history + lore once, then resume delta mode.
- Lore is sent as user `input` turns; a per-entity **content hash** (stable body
  only — excluding the volatile `[ACTIVE FILE]` marker) decides new vs. changed
  vs. unchanged, so only deltas go on the wire.

Phasing, tasks, and code touch-points are in the linked implementation plan.

## Consequences

### Positive

- Stops re-sending prior chat turns (Google-side) and, with the delta tracker,
  unchanged lore (both sides). Improves implicit caching per Google's guidance.
- No new persistent storage; local-first guarantees intact.
- User keys stay off the worker; rollout is feature-flaggable and incremental.
- Composes with later streaming (`stream: true`, SSE) and `cached_content`.

### Negative / risks

- **Server-side history is immutable**, so edited lore must be re-sent as an
  update turn (hash-driven) — added complexity in the tracker.
- **Retention is a rolling window** (free tier 1 day, paid 55 days); long sessions
  will periodically hit expiry and trigger the replay fallback.
- Stripping unchanged lore removes per-turn emphasis; mitigated with a lightweight
  "relevant earlier records" hint, whose answer-quality impact must be validated.
- Requires a model that supports Interactions; the current proxy default
  (`gemini-3.1-flash-lite`) may need bumping.
