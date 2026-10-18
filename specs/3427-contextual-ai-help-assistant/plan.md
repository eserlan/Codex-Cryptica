# Implementation Plan: Contextual AI Help Assistant (Spike)

**Branch**: `3427-contextual-ai-help-assistant` | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/3427-contextual-ai-help-assistant/spec.md`

## Summary

Prove one end-to-end help interaction and produce the contracts needed to decide on a full build. In Settlement → Connections the user asks "How do I connect the faction I just created?"; the app sends a minimal, schema-validated screen description; the existing Oracle Proxy Worker retrieves grounded product knowledge (registry-first, context-aware lexical ranking), asks the existing LLM pipeline for a cited answer and a candidate action ID, validates everything server-side, and returns an answer plus, optionally, a safe two-step guide (open the Status tab, highlight Add). Offline or AI-unavailable users get static help for their screen. Metrics are a single server-side log line with no identifiers or content.

Technical approach (details and alternatives in [research.md](./research.md)):

- New framework-free package `packages/help-engine` owns the context schema, registry, action catalogue/validator, retrieval ranker, prompt builder and response validator, shared by Worker and web app.
- New Worker route `POST /api/help/ask` in a new module, reusing the session guard, rate limiters, resolver (new `help-answer` operation, Luna → Gemini fallback) and observability.
- Web: a flagged Help panel (separate from the Oracle) with three small units — context gathering, conversation/panel state, highlight service — plus `data-help-target` attributes on real controls.
- D1 + Vectorize are **designed and evaluated offline, not deployed** (recall measured against embeddings; adopt only if the data says so).

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 2, Bun 1.3.14; Cloudflare Workers runtime (no Node built-ins) for the Worker
**Primary Dependencies**: Existing `schema`/Zod, `discoveryPolicyStore.aiDisabled` (AI availability gate), `@codex/ai-engine` (`ensureSessionManager` capability token, `aiClientManager`), Oracle Proxy LLM pipeline (`llm/registry.ts`, `resolver.ts`, `handle-operation-request.ts`), `session-guard.ts`, existing `helpStore`. New internal workspace package `packages/help-engine`. **No new third-party dependency.**
**Storage**: Browser: none persisted (conversation is in-memory, session-only). Worker: none at runtime (knowledge shipped as a build-time JSON bundle). D1/Vectorize schemas documented in `contracts/knowledge-store.md` only.
**Testing**: Vitest (package, Worker, web units); Worker tests per existing `*.test.ts` patterns; a scripted evaluation harness (20 in-scope + 10 out-of-scope questions, offline-stubbed model for CI, optional live run); Playwright spike check for the highlight + offline fallback (existing e2e setup)
**Target Platform**: Modern browsers (desktop and mobile widths) + Cloudflare Workers
**Project Type**: Web app (SvelteKit) + workspace packages + Cloudflare Worker
**Performance Goals**: Pending feedback ≤ 300 ms; complete answer ≤ 8 s p90; static fallback ≤ 2 s; zero impact on editor/navigation responsiveness
**Constraints**: No client analytics in the authenticated app; no vault content or identifiers in any request; no mutating actions; no new quota/credentials; bundle small enough to ship inside the Worker (< ~1 MB); offline fallback to existing help
**Scale/Scope**: 5 registry entries (Entity Connections, Graph, Session Hub, Tables, one generator workflow — the campaign generator is proposed), ~40 help articles, 5 action types, 1 new Worker route, ~30-question evaluation set

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle                   | Status              | How the plan satisfies it                                                                                                                                                                                        |
| --------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Library-First            | PASS                | Logic lives in `packages/help-engine`; web and Worker are thin adapters.                                                                                                                                         |
| II. TDD                     | PASS                | Each unit task pairs a failing test first; success and failure/negative paths per behaviour (unknown key, off-list action, no-match, offline, timeout).                                                          |
| III. Simplicity & YAGNI     | PASS                | No Vectorize/D1 deployment, no flag framework, no streaming, no new dependency; reuses session guard, LLM pipeline, `helpStore`, help Markdown. Lexical ranker is small and replaced only if evaluation says so. |
| IV. AI-First Extraction     | PASS (n/a-adjacent) | Model output is schema-validated and grounded; all AI output treated as untrusted.                                                                                                                               |
| V. Privacy & Client-Side    | PASS                | No vault data leaves the device; only a schema-strict screen description and the typed question. No remote storage, so the opt-in storage exception is not invoked.                                              |
| VI. Clean Implementation    | PASS                | Style guide, Svelte 5 Runes, Tailwind semantic tokens, Iconify classes only.                                                                                                                                     |
| VII. User Documentation     | PASS                | `help-assistant.md` is authored in this spike with `hidden: true` front matter (supported by the help loader), so it ships but is not listed until rollout.                                                      |
| VIII. DI                    | PASS                | Constructor-injected context store, panel store, highlight service, and Worker orchestrator (deps: retriever, resolver, clock, logger). Class + default singleton exported.                                      |
| IX. Natural Language        | PASS                | Panel copy and fallback messages are plain; reviewed in the polish tasks.                                                                                                                                        |
| X. Coverage                 | PASS                | New package held to the 70% goal; highlight service and validators covered by negative tests.                                                                                                                    |
| XI. Agent Protocol          | PASS                | Success criteria from spec; impacted-only validation (`lint:changed`, `test:changed`, scoped svelte-check).                                                                                                      |
| XII. Labels over Tags       | PASS                | Registry uses `labels`/`kinds`, never user-facing "tags".                                                                                                                                                        |
| XIII. Discovery Intent      | N/A                 | No public indexable page is added.                                                                                                                                                                               |
| XIV. Bounded Responsibility | PASS                | See check below.                                                                                                                                                                                                 |

**Privacy/analytics rule (project memory and FR-027/FR-028)**: explicitly verified — no import of `services/analytics/*` from any help code; a lint-style unit test asserts this (task T059).

### Discovery Intent Check

N/A — the feature adds no public, indexable discovery page.

### Bounded Responsibility Check

Files this feature touches that already exceed 500 lines (excluding tests and data-only modules):

| File                                                               | Lines | Change                                                                                                                                                           | Resolution                                                                                                           |
| ------------------------------------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `apps/workers/oracle-proxy/src/index.ts`                           | 1,172 | One dispatch line for `/api/help/ask`                                                                                                                            | New behaviour lives in new `help.ts`; `index.ts` keeps its single responsibility (routing/dispatch). No logic added. |
| `apps/web/src/lib/components/entity-detail/DetailStatusTab.svelte` | 583   | Add `data-help-target="add-connection-button"` to the existing ADD button                                                                                        | A one-attribute marker on an existing control; no behaviour added.                                                   |
| `apps/web/src/routes/(app)/+layout.svelte`                         | 778   | **Not touched.** The host mounts lazily from `GlobalModalProvider.svelte` (349 lines, under the trigger), where the style guide says persistent overlays belong. | Avoids growing the layout.                                                                                           |
| `apps/web/src/lib/components/EntityDetailPanel.svelte`             | 605   | **Not touched.** The tab strip registers its surface from `DetailTabs.svelte` (380 lines) through a renderless component.                                        | Avoids widening a file already over the trigger.                                                                     |

Other existing files the tasks touch are under the 500-line trigger: `DetailTabs.svelte` (380, data attributes only), `DetailConnectionsTab.svelte` (381, one component added), `detail-tabs.ts` (104), `help.svelte.ts` (363, read-only use), `llm/registry.ts` (127), `llm/types.ts`. Everything else is new files. New units are split by responsibility: `HelpContextStore` (what the screen is), `HelpAssistantStore` (panel + conversation), `HelpHighlightService` (DOM guidance), `HelpAssistantPanel.svelte` (view). No split carries tests away because none of the touched files is decomposed.

- [x] Files over 500 lines are listed.
- [x] Each has a named single responsibility or no added behaviour.
- [x] New behaviour has extraction targets (`packages/help-engine`, sibling modules).
- [x] No planned split loses coverage.

## Project Structure

### Documentation (this feature)

```text
specs/3427-contextual-ai-help-assistant/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── help-ask-api.md          # Request/response contract + JSON shapes + errors
│   ├── screen-context.md        # HelpContextV1 schema and exclusion rules
│   ├── feature-registry.md      # Registry entry schema + the 5 PoC entries
│   ├── help-actions.md          # Action catalogue, control IDs, validation
│   └── knowledge-store.md       # D1 schema + Vectorize metadata + sync design (design only)
├── checklists/requirements.md
└── tasks.md                     # /speckit-tasks
```

### Source Code (repository root)

```text
packages/help-engine/                     # NEW, framework-free
├── package.json
├── src/
│   ├── context/                          # HelpContextV1 schema, sanitiser, route-template guard
│   ├── registry/
│   │   ├── schema.ts                     # Feature entry schema + cross-reference validator
│   │   └── features/                     # one data module per feature (5 PoC entries)
│   ├── actions/                          # catalogue (control IDs), validator, candidate builder
│   ├── retrieval/                        # chunker, lexical ranker, context boosting, min-relevance floor
│   ├── prompt/                           # system prompt, source blocks, history trimming
│   ├── response/                         # model-output schema, grounding check, downgrade rules
│   ├── bundle/                           # bundle builder (registry + help markdown → JSON)
│   └── index.ts
└── tests/                                # incl. evaluation harness + fixtures

apps/workers/oracle-proxy/src/
├── help.ts                               # NEW: /api/help/ask orchestrator (+ help.test.ts)
├── help-metrics.ts                       # NEW: single structured log line, no identifiers
├── help-bundle.ts                        # NEW: lazy wrapper around the generated bundle
├── index.ts                              # +dispatch for /api/help/ask (and its import)
└── llm/
    ├── types.ts, registry.ts             # +`help-answer` operation (low reasoning; Luna rejects "minimal")
    ├── provider-resolver.ts              # NEW: resolver wired to the real adaptors (shared)
    └── handle-operation-request.ts       # shared request prelude extracted (removes a clone)

apps/web/src/lib/
├── stores/help-assistant/
│   ├── help-context.svelte.ts            # builds HelpContextV1 from registered providers
│   └── help-assistant.svelte.ts          # panel state, capped conversation, request/cancel/timeout
├── services/help-assistant/
│   ├── help-client.ts                    # fetch to /api/help/ask, capability token, abort
│   ├── help-highlight.svelte.ts          # HelpHighlightService (a11y, reduced motion, cleanup)
│   ├── help-action-runner.ts             # re-validates and executes accepted guides
│   └── help-fallback.ts                  # offline / error → static help topic for the screen
├── components/help-assistant/
│   ├── HelpAssistantHost.svelte          # flag + AI-availability gate, mount point
│   ├── HelpAssistantPanel.svelte         # dialog shell
│   ├── HelpAssistantMessage.svelte       # one message (+ HelpSourceChips, HelpTopicList)
│   ├── HelpAssistantComposer.svelte      # the question box
│   ├── HelpHighlightLayer.svelte         # ring + label + live region
│   ├── HelpEntityDetailSurface.svelte    # renderless; registers the tab strip surface
│   ├── HelpActionOffer.svelte            # "Show me" / dismiss
│   ├── HelpAskButton.svelte              # persistent help button
│   └── AskAboutThis.svelte               # shortcut shown on the Connections tab
├── config/help-assistant.ts              # flag helper (VITE_HELP_ASSISTANT, plus a dev-build-only local switch)
├── content/help/session-hub.md           # NEW article closing a coverage gap (visible)
└── content/help/help-assistant.md        # NEW user article with `hidden: true` until rollout

apps/web/src/lib/components/entity-detail/
├── DetailStatusTab.svelte                # +data-help-target on ADD (marker only)
└── DetailConnectionsTab.svelte           # +<AskAboutThis /> (381 lines, under trigger)
```

**Structure Decision**: Web app + workspace package + Worker, matching the repo's existing pattern (e.g. `entity-template-engine`, `session-journal-engine`). The Worker resolves `@codex/help-engine` through Bun workspaces path resolution, as other Worker code does.

## Phase 0 Output

[research.md](./research.md) resolves every open design question from issue #3427 (retrieval, registry format, package boundary, Worker contract, grounding, thresholds, context schema, actions, metrics, latency, cost, deployment, isolation, conversation state, privacy, placement) and records four findings that change the spec (F1–F5).

## Phase 1 Output

[data-model.md](./data-model.md), [contracts/](./contracts/), and [quickstart.md](./quickstart.md).

### Post-Design Constitution Re-check

Unchanged: all gates PASS. Design added no dependency, no persistence, and no new external resource. The one deliberate gap is D1/Vectorize (designed, not built), which is a YAGNI decision with explicit adoption triggers recorded in research D1.

## Complexity Tracking

| Item                                     | Why                                                                              | Simpler alternative rejected because                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| New `packages/help-engine`               | Trust-boundary validation must be identical on client and Worker; Constitution I | Duplicating schemas in both apps would drift and leave one side unvalidated                         |
| Help article authored but `hidden: true` | Constitution VII requires user docs for major features; spike is flagged off     | Listing docs for a disabled feature misleads users; omitting them breaks VII when the flag turns on |
| Offline evaluation harness               | Issue asks to validate D1 + Vectorize; needs evidence rather than opinion        | Deploying D1 + Vectorize to learn recall is far more operational cost than a script                 |
