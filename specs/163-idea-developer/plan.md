# Implementation Plan: Idea Developer (POC)

**Branch**: `163-idea-developer` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/163-idea-developer/spec.md` (GitHub issue #3228)

## Summary

A public, no-login tool at `/tools/idea-developer`. The user pastes a freeform RPG idea, picks **Assess** or **Develop**, and receives a structured development that quotes and builds on the idea rather than replacing it. The user can then keep going in a **multi-turn conversation** (answer the creator questions, ask for a change, switch mode) without resending earlier turns. Each conversation is one draft in the existing Session Hub, which is what carries the idea into the suggested generators.

The approach reuses what already exists instead of adding infrastructure:

- **Model call**: the existing conversation path (`aiClientManager.sendInteraction` → oracle-proxy `handleInteraction`) with the registry key `luna-fast` (GPT-5.6 Luna). The proxy already maps this to OpenAI's Responses API and chains turns with `previous_response_id`, so only new input is sent each turn. It keeps the Turnstile session handshake and the edge rate limits. No worker change is planned. Where Luna is unavailable the existing fallback to Gemini Interactions applies with the same shape.
- **Logic**: a new `idea-developer` module in `packages/generator-engine` (library-first). It holds the mode definitions, prompt building, response validation and the fixed generator catalogue. The web app is a thin layer over it.
- **Persistence**: none on Codex Cryptica's servers. The provider holds conversation state while the conversation continues (disclosed to the user). The browser keeps the turns in `sessionStorage` (tab-scoped), which is also the basis for recovering an expired conversation.
- **Limits**: a small per-browser usage limiter (new), layered on the existing Turnstile and edge limits.
- **Analytics**: content-free events through the existing `trackEvent` pipeline, marketing route group only.
- **Design deliverable**: `docs/idea-developer-vault-aware-design.md` covers the vault-aware version and the Jev follow-up. No vault code is written.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 2, Bun 1.3.14
**Primary Dependencies**: Existing `@codex/ai-engine` (`aiClientManager`), `generator-engine`, `zod`, existing Session Hub store, existing Zaraz analytics; no new third-party dependency
**Storage**: Browser `sessionStorage` only (Session Hub drafts, plus the tool's own restore key); `localStorage` for the usage-limit counters; nothing server-side
**Testing**: Vitest for the package and web units; component tests for the tool UI; a Playwright route smoke test only if an existing marketing-route e2e pattern applies (checked in tasks T077a)
**Target Platform**: Public web (marketing route group), desktop and mobile browsers
**Project Type**: Web application in a Bun monorepo (`apps/web`, `packages/generator-engine`, `apps/workers/oracle-proxy`)
**Performance Goals**: Result within roughly the time public generators take today (SC-001: under 60 seconds of active time); a visible progress state using the existing thematic loading messages (`generator-engine/src/loading-messages.ts`) with a cancel action, since `sendInteraction` does not stream (FR-041)
**Constraints**: No retention of idea, turn or result text on Codex Cryptica's systems (FR-023); provider-held conversation state is disclosed; no tracking inside the authenticated app (FR-022); no numeric score anywhere (FR-009); AI required, so there is no local-table fallback and failure means keep-input-and-retry (FR-026); a turn cap bounds cost (FR-035)
**Scale/Scope**: One new route, one package module, one store, one service, one limiter, one analytics module, a closing "develop it" section on three existing answers, one design doc

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design (see end of section)._

| Principle                   | Status                                                                                   | How                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Library-First            | PASS                                                                                     | Mode definitions, prompt, parser and generator catalogue live in `packages/generator-engine/src/idea-developer/`. The web app holds only UI, store and transport wiring.                                                                                                                                                                                                                                                                                                                                                           |
| II. TDD                     | PASS                                                                                     | Package tests are written first for the parser (section counts, no score, unlisted links dropped), the prompt (idea preserved, mode emphasis) and the catalogue. Web tests cover the limiter, store, tracking payloads and the component.                                                                                                                                                                                                                                                                                          |
| III. Simplicity & YAGNI     | PASS                                                                                     | Two modes built; the other three exist only as a mode-definition seam (a new entry in one table). No vault code, no local fallback, no new dependency. Reuses the Session Hub, `trackEvent`, the Turnstile session and edge limits.                                                                                                                                                                                                                                                                                                |
| IV. AI-First Extraction     | PASS                                                                                     | The model produces structured JSON that is validated with `zod` before display; invalid output is rejected, not shown.                                                                                                                                                                                                                                                                                                                                                                                                             |
| V. Privacy & Client-Side    | PASS, with a disclosed provider-side conversation (visible notice beside submit, FR-038) | Codex Cryptica retains nothing (FR-023, SC-011, SC-020). Continuing a conversation without resending turns requires the provider to hold state (`store: true`), as the existing Oracle and generator sessions already do. This is submitted idea text, not vault data, so the remote-storage exception for vault data is not invoked; the tool states the provider-held state in plain language and offers a way to end the conversation. Confirm the provider's retention window and no-training terms before launch (see Risks). |
| VI. Clean Implementation    | PASS                                                                                     | Style guide: Svelte 5 Runes, semantic tokens, Iconify classes only, no `lucide-svelte`.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| VII. User Documentation     | PASS                                                                                     | A help entry is added to `help-content.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| VIII. Dependency Injection  | PASS                                                                                     | The store, service and limiter take constructor-injected storage, clock, transport and tracker, with singleton defaults.                                                                                                                                                                                                                                                                                                                                                                                                           |
| IX. Natural Language        | PASS                                                                                     | Plain wording; no "AI-generated campaign" framing. Copy is reviewed against the spec's core principle.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| X. Coverage                 | PASS                                                                                     | The new package module is held to the 70% engine goal; the store to the 50% goal.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| XI. Karpathy Rules          | PASS                                                                                     | Surgical: existing generators, the hub store and the worker are not modified.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| XII. Labels over Tags       | PASS                                                                                     | Hub drafts use `labels`; no "tags" anywhere.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| XIII. Discovery Governance  | PASS (see check below)                                                                   |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| XIV. Bounded Responsibility | PASS (see check below)                                                                   | The service is split by responsibility up front: `turn-runner.ts`, `conversation-recovery.ts`, `hub-sync.ts`, `save-to-codex.ts`, with `idea-developer-service.ts` as a thin coordinator.                                                                                                                                                                                                                                                                                                                                          |

### Discovery Intent Check

- [x] **Ownership checked.** The registry has no entry owning "develop an RPG idea". The nearest are `generator-adventure-idea-generator` (a generator that _invents_ ideas) and the cluster answers (which _explain_). Neither develops a user's own idea.
- [x] **New page registered before it is built.** Entry `tool-idea-developer`: `pageKind: "tool"`, `canonicalPath: "/tools/idea-developer"`, `primaryIntent: "develop my rpg idea"`, `userJob: "create"`, status `planned` until built. Unique value: takes the user's own premise and develops it, where the adventure-idea generator replaces it with a new one. Aliases: "expand rpg campaign idea tool", "rpg idea developer".
- [x] **Synonyms are aliases, not URLs.** No second URL is created for "expand", "flesh out" or "improve" phrasings.
- [x] **Overlap recorded.** The tool shares the `create` job with the adventure-idea generator but not its input (user premise vs none). If the audit reports the overlap as a warning, it is acknowledged with that reason via `acknowledgedOverlap`.
- [ ] `bun scripts/discovery-audit.mjs` reports no errors. Run at implementation time and before any PR.

The three cluster answers already exist and gain a closing section; they are not new pages. Their registry entries gain the tool in `relatedIntents`, and the audit is re-run.

### Bounded Responsibility Check

Files the feature touches that already exist:

| File                                                        | Nature                         | Over 500 lines?         | Action                                                                                                       |
| ----------------------------------------------------------- | ------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `apps/web/src/lib/content/discovery/entries/tools.ts`       | Data module (registry entries) | Exempt (data)           | Add one entry                                                                                                |
| `apps/web/src/lib/content/discovery/governed-routes.ts`     | Data list                      | Exempt (data)           | Add one route                                                                                                |
| `apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte` | Large component                | Over 500 lines          | Not touched; the save flow it holds is reused by copying the small draft-writing step, not by extending it   |
| `apps/web/src/lib/config/help-content.ts`                   | Data module                    | Exempt (data)           | Add one entry (incl. the provider-held conversation explanation)                                             |
| Privacy page (`(marketing)/privacy/+page.svelte`)           | Content page                   | Check size when editing | Add a short "What happens to my idea?" section; if the file is over 500 lines, add it as a sibling component |
| Three answer content files                                  | Data modules                   | Exempt (data)           | Add a closing prose section with a CTA; add the tool to `relatedIntents`                                     |
| `packages/generator-engine/src/index.ts`                    | Barrel                         | Re-exports only         | Add one export line                                                                                          |
| `AGENTS.md`                                                 | Docs                           | n/a                     | Point the plan reference here                                                                                |

No behavioural change is made to any existing large file. All behaviour goes into new files, each with one responsibility. `SEOGeneratorLayout.svelte`, `session-hub.svelte.ts`, `zaraz-analytics.ts` and the worker are deliberately left alone.

### Post-design re-check

The Phase 1 design keeps every gate above as PASS. The one design decision that touched a gate was the generator hand-off: using Session Hub drafts (Principle III, reuse before writing) rather than URL parameters, which existing generators do use for other hand-offs. URL parameters were rejected because they would put the idea text in browser history and links, contradicting FR-014 and FR-023. The spec was refined to match.

## Project Structure

### Documentation (this feature)

```text
specs/163-idea-developer/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── idea-developer-response.md   # model response shape, validation rules
│   ├── conversation-turns.md        # per-turn request, turn kinds, replay, cap
│   ├── analytics-events.md          # content-free funnel events
│   └── session-hub-draft.md         # how a conversation appears in the hub (one draft, updated)
└── tasks.md                         # created by /speckit-tasks
```

### Source Code (repository root)

```text
packages/generator-engine/src/idea-developer/        # NEW: logic, no UI
├── modes.ts                # Assess + Develop definitions; the seam for later modes
├── types.ts                # Development, sections, GeneratorSuggestion (zod schemas)
├── prompt.ts               # system instruction, first-turn input, follow-up input per turn kind
├── conversation.ts         # turn kinds, turn cap, replay-history builder for expired conversations
├── parse.ts                # validate response; enforce counts; reject scores
├── generator-catalogue.ts  # fixed list of suggestable generators (slug, label, reason hints)
├── suggestions.ts          # filter model picks to the catalogue; default set fallback
├── to-hub-draft.ts         # Development -> Session Hub draft shape
├── index.ts
└── *.test.ts               # written first

apps/web/src/
├── routes/(marketing)/tools/idea-developer/
│   ├── +page.svelte
│   └── +page.ts
├── lib/components/idea-developer/
│   ├── IdeaDeveloperTool.svelte     # input, mode choice, submit, states
│   ├── ConversationNotice.svelte    # always-visible notice beside submit (FR-038)
│   ├── DevelopmentResult.svelte     # sections, original idea, copy, Save to your Codex (opens SaveToCodexModal)
│   └── GeneratorLinks.svelte        # develop-further links
├── lib/stores/idea-developer.svelte.ts          # state + tab-only restore (constructor DI)
├── lib/services/idea-developer/
│   ├── idea-developer-service.ts    # thin coordinator: limiter check, run a turn, sync hub, recover if expired
│   ├── turn-runner.ts               # builds and sends one turn via sendInteraction, validates, retries once, maps errors
│   ├── conversation-recovery.ts     # replays kept turns into a fresh conversation when the provider drops it
│   ├── hub-sync.ts                  # adds and updates the conversation's Session Hub draft
│   ├── save-to-codex.ts             # writes the pending import for the existing save flow (FR-040)
│   ├── arrival.ts                   # reads from/source/mode once on arrival, allow-listed
│   └── usage-limiter.ts             # per-browser cooldown + cap
├── lib/services/analytics/idea-developer-tracking.ts   # content-free events
├── lib/content/discovery/entries/tools.ts               # + tool-idea-developer entry
├── lib/content/discovery/governed-routes.ts             # + /tools/idea-developer
├── lib/config/help-content.ts                           # + help entry
├── lib/content/idea-developer-notice.ts                 # shared notice/help/privacy copy (one source of truth)
└── lib/content/answers/pages/                           # + closing "develop it" section on the 3 cluster answers

docs/idea-developer-vault-aware-design.md   # NEW: design deliverable (FR-028, FR-029)
```

**Structure Decision**: Web application in the existing monorepo. Logic goes in `packages/generator-engine` (Principle I), the route in the `(marketing)` group so analytics and the Turnstile-backed AI path apply, and everything is added as new files.

## Key Decisions

Full reasoning is in [research.md](./research.md).

1. **Route**: `/tools/idea-developer`. It is not a generator (so it stays out of `GENERATOR_SLUGS` and the generator layout), it is in a governed family, and it sits in the marketing group.
2. **Model call and turns**: `sendInteraction` with `luna-fast`, JSON mime type (the proxy sets `json_object`), `previousInteractionId` from the last turn, `storeConversation: true`. The full development is returned every turn and validated every turn. On `InteractionExpiredError` the service replays the kept turns into a fresh conversation. No new worker operation.
3. **No local fallback**: public generators fall back to local tables when AI fails. This tool cannot, so failure keeps the input and offers a retry (FR-026).
4. **Hand-off**: a Session Hub draft, not URL parameters (see re-check above).
5. **Usage limit**: per-browser cooldown plus a rolling cap in `localStorage` with injected clock, in addition to Turnstile and the existing edge limits.
6. **Generator suggestions**: the catalogue holds only generators that exist and are verified to read hub context (verified in T041: faction, rumour, settlement, npc, secret-society, quest; `adventure-generator` is excluded because it does not read hub context); the model returns catalogue keys only; anything else is dropped; an empty result falls back to a default set (FR-013, FR-015).
7. **Turn kinds**: `answer-questions`, `change-part`, `switch-mode`, plus the opening `idea` turn. All produce the same eight sections plus a one-line `whatChanged`. One conversation is one Session Hub draft, updated in place.
8. **Turn cap**: a named constant (proposed 8 turns per conversation) with a plain-language message and a new-conversation action when reached.
9. **Numeric-score guard**: the parser rejects responses containing score-like fields, and the prompt forbids them (FR-009).

## Risks and Open Items

- **Provider retention**: `sendInteraction` defaults to `store: true`, and chaining needs stored responses. Before launch confirm the provider's retention window and that API data is excluded from training. If either is unacceptable for a no-login public tool, the fallback is stateless turns (resend the kept history each turn), which the replay builder already supports. Consider asking the proxy to delete the stored response when the user ends a conversation, if the provider offers it; this would be a small worker addition and is not planned unless the terms require it.
- **Sign-up step (FR-040)**: the existing save flow lives inside `SEOGeneratorLayout.svelte` (over 500 lines, so it is not extended). The tool reuses the standalone `SaveToCodexModal.svelte` and writes the same `__codex_pending_import` draft shape (validated with `ImportDraftSchema`) from a small `save-to-codex.ts`. This duplicates about twenty lines from the layout; if a third caller appears, extract a shared helper (Principle III).
- **Original idea is read-only after turn 1**: changes go through "Ask for a change" (a `change-part` turn), so no edit path can silently replace it.
- **Launch gate order**: the provider retention and no-training confirmation (task T026a) is done before the tool is set live, listed or linked (T027), not at the end.
- **Hub reuse across generators**: the hand-off relies on each suggested generator reading hub drafts through `getSessionContext`. The task list includes a check per catalogue entry, and an entry is left out of the catalogue if it does not read the hub.
- **Hub persistence**: the hub is `sessionStorage`-backed, matching FR-030. If the hub is cleared, the tool's own restore copy is cleared with it (no orphan).
- **Turn cost and abuse**: each turn is a model call. Every turn passes the bot check and the per-browser limiter, and the turn cap bounds a conversation.
- **Prompt-injection text in the idea or in a later turn**: handled by delimiting the idea as data in the prompt and by output validation; covered by a test with an instruction-shaped idea (FR-027).
- **Jev**: out of scope; recorded in the design doc only.
