# Expand AI DM Evaluation Coverage — Mini-Spec

> Issue: [#5160 — Expand AI DM evaluation coverage beyond one 8-turn path](https://github.com/eserlan/Codex-Cryptica/issues/5160)

## 1. Specification (What & Why)

### Problem Statement

Last Grind is a useful targeted regression, but its single authored path cannot show whether the AI DM handles different scenes, player choices, and outcomes consistently. Add a small synthetic evaluation corpus and a paired Director comparison that reports authored-beat coverage separately from hard safety gates and progression signals.

### Scope & Boundaries

- **In Scope**:
  - Add at least two independent, spoiler-safe synthetic adventure fixtures, each with multiple plausible action paths including a quiet or off-script route.
  - Cover bounded witness knowledge, repeated questions, useful leads after a witness cannot answer, clue inspection, uncertain testimony, earned reveals and consequences, failed or partial actions, player corrections, context reset recovery, ignored leads, peaceful detours, and leaving without forced escalation.
  - Score each authored beat as `present`, `partial`, or `absent`; keep secrecy, canon/source fidelity, agency, continuity, and existing progression signals as separate results.
  - Capture one turn's player-facing output and expected beats in the report while excluding prompts and GM-only material. Redact that output when a hard secrecy gate fails.
  - Provide deterministic stub coverage and an explicitly opt-in live paired comparison. Report sample size, latency, provider-reported token usage, and registry-priced cost only when available. Mark results descriptive unless there are at least three paired replays per condition on at least two fixtures.
  - Keep Last Grind as a focused regression and preserve its existing evaluation path.
- **Out of Scope**:
  - No paid or network-dependent CI calls, automatic benchmark schedule, analytics, user-facing UI, production prompt changes, model/effort default changes, or changes to persisted adventure state.
  - No general-quality or causal claim from one scenario or fewer than the stated paired sample threshold.

### Acceptance Criteria

- [x] At least two distinct synthetic fixtures exercise different scene and interaction patterns; each has more than one plausible path, including a quiet or off-script path.
- [x] Fixtures declare expected beats and hard failures; beat scoring returns `present`, `partial`, or `absent` independently of existing hard gates and progression signals.
- [x] Deterministic stub tests cover success and negative/failure paths without provider calls, including reset recovery, a failed/partial action, and secrecy redaction.
- [x] The report presents each turn's player-facing output alongside its expected beats and separate safety, progression, agency, and continuity results.
- [x] The opt-in live comparison pairs identical initial state and actions across Director treatments and fixtures; it reports latency, supported usage, and registry-priced cost without inventing missing values.
- [x] Evidence metadata prevents treatment claims unless at least three paired replays run for each compared condition on at least two fixtures.
- [x] Last Grind remains available as a targeted regression fixture.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - `packages/adventure-engine/src/evaluation-beats.ts`: pure, deterministic `present` / `partial` / `absent` scoring for authored beat evidence.
  - `packages/adventure-engine/src/index.ts` and `packages/adventure-engine/tests/evaluation-beats.test.ts`: export and test the scorer, including absent/invalid evidence cases.
  - `scripts/adventure-evaluation-corpus-fixtures.ts` and `scripts/adventure-evaluation-corpus-builder.ts`: define two independent synthetic fixture catalogues, alternate action paths, source excerpts, authored beats, hard-failure labels, and isolated sessions.
  - `scripts/adventure-evaluation-corpus-report.ts`, `scripts/adventure-evaluation-corpus-markdown.ts`, `scripts/adventure-evaluation-corpus-runner.ts`, and focused tests: pair captured player-visible turn outputs with fixture beats, evaluate evidence, keep safety/progression dimensions separate, report reset metadata, redact output on secrecy failure, and render model text as inert Markdown.
  - `scripts/adventure-corpus-eval.ts` plus focused tests: opt-in live paired runner over every fixture path, reusing the existing AdventureEvaluationRunner and local-proxy safeguards; emit sanitized JSON and Markdown summaries.
  - `scripts/adventure-director-eval.ts`: expose only the existing proxy-generation/metrics helpers needed by the corpus runner, preserving the current Last Grind command and report.
  - `docs/adventure-evaluation-protocol.md`: document corpus usage, pairing, sample threshold, and report limits.
- **Data Contracts & State Flow**:
  - Each path starts from a cloned synthetic `AdventureSession`; Director-on/off receives the same action list and fixture state. The existing runner remains responsible for committing turns and scoring its hard gates and progression signals.
  - A narrow generation-service decorator captures only the returned player-facing narration for its matching session/turn. Reports omit prompt contents, provider interaction IDs, credentials, GM-only state, and user data; player output is replaced with a redaction marker when the secrecy gate fails.
  - Beat evidence is scored by an explicit fixture-authored matcher and is not merged into the hard safety score. Missing output or missing evidence is `absent`; unavailable provider usage/pricing remains `unavailable`.
  - Live results are local artifacts behind an explicit `--live` opt-in. One or two samples or a single fixture are labelled descriptive and cannot qualify for a treatment claim.
- **UI & Design Tokens**: Not applicable; no UI changes.

### Key Technical Decisions & Tradeoffs

- Reuse the existing multi-turn runner, rubric gates, prompt-treatment seam, and provider registry rather than building another adventure execution engine.
- Keep fixture data synthetic and separate from Last Grind so corpus coverage expands without weakening the targeted regression.
- Use deterministic evidence rules for authored beats so CI remains reproducible and does not depend on a second model-as-judge. Show raw player-facing text for human inspection, but keep its beat score independently explainable.
- Keep live runs opt-in and sequential. Treat sample counts below three or fewer than two fixtures as descriptive only; never estimate unavailable token usage or price.
- Keep new modules bounded; do not add corpus logic to the existing 1,286-line evaluation runner.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: matched Director arms use cloned fixture sessions and action paths; every turn reports its player-facing result, beat coverage, hard gates, progression, and available operational metrics.
- **Negative / Error Path**: generation failure, rejected commit, missing output, and missing usage/pricing remain explicit in the turn/report; they do not count as passed beats or silently pass a hard gate.
- **Cancellation / Edge Case**: local runs with no `--live` make no provider calls; interrupted live runs do not qualify for a paired claim; secrecy failure redacts narration; a quiet or off-script route remains a valid path and is not scored as a failure merely for avoiding escalation.

---

## 3. Tasks & Execution Sequence (When)

- [x] **Task 1: Tests (TDD)** — Add failing tests for fixture-path pairing, beat states, output capture, failure/reset paths, secrecy redaction, and evidence-threshold labels.
- [x] **Task 2: Core Logic / Engine** — Implement the pure beat scorer and the bounded synthetic fixture corpus.
- [x] **Task 3: Report & Runner** — Implement per-turn report construction and an explicitly opt-in paired live runner using the existing generation path.
- [x] **Task 4: Protocol & Edge Cases** — Document corpus controls, supported metrics, sample threshold, and Last Grind's retained regression role.
- [x] **Task 5: Verification Gate** — Run impacted tests, changed-file lint, scoped TypeScript checks, and Fallow; inspect the final diff before opening a ready-for-review PR.

## 4. Verification Gate

```bash
bun scripts/test-changed.mjs --base origin/staging
bun scripts/lint-changed.mjs --base origin/staging
bun test scripts/adventure-evaluation-corpus-fixtures.test.ts scripts/adventure-evaluation-corpus-report.test.ts scripts/adventure-corpus-eval.test.ts scripts/adventure-director-eval.test.ts
(cd packages/adventure-engine && bun test tests/evaluation-beats.test.ts)
bunx tsc --noEmit --target ES2023 --lib ES2023,DOM --module preserve --moduleResolution bundler --strict --skipLibCheck packages/adventure-engine/src/index.ts
bun run fallow:audit
```

No live provider run is required for CI validation. If a live comparison is explicitly run, it remains opt-in and must use paired fixture/path samples.
