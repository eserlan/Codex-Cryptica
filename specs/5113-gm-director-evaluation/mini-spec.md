# GM Director 05 — Multi-Turn Evaluation Mini-Spec

> Issue: [#5113 — Benchmark AI GM reasoning and Director effect with multi-turn replays](https://github.com/eserlan/Codex-Cryptica/issues/5113)
> Parent epic: [#5108 — AI GM Director](https://github.com/eserlan/Codex-Cryptica/issues/5108) (05/06, P2)
> Depends on: Director context #5109, meaningful-progress detection #5110, and durable causal commitments #5111.
> Stack: implemented from [PR #5151](https://github.com/eserlan/Codex-Cryptica/pull/5151), `feat/5112-generation-diagnostics`. PR #5151 has merged to `staging`; this branch is being rebased onto `staging` so the PR contains only #5113.

## 1. Specification (What & Why)

### Problem Statement

The GM Director and a higher reasoning effort may help the AI GM answer investigative questions and make meaningful progress, but the current evaluation harness cannot separate those effects across repeatable multi-turn play. Add a synthetic benchmark that compares the prompt treatment and reasoning effort under both provider-retained and locally reconstructed context, then records a bounded live comparison without making paid model calls part of CI.

### Scope & Boundaries

- **In Scope**:
  - Create a deterministic, spoiler-safe village investigation fixture inspired by the bell-ringer stall: immutable scenario truth, witnesses with limited knowledge, physical/record clues, one fair negative finding, and an optional peaceful non-mystery route. Do not copy any user's diagnostic or campaign data.
  - Script turns covering varied witness interviews, a witness who cannot answer, following and ignoring leads, a return visit, and a provider-history reset. Preserve the same initial state and action script across comparison arms.
  - Compare `luna-fast` at `low` and `medium` reasoning effort with the Director prompt treatment off and on. Run both provider-retained and stateless/reconstructed context modes. The off arm suppresses only Director-specific brief/progression/commitment instructions; shared prompt rules, schemas, reducer validation and secrecy checks remain identical. Production defaults remain on.
  - Reuse the existing six-dimension evaluation gates and add explicit scoring for substantive answers, actionable progression or a credible exhausted trail, causal consistency, committed-fact reuse, NPC knowledge limits and player agency/reversibility. A calm ending and a genuine dead end may pass; false clues, forced escalation and repetitive non-answers fail.
  - Keep stubbed deterministic coverage in CI. Document a manual/explicit-opt-in live comparison in `docs/adventure-evaluation-protocol.md`, including the conditions, sample sizes, observed rubric results, latency, token usage and estimated cost when the provider reports the data.
  - Define a minimum evidence bar before any future change to global model or reasoning defaults; this feature does not change those defaults.
- **Out of Scope**:
  - No paid or network-dependent CI test, automatic benchmark schedule, analytics event, user-facing benchmark UI, or raw prompt/narration export from the new synthetic Director harness. The separately requested Last Grind HTML report is a prior-evaluation artifact.
  - No production model/effort default change, new GM behaviour outside the evaluation treatment seam, new adventure engine, or changes to player-facing adventure state.
  - No claim that one stochastic playthrough proves causation. A single live run per condition is descriptive evidence only.

### Acceptance Criteria

- [x] A scripted synthetic multi-turn fixture is reproducible and exercises the stated failure patterns without depending on a live model.
- [x] The evaluator runs the 2 × 2 Director/effort matrix at fixed `luna-fast` settings in both retained and reconstructed-context modes, using identical fixture state and actions. Director-off is a QA-only prompt treatment; production defaults remain Director-on.
- [x] Existing hard gates for secrecy, canon safety, player agency, continuity and credible consequences remain active. Evaluation notes distinguish a meaningful answer/progression, a fair limitation with a useful route, and a valid exhausted trail from repeated non-answers or invented clues.
- [x] Tests verify the actual model key, requested effort, context mode and any reset classification from generation metadata; unknown metadata remains unknown rather than being inferred. Tests cover a generation/commit failure and a reset or retry path.
- [x] At least one manual/opt-in live multi-turn comparison can be recorded with sample size, per-condition results, latency, token usage and estimated price when usage and registry pricing are available. Missing usage or pricing is reported as unavailable, not guessed from character counts.
- [x] The protocol states an evidence threshold for proposing a global default change, records failure/cost/latency trade-offs, and makes no causal claim from a single stochastic run.

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - `packages/adventure-engine/src/prompt.ts`: add a default-on, internal Director treatment option that omits the Director brief, Director-derived investigative progression instruction and causal-commitment instruction only in the evaluation control arm.
  - `packages/adventure-engine/src/evaluations.ts` and a focused sibling evaluation helper if needed: add the benchmark's progression/knowledge/reversibility scores without weakening the current six rubric dimensions or expanding a bounded-responsibility file.
  - `packages/adventure-engine/tests/fixtures/gm-director-evaluation.ts` and focused tests under `packages/adventure-engine/tests/`: store the synthetic session, known truth/knowledge boundaries, scripted actions and deterministic expected signals.
  - `apps/web/src/lib/services/adventure/adventure-evaluation-runner.ts`: accept an explicit evaluation condition (model key, reasoning effort, Director treatment, context mode), execute identical turns for each condition, and capture bounded metadata and scores. Keep run data transient.
  - `apps/web/src/lib/services/adventure/adventure-evaluation-runner.test.ts`: verify condition forwarding, reset/reconstruction behaviour, deterministic scoring, and failed generation/commit handling with stubs.
  - `packages/ai-engine/src/adventure-generation.types.ts`, `adventure-interaction-transport.ts`, `adventure-interaction-generation.ts`, `adventure-content-generation.ts`, and `generation-request.ts` only as required to forward the evaluation treatment/effort and expose returned token usage to the runner. The retained Interactions adapter currently drops `modelKey`/`usage` returned by `ProxyInteractions`; the stateless operation-pipeline adapter currently omits `reasoningEffort` from its request body. Preserve normal production defaults and do not persist evaluation telemetry in `AdventureSession`.
  - `docs/adventure-evaluation-protocol.md`: add the synthetic benchmark procedure, the condition table, safe reporting format, evidence threshold, and findings section. Never include a real GM-only diagnostic.
- **Data Contracts & State Flow**:
  - Each condition starts from an identical cloned fixture and commits locally through the existing Adventure reducer. Provider conversation state is only transport context; the saved fixture session remains authoritative.
  - Retained mode reuses the provider interaction while the local session commits each turn. Reconstructed mode sends the saved state/transcript without provider history. The scripted reset starts a new provider interaction from the same committed local state.
  - Evaluation metadata is transient: actual registry key, requested reasoning effort, transport/context mode, actual reset reason where available, model-call count, latency, input/output token usage and estimated price. Do not record prompts, response bodies, secrets, provider raw interaction IDs, API keys or user identifiers. If provider token usage or registry price is absent, record `unavailable`.
  - The Director control seam defaults to `on` for every existing production call. No schema, persistence, migration or UI changes.
- **UI & Design Tokens**: Not applicable; this adds no UI.

### Key Technical Decisions & Tradeoffs

- Reuse the existing `AdventureEvaluationRunner` and six-dimension rubric rather than create a second evaluation pipeline. Keep the new progression scoring separate from security/canon stop-ship checks so a good story score can never mask a secrecy failure.
- Define Director on/off as a prompt-treatment comparison on the same code and reducer version, not a comparison of unrelated historical commits. Keep all shared instructions identical; document that the treatment estimates the effect of Director-specific context and guidance, not every code path introduced by #5109–#5111.
- Use a small, fixed condition matrix: Director off/on × reasoning low/medium × retained/reconstructed context, all on `luna-fast`. Run calls sequentially and manually/with explicit opt-in. CI uses deterministic stubs only.
- Preserve actual transport facts from #5112 metadata. If a reset cannot be classified by a bounded, truthful reason, report it as unknown. Do not estimate token counts from request characters or claim interaction reuse when the transport cannot establish it.
- Before any future global default change, require at least three paired replays per condition across at least two synthetic fixtures, a consistent improvement in the predeclared progression score, no secrecy/canon/agency stop-ship failures, and a recorded latency/cost trade-off. This PR establishes the bar; it does not authorize or implement a default change.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: the same action sequence produces condition-labelled deterministic results; the live run reports actual model, effort, transport, resets and rubric outcomes, with available usage/cost.
- **Negative / Error Path**: invalid proposals, rejected reducer commits, provider failures, missing usage, missing price and metadata marked unknown remain visible as failed/incomplete/unavailable results; they are not silently scored as success or inferred from text sizes.
- **Cancellation / Edge Case**: aborts and retries leave committed session state unchanged until the reducer accepts a turn; retries do not add duplicate facts or advance the action script. A peaceful action, ignored lead, true dead end, no scenario, or provider-history reset remains a valid condition and cannot trigger forced escalation.

## 3. Tasks & Execution Sequence (When)

- [x] **Task 1: Audit and failing tests (TDD)** — Verified the runner and both generation transports' condition/telemetry capabilities. Added deterministic coverage for the condition matrix, QA-only Director-off prompt, effort forwarding, reset/reconstruction, progression signals, secrecy/causality gates, and failed generation/commit.
- [x] **Task 2: Deterministic fixture and scoring** — Added the synthetic scenario/action fixture and focused progression/knowledge scoring. Reused existing secrecy, canon, continuity, agency and consequence checks; peaceful and honestly exhausted paths remain valid.
- [x] **Task 3: Evaluation condition plumbing** — Extended the runner for fixed model/effort/Director/context conditions from isolated fixture snapshots. Added a default-on Director prompt seam and transient metadata; forwarded reasoning effort and provider usage when available.
- [x] **Task 4: Protocol and bounded live comparison** — Documented the eight-condition opt-in procedure, reset classification, evidence bar and sanitized reporting. Ran a paired retained-context low-effort comparison; both Director-off and Director-on passed all eight turns and all recorded signals. The result is descriptive only.
- [x] **Task 5: Verification Gate** — Impacted tests, changed-file lint, web workspace type-check and Fallow audit pass. No repository-wide test, lint or type-check command was run.

## 4. Verification Gate

```bash
(cd packages/adventure-engine && bun test tests/evaluations.test.ts tests/living-settlement-long-run.test.ts tests/gm-director-evaluation.test.ts)
(cd apps/web && bunx vitest run src/lib/services/adventure/adventure-evaluation-runner.test.ts src/lib/services/adventure/adventure-multi-scenario-gates.test.ts)
bun run test:changed
bun run lint:changed
(cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error)
bunx fallow audit --format json --quiet --explain --gate-marker agent
```

Live-model runs are manual/explicit opt-in and are not part of this verification gate.
