# Implementation Plan: LLM Model Registry & Provider Resolver (oracle-proxy)

**Branch**: `2034-llm-model-registry` | **Date**: 2026-08-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/2034-llm-model-registry/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Replace `oracle-proxy`'s hardcoded, Gemini-only forwarding with a central model registry (model key → provider, API model ID, capabilities, cost rate, availability), a provider-neutral resolver (capability requirement → context default → fallback), and provider adaptors (Gemini, new OpenAI-compatible) behind a shared operation-typed request/response contract. Adds GPT-5.6 Luna as a registry entry via the OpenAI-compatible adaptor. Every existing caller keeps working unchanged (no client migration in this slice); "authenticated" context is deferred (#2050) so this slice always resolves as "public".

## Technical Context

**Language/Version**: TypeScript, Cloudflare Workers runtime (no Node built-ins)
**Primary Dependencies**: None new — Workers runtime `fetch`/`crypto` globals only, same as today's Gemini forwarding (`apps/workers/oracle-proxy` has no `package.json` of its own; built via Bun workspaces path resolution)
**Storage**: N/A — model registry is static in-code config, no database, no persistence this slice (FR-014)
**Testing**: Vitest (`bunx vitest run` from `apps/workers/oracle-proxy/`), matching the existing `src/*.test.ts` files (e.g. `src/index.test.ts`, 23 passing tests today) — no dedicated `package.json`/`vitest.config.*` exists for this Worker; it runs against the monorepo's hoisted `vitest` binary and root TS config.
**Target Platform**: Cloudflare Workers (V8 isolate), same deployment as today (`deploy-worker.yml` → `wrangler deploy`)
**Project Type**: Single Cloudflare Worker (backend service) — no frontend changes in this slice
**Performance Goals**: No new latency budget beyond today's proxy passthrough; provider calls MUST time out at 15s (clarified) so fallback/error handling is bounded
**Constraints**: Zero client-facing breaking changes (FR-007); no provider credentials/URLs/model IDs ever exposed to the client (FR-003); no second-model "improve" pass (FR-009); observability logs MUST NOT contain prompt/content text (FR-012)
**Scale/Scope**: One Worker, ~2 provider adaptors (Gemini existing, OpenAI-compatible new) at launch, single static registry with a handful of model entries (existing Gemini default + Luna, extensible)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I. Library-First**: `oracle-proxy` is a Cloudflare Worker, not a `packages/` library, and its existing Gemini-forwarding logic already lives directly in `src/`. The registry/resolver/adaptors are Worker-internal request-routing logic (config + control flow over `fetch`), not a reusable domain library other apps would import — consistent with how the rest of the Worker (`publish.ts`, `directory.ts`, etc.) is structured as sibling modules in `src/`, not a package. **PASS** (no new package needed; if the registry/resolver logic is later found useful to `apps/web` directly, extracting it to `packages/` becomes a follow-up, not a day-one requirement).
- **II. TDD**: New registry, resolver, and adaptor modules MUST ship with unit tests (Red-Green-Refactor) alongside `src/index.test.ts`'s existing pattern before being wired into `index.ts`. **PASS** (enforced in tasks/implementation phase).
- **III. Simplicity & YAGNI**: Reuses the existing Gemini call code path (refactored into an adaptor, not rewritten) rather than introducing a new HTTP client library; no new dependency added. Must avoid duplicating capability-check logic between resolver and adaptors (single source of truth in the registry). **PASS**, to be re-verified at Phase 1 when data-model/contracts are concrete.
- **IV. AI-First Extraction**: Directly extends the Oracle-proxy pattern (validated JSON output handling) to a second provider; structured-output validation and retry-then-fallback (clarified) are explicit parts of this design. **PASS**.
- **V. Privacy & Client-Side Processing**: N/A to this slice — no client-side data handling changes; this is proxy-side routing only.
- **VI. Clean Implementation**: `bun run lint` and `bun run test` (or the Worker-local `bunx vitest run`) MUST pass before completion. **PASS**, to be verified during implementation.
- **VII. User Documentation**: This is invisible backend plumbing (no new user-facing behavior — FR-007 requires zero visible change), so no `help-content.ts` entry is needed for _this_ slice. The follow-up UI/tier-selector slice (which _is_ user-facing) will need one. **PASS** (N/A for this slice; noted for follow-up).
- **VIII. Dependency Injection**: The resolver and provider adaptors MUST accept their dependencies (registry data, `fetch`, `env`/secrets) via constructor/function parameters with production defaults, mirroring `DefaultAIClientManager`'s existing `fetcher` injection pattern in `packages/ai-engine/src/client-manager.ts`, so they're unit-testable with mocked providers. **PASS**, to be enforced in data-model/contracts.
- **IX. Natural Language**: N/A — no user-facing text in this slice.
- **X. Quality & Coverage**: New modules are new logic in an existing Worker; per the constitution's "New Code" rule they MUST meet the 70% coverage goal on introduction. **PASS**, to be enforced via tasks.
- **XI. Agent Operational Protocol**: This plan states assumptions explicitly (see Technical Context/Research) rather than guessing; the auth-context ambiguity found during planning was surfaced to the user and resolved (deferred to #2050) rather than silently assumed. **PASS**.
- **XII. Terminology**: N/A — no "Tags" vs "Labels" surface in this feature.

No violations requiring justification; Complexity Tracking table is empty.

**Post-Design Re-check** (after Phase 1 data-model/contracts): The finalized types (`data-model.md`) keep resolver logic (`resolver.ts`) and provider wire-format logic (`adaptors/*.ts`) in separate files with no cross-cutting imports of provider-specific code into the resolver, confirming Principle III/IV/VIII compliance. `ResolutionLogEntry` has no field capable of holding prompt/content text by construction, confirming Principle VI/observability requirements (FR-012) are structurally enforced, not just conventionally followed. No new violations identified; gates still **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/2034-llm-model-registry/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/workers/oracle-proxy/src/
├── index.ts                    # existing entry point; wire new /llm route through resolver
├── index.test.ts               # existing tests; extend for new route wiring
├── llm/
│   ├── registry.ts             # model registry: entries, lookup by key/capability/context
│   ├── registry.test.ts
│   ├── resolver.ts             # capability → context default → fallback selection logic
│   ├── resolver.test.ts
│   ├── types.ts                # LlmRequest, LlmResponse, LlmModelDefinition, operation enum
│   ├── observability.ts        # log-entry construction (no content), cost computation
│   ├── observability.test.ts
│   └── adaptors/
│       ├── gemini-adaptor.ts       # extracted from existing index.ts Gemini forwarding
│       ├── gemini-adaptor.test.ts
│       ├── openai-adaptor.ts       # new: OpenAI-compatible calls (incl. Luna)
│       └── openai-adaptor.test.ts
├── directory.ts, publish.ts, notice.ts, ...  # existing, unrelated modules — untouched
```

**Structure Decision**: Single Cloudflare Worker (`apps/workers/oracle-proxy`), extended in place — no new package or app. New logic lives under `src/llm/` as sibling modules to the Worker's existing `src/*.ts` files (matching the pattern already used for `publish.ts`, `directory.ts`, etc.), keeping resolver logic (`resolver.ts`) and provider communication (`adaptors/*.ts`) in separate files per FR-005's separation-of-concerns requirement. `index.ts` is modified only to route new operation-typed requests through `llm/resolver.ts` and to refactor its existing inline Gemini call into `llm/adaptors/gemini-adaptor.ts`; the pre-existing request shapes and their handling stay behind unchanged per FR-007.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations — table intentionally empty.
