# Research: Contextual AI Help Assistant (Spike)

**Feature**: `3427-contextual-ai-help-assistant` | **Date**: 2026-09-30

Each item resolves a design question from issue #3427 or a finding from reading the codebase. Facts below were checked against the repo on this branch.

## Findings that change the spec

### F1 — "Add Connection" is on the Status tab, not the Connections tab

`apps/web/src/lib/content/help/connections-tab.md` states the Connections tab is a read-only one-step picture ("Nothing here is stored twice… built from the same connections you manage in the **Status** tab"). The control that creates a connection is the `ADD` button (`aria-label="Add new connection"`) in `DetailStatusTab.svelte`, which opens `ConnectionCreator.svelte`.

**Consequence**: the spike's headline scenario is better than the issue assumed. A user on Settlement → Connections asks how to connect a faction; a correct answer is "switch to the Status tab and use Add", so the demonstrable guidance is `openPanel(status-tab)` followed by `highlight(add-connection-button)`. The spec (Story 2, FR-020, Story 1 scenario text) is updated to say this. A context-blind assistant would wrongly say "click Add on this tab".

### F2 — There is no feature-flag system

No `featureFlag` / `isFeatureEnabled` mechanism exists in `apps/web`. The spike gate is on at staging (run-time hostname check via the existing `IS_STAGING`, because the staging web build is promoted to production unchanged, so a build-time flag set for staging would also enable production), or where `VITE_HELP_ASSISTANT` is "true" (default off; the repo reads `import.meta.env.VITE_*`, e.g. `VITE_ORACLE_PROXY_URL`) combined with the existing `discoveryPolicyStore.aiDisabled` check. Adding a general flag framework is out of scope (Constitution III).

### F3 — The Worker already has most of the substrate

`apps/workers/oracle-proxy` already provides: a provider-neutral LLM pipeline (`llm/registry.ts`, `resolver.ts`, `handle-operation-request.ts`) with `structured-generation` and Luna→Gemini fallback; capability-token session guard (`session-guard.ts`) with burst and per-minute rate limiters; a Workers AI binding (`[ai]`); a D1 binding (answer aggregates, spec 164); structured observability (`llm/observability.ts`); and CORS. `index.ts` is 1,172 lines, so per Constitution XIV the new route goes in a new module with a one-line dispatch.

### F4 — A client analytics layer exists; the help assistant must not use it

`apps/web/src/lib/services/analytics/*` (Zaraz-based) exists for marketing and discovery surfaces. Per the vault privacy boundary and clarified FR-027/FR-028, the Help panel (inside the authenticated app) MUST NOT call any of it. Metrics are emitted server-side only.

### F5 — "AI enabled" is the existing AI Disabled setting

The app already gates AI through `discoveryPolicyStore.aiDisabled` (Settings → AI → "AI Disabled"), which the Oracle chat, Proposer and revision flows all check. The Worker holds the provider keys and requests are authorised by the existing capability session token (`ensureSessionManager`), so no user-supplied key is required. The Help panel reuses exactly this: it is available when the flag is on **and** `aiDisabled` is false. When AI is disabled, or the flag is off, users see static help only (FR-030). No new quota, key, or billing path (FR-030a). The existing `ai-disabled.spec.ts` pattern (network silence when disabled) is the model for the help e2e check.

## Decisions

### D1 — Retrieval: registry-first + lexical for the spike; D1/Vectorize designed, not built

- **Decision**: Retrieval is a deterministic, context-aware pipeline in a framework-free package: (1) filter registry entries by route template, feature ID, entity kind; (2) score help chunks with a small in-process lexical ranker (BM25-style over title, headings, body), boosted by context match; (3) take the top N. The knowledge bundle is generated at build time from the registry and `content/help/*.md` and shipped with the Worker. D1 schema and Vectorize metadata are **specified** in `contracts/knowledge-store.md` and validated offline, not deployed.
- **Rationale**: The proof-of-concept corpus is 5 registry entries and ~40 help articles (roughly 150–250 chunks). At that size, vectors cost operational surface (two new resources, per-environment isolation, a sync workflow) for unproven recall gain. The issue asks to _validate_ D1 + Vectorize; an offline evaluation harness (Task group in `tasks.md`) measures recall@3 on the 20-question set for lexical-with-context versus embeddings (Workers AI, already bound) so the decision to add Vectorize is data-driven. Registry-first also handles the deterministic questions the arch doc calls out ("what can I do here?", "can settlements have connections?") without semantic search.
- **Alternatives**: D1 + Vectorize now (arch doc preference; deferred until the evaluation shows lexical+context recall is insufficient or the corpus outgrows a bundle); Cloudflare AI Search (managed; less control over feature IDs, route and entity-kind filters, and action validation, and ranking signals cannot include live UI context — kept as the documented fallback if the ingestion pipeline becomes a burden); D1 FTS5 (adds a resource for no gain at this size).
- **Follow-on trigger**: introduce D1 + Vectorize when any holds: corpus > ~2,000 chunks, bundle > ~1 MB, lexical recall@3 < 0.85 on the evaluation set, or help content needs updating without a Worker deploy.

### D2 — Registry format: typed TypeScript modules

- **Decision**: One module per feature in `packages/help-engine/src/registry/features/`, typed by a Zod schema, with cross-reference validation (help IDs exist in `content/help`, action targets exist in the control catalogue, related features exist) run as a unit test and in the bundle build.
- **Rationale**: No new parser dependency; the compiler and Zod catch shape errors; data modules are exempt from the size trigger (Constitution XIV.4) yet still one catalogue per file. Help prose stays in Markdown and is **referenced** by `helpId`, never copied (FR-013).
- **Alternatives**: YAML (arch doc example) would add a parser dependency to the framework-free package (the web app already uses `js-yaml` for help front matter, but the package should stay dependency-light) and gives weaker editor checking; JSON loses comments and type inference. The bundle build can emit JSON or YAML later for the future sync pipeline without changing authoring.

### D3 — Package boundary: new `packages/help-engine`

- **Decision**: Framework-free workspace package holding the context schema, registry schema and entries, action catalogue and validator, retrieval ranker, prompt builder and model-response validator. The Worker and the web app both import it.
- **Rationale**: Constitution I (library-first), and it keeps trust-boundary validation (context sanitising, action allow-list) in one tested place that both sides run. Coverage goal for a new package is 70% (Constitution X).

### D4 — Worker orchestration: new route over the existing LLM pipeline

- **Decision**: `POST /api/help/ask` in a new `help.ts` module, dispatched from `index.ts` with one line. It reuses the session guard, rate limiters, and resolver, calling a new registry operation `help-answer` (structured output, Luna primary, Gemini fallback, `reasoningEffort: "low"` (Luna rejects "minimal"), added to `llm/types.ts` and `llm/registry.ts` with registry tests) with a response schema `{ answer, sourceIds, actionId | null, confidence }`. The model picks from candidate actions the retriever supplies; the Worker validates and expands the chosen action ID into the full typed action. The model never emits selectors, routes, or code.
- **Rationale**: Reuses auth, abuse limits, provider fallback and observability with no new credentials. Returning an `actionId` from a server-supplied candidate list (rather than free-form action JSON) makes FR-017 structural, not a check after the fact.
- **Alternatives**: free-form action JSON validated after generation (weaker; arch doc shape); a separate Worker (new deployment, secrets, CORS for no benefit).

### D5 — Prompt and grounding

- **Decision**: System prompt fixes the role (product guide only), forbids mentioning features absent from supplied sources, requires citing `sourceIds` from the supplied set, and declares retrieved text and user text as data. Sources are labelled blocks; the model is told to answer `confidence: "none"` when sources do not cover the question. The Worker drops any cited ID not in the supplied set, and if no valid citation remains on an `answered` response it downgrades to `no-match`.
- **Retrieval limits**: top 3 chunks, ≤ 450 tokens each; conversation history ≤ 4 turns / ≤ 600 tokens; question ≤ 500 characters.
- **Rationale**: Delivers FR-002/FR-004/FR-022/FR-026 mechanically: grounding is enforced after generation, not only requested in the prompt.

### D6 — Confidence and no-match threshold

- **Decision**: Retrieval reports a word-overlap **relevance** (BM25 scaled to 0–1, plus a small bonus when a chunk belongs to a feature on the current screen). Below `MIN_RELEVANCE` = **0.30** the Worker skips the model and returns the no-match answer with the closest help topics. Which chunks are shown is decided by a separate ranking **score** (relevance plus context boosts), and a shown chunk needs at least half the floor.
- **Why two numbers**: screen context must be able to reorder results but must not make a weak match look strong. Word overlap alone undersold the plainly-relevant on-screen chunks (0.29 for the headline question, because "faction" and "created" appear in no Connections article), so the floor judges answerability and the score picks the evidence.
- **Measured on the real 38 articles** (`bun run eval`): in-scope questions score 0.35 or more, out-of-scope ones 0.27 or less. The 0.08 gap is thin, and the floor was tuned on the same 30 questions, so it needs a larger, independent set before it is trusted (see findings).
- **Rationale**: Story 3 is best served by a deterministic floor, not a model's self-assessment. It also saves cost and latency for off-topic questions.

### D7 — Context packet: versioned schema, strict, route template only

- **Decision**: `HelpContextV1` (Zod, `.strict()`): `v`, `routeTemplate` (from SvelteKit `page.route.id`, e.g. `/(app)/vault/[entityId]`), `area`, `entityKind` (category ID, not a name), `tab`, `mode`, `surface` (`vault` | `public`; the spike only produces `vault`, `public` is reserved for later expansion), `flags[]` (allow-listed), `availableActions[]` (allow-listed IDs). The client builds it from a single `HelpContextStore` whose inputs are each explicitly registered; the Worker re-validates with the same schema and rejects or strips unknown keys and any route segment that is not a template token.
- **Rationale**: FR-007..FR-010. `.strict()` makes additions a reviewed schema change. Route templates come from the router, so identifiers cannot leak by construction.
- **Entity kind**: user-defined categories could carry names. Only built-in category IDs are sent; custom categories are sent as `custom`.

### D8 — Safe actions and highlighting

- **Decision**: Five action types (`navigate`, `openHelp`, `openPanel`, `highlight`, `openGenerator`). Targets come from a closed catalogue of control IDs declared in `help-engine` and realised in the UI by a `data-help-target="<id>"` attribute on the real control. `HelpHighlightService` (web) resolves the attribute at run time, applies a non-colour-only ring + visible label, announces via a polite live region, honours `prefers-reduced-motion`, and removes itself on click-away, Escape, or timeout. A missing target fails quietly (FR edge case). User acceptance is required before anything runs (FR-019).
- **Sequencing for the spike scenario**: the offered action is a two-step `openPanel` (Status tab) then `highlight` (add-connection-button); the catalogue supports an `after` link of at most one step so the spike stays within "zero or one proposed action" as a single offered guide.
- **Alternatives**: CSS selectors from the model (rejected, arch doc §13); a tour library (new dependency, for one highlight).

### D9 — Metrics: structured Worker log line only

- **Decision**: One structured log line per request (`help.request`) containing `outcome`, `latencyMs`, `featureArea`, and a count via the log itself; no IDs, no content, no IP-derived keys beyond the rate-limit key the platform already uses transiently. Uses the Worker's existing observability (`[observability.logs]`, already enabled). "Action accepted" is not measured (clarification).
- **Alternatives**: Workers Analytics Engine (new binding; unnecessary for a spike); client events (forbidden by FR-028).

### D10 — Latency target and streaming

- **Decision**: Targets: first visible feedback within 300 ms (client-side pending state), complete answer ≤ 8 s at p90. The response is one structured JSON object, not streamed.
- **Rationale**: Streaming a JSON object with sources and a validated action is awkward, and sources/action must be validated before display. SC-004 is amended from "first part of the answer within 3 s" to these two measurable points. Streaming the prose field is a follow-up if the 8 s p90 is missed.

### D11 — Cost estimate (one help interaction)

Typical prompt ≈ 2,000 input tokens (system ≈ 400, context ≈ 150, 3 chunks ≈ 1,000, history ≈ 300, question ≈ 50) and ≈ 250 output tokens. Using registry pricing:

| Model                        | Input                 | Output                     | Per interaction | Per 10,000 |
| ---------------------------- | --------------------- | -------------------------- | --------------- | ---------- |
| Luna (`luna-fast`, default)  | 2 × $0.001 = $0.0020  | 0.25 × $0.006 = $0.0015    | ≈ $0.0035       | ≈ $35      |
| Gemini Flash Lite (fallback) | 2 × $0.0003 = $0.0006 | 0.25 × $0.0025 = $0.000625 | ≈ $0.0012       | ≈ $12      |

No-match questions short-circuit before the model (D6) and cost $0. Luna reasoning tokens may raise output; the `help-answer` operation sets `reasoningEffort: "low"` (Luna rejects "minimal"). To be re-measured in the spike.

### D12 — Knowledge deployment (designed, partly built)

- **Built in the spike**: a `help:bundle` script that turns registry + `content/help` into a versioned JSON bundle, run before the Worker deploys and in tests (fixture bundle for unit tests).
- **Designed only**: the nine-step D1/Vectorize sync from the issue. Recommendation recorded in `contracts/knowledge-store.md`: **two workflows** — schema migrations (already `migrations_dir`-based) and knowledge sync — triggered after a successful app deploy, with per-environment resources (`cc-help-staging-*`, `cc-help-prod-*`) and the commit SHA stored with each knowledge version.

### D13 — Environment isolation

Staging and production already deploy the Worker separately (`deploy-worker.yml`). The bundle embeds the commit SHA; staging-only features live in registry entries marked `channel: "staging"` and are excluded from production bundles at build time.

### D14 — Conversation state

Held in memory in the Help panel store for the session only, capped at 4 turns; never written to the vault or browser storage; cleared when the panel is reset. Only the capped tail is sent. Follow-ups are supported; long-term memory is out of scope.

### D15 — Privacy review of the prompt

The model receives: the question the user typed, ≤ 4 prior help turns, the screen description, and help text. The question is user-typed text and may contain a name the user chooses to type; the UI states plainly that the question is sent to the AI service and to avoid pasting private lore. No vault content is added automatically. The Help panel never reads entity text.

### D16 — UI placement

Persistent help button and panel (separate from the Oracle) per clarification. The "Ask about this" shortcut is rendered in the entity detail Connections tab and opens the same panel. Implementation splits UI state, conversation, and context gathering into three small units (see `plan.md`) so no existing large component or store grows (Constitution XIV).
