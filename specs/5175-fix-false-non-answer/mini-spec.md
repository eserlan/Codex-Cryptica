# Fix False `repeated-non-answer` Flags on Responsive Witness Replies (#5175) Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

`classifyTurnProgress` in `packages/adventure-engine/src/turn-progression.ts` flags investigative inquiry turns as `repeated-non-answer` (and sets `nonAnswer: true`) whenever `isTurnNonAnswer(turn.narration)` matches any negation or epistemic-limit phrase anywhere in the narration (via `isNonAnswer` in `dialogue-pacing.ts` or `EXTRA_NON_ANSWER_RE`). As a result, witness replies that **do** answer the player's immediate question—while truthfully stating a limit on another aspect—are misclassified as `repeated-non-answer`, distorting `investigativePacing` (`repeatedNonAnswerTurns`, `investigativeRecoveryDue`), `gm-director-pacing`, and GM-only diagnostic summaries.

### Scope & Boundaries

- **In Scope**:
  - **Clause-aware & patch-aware non-answer detection** (`packages/adventure-engine/src/turn-progression.ts`, `dialogue-pacing.ts`, `investigative-pacing.ts`): distinguish a **responsive answer + epistemic qualification** (or fulfilled request such as a summoned NPC arriving) from genuine circular deflection, refusal, or incidental-fact non-answers.
  - **Conservative fallback**: when a responsive answer has an epistemic limit and does not trigger a higher-priority meaningful category, classify it conservatively as `ordinary-interaction` (or `no-observable-change` if quiet) with `nonAnswer: false`, rather than inventing meaningful progress.
  - **Preserve existing vocabularies & negative findings**: retain the 9-category `TurnProgressKind` vocabulary, backwards-compatible turn metadata, `useful-negative-finding` classification, and detection of genuine `repeated-non-answer` loops (including incidental-fact non-answers).
  - **Regression tests**: cover all 6 scenarios (direct answer, partial answer with limitation, summoned person arriving, actual refusal, duplicated evasions, question genuinely unanswered after new incidental facts) across `turn-progression`, `investigative-pacing` / Director pacing, and GM-only diagnostic summary (`adventure-review-capture`).

- **Out of Scope**:
  - Rewriting historical turn classifications retroactively.
  - Adding a second/mandatory AI call for turn classification.
  - Modifying player-facing prose, action outcomes, canon, or Director tracing (#5153/#5154).

### Acceptance Criteria

- [ ] Responsive witness replies with truthful limits—including the three synthetic cases from #5175 (identifying Master Vale while not knowing the other household; summoning the steward who confirms deliveries and offers a ledger; naming office/recipient/time while unable to identify additional witnesses)—are **not** classified as `repeated-non-answer` (`nonAnswer: false`).
- [ ] Repetitive refusals, pure deflections/redirects, and inquiries followed only by unrelated/incidental facts still classify as `repeated-non-answer` (`nonAnswer: true`).
- [ ] `investigativeRecoveryDue` is not spuriously triggered by qualifying statements in responsive replies, while genuine non-answer loops still trigger recovery.
- [ ] No change to player prose, action outcomes, canon, 9-category vocabulary, or AI call count.
- [ ] Tests verify `classifyTurnProgress`, `investigativePacing` / `buildGMDirectorBrief`, and `adventure-review-capture` GM-only diagnostic summary.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- `packages/adventure-engine/src/turn-progression.ts`:
  - Add `isInquiryTurnNonAnswer(turn, session)` (or refine `inquiryNonAnswer` computation in `classifyTurnProgress`) to check whether a turn whose narration contains a non-answer / epistemic-limit phrase (`isTurnNonAnswer`) actually provided a responsive answer via:
    1. **Fulfilled request / on-topic committed patch**: e.g. requested NPC added to `visiblePatch.activeCharacters.add`, or a non-denial `knownFacts.add/update` or player-visible `provisionalFacts` entry that addresses the inquiry's question target (excluding pure accounting/incidental lines unrelated to the question).
    2. **Substantive affirmative narration clause**: splitting `narration` into sentences/clauses and stripping speaker/stage-business framing (e.g. `"The clerk flips a page."`, `"The ferryman mutters:"`) and pure redirects (e.g. `"ask at the weighhouse"`), checking whether at least one substantive affirmative clause remains that is free of non-answer/denial/deflection markers and not merely a negative finding.
  - Use the same turn-level helper in `isNewLocationTravel` so responsive-with-caveat travel narration is not penalized as a travel deflection.
- `packages/adventure-engine/src/investigative-pacing.ts`:
  - Ensure `isNonAnswerInquiry` and `isBareWaitTurn` remain consistent with `turn-progression.ts` (relying on `classification.nonAnswer` / `classification.kind === "repeated-non-answer"`).
- `packages/adventure-engine/tests/progression-pacing.test.ts` & `apps/web/src/lib/services/adventure/adventure-review-capture.test.ts`:
  - Add the 6 regression fixtures and verify `classifyTurnProgress`, `investigativePacing`, `buildGMDirectorBrief`, and `copyDiagnosticSnapshot` (`summary.progression` / `repeated-non-answer` counts).

### Failure, Edge & Cancellation Paths

- **Partial answer with qualification**: `"Master Vale; the steward is inside. I don't know the other household."` → affirmative clauses (`"Master Vale"`, `"the steward is inside"`) → `nonAnswer: false`, not `repeated-non-answer`.
- **Genuine refusal / deflection with stage business**: `'The clerk flips a page. "There is no record here, and I cannot name the creditor."'` + incidental fact `"Weighhouse tally lists 9 bushels unpaid."` → stage-business intro + two negative/non-answer clauses + incidental accounting fact → `repeated-non-answer` (`nonAnswer: true`).
- **Redirect without answer**: `'The ferryman mutters: "I don\'t know who took it; ask at the weighhouse."'` → speaker intro + non-answer + redirect → `repeated-non-answer` (`nonAnswer: true`).

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Implement responsive-vs-non-answer classification** in `packages/adventure-engine/src/turn-progression.ts`.
- [ ] **Task 2: Add regression tests** in `packages/adventure-engine/tests/progression-pacing.test.ts` and `apps/web/src/lib/services/adventure/adventure-review-capture.test.ts` covering all 6 scenarios, Director pacing, and GM-only diagnostic summary.
- [ ] **Task 3: Verification Gate** — Run `packages/adventure-engine` progression/dialogue tests and `apps/web` review-capture tests, then commit, push, and open PR targeting `staging`.
