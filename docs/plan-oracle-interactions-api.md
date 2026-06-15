# Plan: Oracle Chat → Gemini Interactions API + Lore Delta Tracking

> **Tracking issue:** [#1357](https://github.com/eserlan/Codex-Cryptica/issues/1357)
> **ADR:** [018-oracle-server-side-conversation-state](adr/018-oracle-server-side-conversation-state.md)
> **Branch:** `feature/oracle-interactions-api` (base: `staging`)

## Goal

Move oracle chat onto Gemini's **Interactions API** (server-side conversation
state via `store: true` + `previous_interaction_id`) so we stop re-uploading
the full chat history and the full `[VAULT LORE CONTEXT]` on every turn. Lore is
delivered as **user `input` turns** (which Gemini retains as history), and the
client tracks what it has already sent so each turn ships only **new or changed**
lore.

## Background / verified facts

- **Endpoint:** `POST https://generativelanguage.googleapis.com/v1beta/interactions`
  (snake_case body). Fits the worker's existing raw-REST style; no SDK required
  (`@google/genai` ≥ 1.33.0 also exposes `ai.interactions.create`).
- **Request:** `{ model, input, system_instruction, generation_config, store,
previous_interaction_id, cached_content?, stream? }`. `input` is just the new turn.
- **Response:** `{ id, status, steps: [{ type: "model_output", content: [{ type:
"text", text }] }], usage }`. Output text at `steps[].content[].text`; keep `id`
  for the next turn's `previous_interaction_id`.
- **What `previous_interaction_id` carries:** conversation history only (inputs +
  outputs). `system_instruction`, `generation_config`, `tools` are
  **interaction-scoped** → re-sent every turn.
- **Retention (rolling window, not storage):** paid 55 days, free tier 1 day.
- **Streaming:** supported via `stream: true` (SSE: `step.delta`,
  `interaction.completed`).

### Current code touch-points

- `apps/workers/oracle-proxy/src/index.ts` — stateless worker, forwards full
  `contents` to `:generateContent` (line ~339), returns full JSON.
- `apps/web/src/lib/services/ai/client-manager.ts` — `createProxyModel` hand-rolls
  the proxy request/response and **fakes streaming** (single chunk).
- `apps/web/src/lib/services/ai/text-generation.service.svelte.ts` — `generateResponse`
  builds `sanitizedHistory` (sliding window, lines ~641-700) and injects
  `[VAULT LORE CONTEXT]` (line ~710).
- `apps/web/src/lib/services/ai/context-retrieval.service.ts` — `retrieveContext`
  builds lore per-entity in `contextMap` and returns `sourceIds: string[]` +
  flattened `content`.

### Decisions locked in

- **Proxy path only** gets Interactions state; **custom-key direct path stays
  stateless** (full history), keeping user keys off the worker.
- **`sentLore` + `previousInteractionId` are in-memory** (not persisted): on reload
  the conversation restarts and full lore re-syncs. Avoids pointing at expired ids.
- **Local history remains the source of truth**; the interaction id is an
  optimization with a replay fallback.

---

## Status — SHIPPED (merged to staging 2026-06-16)

All phases complete. Feature is **on by default** for the system proxy path.
Key decisions made during implementation:

- **Hash field**: changed from `lore + content + connections` to `entity.content`
  only (`entityContentHash`). The long `lore` field is lazy-loaded and not always
  hydrated on first access, causing spurious mismatches. `content` is always
  hydrated and stable.
- **Phase 4 (streaming): dropped.** `gemini-3.1-flash-lite` is fast enough;
  worker returns `{ id, text }`.
- **Phase 5.3 (`cached_content`): deferred** as a stretch optimization.
- **Phase 0.2/0.3**: verified end-to-end in a live browser session across 6 turns;
  stale-id detection updated to catch HTTP 400 in addition to 404.

## Phase 0 — Spike & contract (de-risk)

- [x] 0.1 Confirm the target model supports Interactions (worker default is
      `gemini-3.1-flash-lite`; docs use `gemini-3-flash-preview` / `gemini-3.5-flash`).
      Bump default if needed.
- [ ] 0.2 Manual `curl` against `/v1beta/interactions`: one create, then a second
      call with `previous_interaction_id`; confirm history is retained and
      `steps[].content[].text` shape.
- [ ] 0.3 Confirm behavior when `previous_interaction_id` is expired/invalid
      (error code/shape) — drives the replay fallback in Phase 3.
- [x] 0.4 Decide `system_instruction` handling (re-sent each turn; keep minimal).

**Exit:** documented request/response contract + the id-expiry error signature.

## Phase 1 — Lore delta tracker (client, no API change)

Independently testable; no behavior change until wired in Phase 3.

- [x] 1.1 Extend `retrieveContext` (or add a sibling) to return per-entity entries
      `{ id, snippet, hash }` in addition to the joined `content`. Hash
      `entity.content` only (`entityContentHash`) — the always-hydrated short
      field. Hashing `lore + content` was tried but discarded: `lore` is
      lazy-loaded and absent on first access, producing false "changed" signals.
- [x] 1.2 Add `LoreDeltaTracker`: holds `sentLore: Map<entityId, hash>`; given the
      current entries returns `{ newOrChanged, unchanged }` partitions.
- [x] 1.3 Treat the global art-style block (line ~193) as a synthetic id
      `__style__` so it follows the same send-once / resend-on-change rule.
- [x] 1.4 Emit a one-line **relevance hint** for unchanged-but-relevant titles
      (e.g. "Relevant earlier records: Aldric, Ravenhold") to preserve focus
      without resending bodies.
- [x] 1.5 `commit(entries)` to merge new/changed hashes after a successful send;
      `reset()` to clear on expiry/new conversation.
- [x] 1.6 Unit tests: new entity included; unchanged stripped; edited entity
      (lore/content/connection) detected as changed; active-file toggle does **not**
      force resend; style block cached.

**Exit:** tracker green in isolation.

## Phase 2 — Worker Interactions path

- [x] 2.1 Add an `interactions` request mode to the worker: POST to
      `/v1beta/interactions` with `{ model, input, system_instruction,
generation_config, store: true, previous_interaction_id }`.
- [x] 2.2 Normalize the response to `{ id, text }` (extract `steps[].content[].text`).
- [x] 2.3 Keep the existing `:generateContent` path intact as the retention-expiry
      fallback; gate the new path behind a request flag so current flow is unchanged.
- [x] 2.4 Preserve CORS / origin checks / rate-limit structure; drop only the
      now-unneeded camelCase→snake_case mapping for the interactions path.
- [x] 2.5 Echo back only the id to the creating client; do not accept arbitrary
      cross-client ids beyond passthrough.
- [x] 2.6 Worker tests: create returns id+text; follow-up with
      `previous_interaction_id` works; expired id surfaces a typed error.

**Exit:** worker can run a stateful multi-turn exchange end-to-end.

## Phase 3 — Client wiring (proxy path)

- [x] 3.1 Add `previousInteractionId` to the oracle conversation/session state
      (in-memory) alongside the tracker.
- [x] 3.2 In `createProxyModel` / `generateResponse`, when on the proxy path:
      send `input` = user query + new/changed lore + relevance hint +
      `previous_interaction_id`, instead of full `sanitizedHistory` + full lore.
- [x] 3.3 On response: store returned `id`; call `tracker.commit(...)`.
- [x] 3.4 **Replay fallback:** on id-invalid/expired error, `tracker.reset()`,
      clear `previousInteractionId`, resend full local history + full lore once,
      then resume delta mode.
- [x] 3.5 Keep `text-generation.service` consumer loop unchanged
      (`for await chunk.text()`), so downstream code is untouched.
- [x] 3.6 Leave custom-key direct path on the existing stateless flow.

**Exit:** proxy chats run multi-turn with only deltas on the wire.

## Phase 4 — Streaming (DROPPED — fast model, see Status)

- [ ] 4.1 Worker: `stream: true`, pipe SSE (`step.delta` / `interaction.completed`)
      back as a `ReadableStream`.
- [ ] 4.2 Client: replace the fake single-chunk proxy stream with a real SSE reader
      yielding incremental `chunk.text()`.
- [ ] 4.3 Verify keyless users get token-by-token output.

## Phase 5 — Staleness & cache hardening (optional)

- [x] 5.1 Subscribe `LoreDeltaTracker` to `appEventBus` entity-update events to
      proactively evict changed ids (belt-and-suspenders over hashing).
- [x] 5.2 Restart-on-major-change policy: drop `previous_interaction_id` and
      resync when the vault has materially changed since the priming turn.
- [ ] 5.3 (Stretch) Use `cached_content` for the truly-stable system instruction /
      style block to cut Google-side cost further.

## Phase 6 — Rollout

- [x] 6.1 Feature-flag the Interactions path (shipped on by default for proxy path).
- [x] 6.2 Log delta sizes (bytes saved / turn) and id-expiry replay frequency.
- [ ] 6.3 Validate retention edge cases (free-tier 1-day expiry mid-session).
- [x] 6.4 Update `docs/ARCH_ORACLE.md` with the stateful flow + fallback.

---

## Risks / open questions

- **Staleness:** server history is immutable; edited lore must be re-sent as an
  update turn (hash-driven) — covered by Phase 1.1/1.6 + Phase 5.
- **Emphasis loss:** stripping unchanged lore removes per-turn emphasis; mitigated
  by the relevance hint (1.4). Validate answer quality on follow-ups.
- **Retention vs. long sessions:** free-tier 1-day window will force periodic
  replay; ensure fallback (3.4) is seamless.
- **Model compatibility / default bump** (0.1) may have its own cost/latency
  profile — confirm before flipping the flag.
- **Token growth server-side:** history accumulates over long convos; rely on
  implicit caching and monitor `usage` (6.2).

## Sources

- Interactions API overview — https://ai.google.dev/gemini-api/docs/interactions/interactions-overview
- Interactions API reference — https://ai.google.dev/api/interactions-api
- Migrating to the Interactions API — https://ai.google.dev/gemini-api/docs/migrate-to-interactions
- Quick start (philschmid) — https://www.philschmid.de/interactions-api-quickstart
