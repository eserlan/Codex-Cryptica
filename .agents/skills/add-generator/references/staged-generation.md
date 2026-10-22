# Staged AI generation (complex generators only)

Read this when a generator's sections depend on each other. It extends `SKILL.md` Part B; everything there still applies.

A one-pass prompt asks for every section in one answer, so later sections are written before the model has settled the earlier ones, and a repair pass then has to untangle contradictions. A staged route writes the content in the order it depends on itself, and each stage sees only the validated output of the stages before it.

**Stage only when it pays for itself.** Staging costs 3–5 model calls instead of 1–2, plus the latency. Use it when at least one of these holds:

- Later sections must agree with earlier ones (history → locations → factions, premise → scenes → finale, topology → keyed nodes).
- The mechanical layer fixes structure the model must honour: ids, counts, stock types, drives, a graph.
- One-pass output keeps contradicting itself across sections, and the consistency pass or repair keeps catching the same class of error.

Do **not** stage simple generators (NPC, name, tavern, rumour, single-item). A consistency-pass line in the prompt (`SKILL.md` Part B step 1) is enough there.

**Templates**, most complete first: `packages/generator-engine/src/dungeon-staged.ts` (#4133, #4206), `adventure-staged.ts` (#4135), `point-crawl-staged.ts`, `one-shot-staged.ts`, `public-council-vote.ts` (#4136, #4225, 4-turn chat session via `runCouncilVoteFourTurn`, coalition diversity and concise operational narrative). Council Vote requires one seat-by-seat projected ballot and a structured tally for each tier; its production paths reject results that fail the checks against the foundation. Shared helpers live in `staged-runtime.ts` (#4134) and `staged-progress.ts`. Copy the dungeon or adventure shape.

## The pattern

1. **Fixed plan from the resolver, never from the model.** Ids, counts, types, assigned drives and the layout/topology come from `resolve<Name>()`. Validators reject output that departs from it, and assembly overwrites anything the model shouldn't own (e.g. `drive`). If something depends on a place, the layout goes into every stage that places it, and the parser must render the _planned_ layout, not re-roll it.
2. **Stages follow the dependency order.** Each stage gets the earlier stages' validated output labelled "established, do not change", plus a "Stage N of M" marker (tests route on it). Tell each stage what _not_ to write yet.
3. **Pure, exported validators per stage** returning `{ hard, soft }` (`DraftCheck`). `hard` means unusable (wrong ids, missing fields, banned names). `soft` means usable but doubtful (heuristic grounding). Run stages through `runCheckedStage` (`staged-runtime.ts`), which gives each stage **one** retry that names the problems and includes the previous answer (`withRetryFeedback`), updates `StagedProgress`, and keeps the best draft without hard problems if the retry is worse.
4. **Represent the current state.** If occupants (factions, NPCs) are written after the places, have them write back what they changed in each place they hold (dungeon `presence` → "Held by X"). Otherwise the place reads as untouched.
5. **Assemble through the existing one-pass parser** (`parse<Name>ResponseDetailed`), so rendering, name rules and fallbacks are identical on both routes.
6. **Coherence:** run the deterministic checks, then one model review of the assembled result (retried once, max ~5 issues). Feed both to one targeted repair. Accept the repair only if it parses and adds no deterministic problems. A missing review never blocks the result.
7. **Failure and abort.** If a stage stays unusable, return `null`; the caller then runs the one-pass route, which keeps its local fallback. An abort throws (check the signal between calls with `throwIfAborted`, rethrow `AbortError`), and nothing partial is returned.

## Making it reliable against a real model

Unit tests with scripted replies will not catch these; they only show up against the live worker. Mystery (#4330) shipped with every one of them and fell back to the local draft on every run.

- **Put the exact JSON shape in every stage prompt** (keys, nesting, "plain strings"). A prompt that only says "establish a summary, constraints, a timeline" gets `playerSafeSummary`, array `constraints`, object timeline events and `revelationId`, and every validator rejects it.
- **Normalise before you validate.** Add a pure `<name>-staged-normalize.ts` that maps common key aliases and value shapes (list or object to string, alias ids) onto the contract, and run it on each reply inside the stage's `complete` wrapper, so the stored "locked" data is already normalised. Tolerate shape drift; keep rejecting missing content.
- **Enforce locked facts in code, and say them in the prompt.** If a later stage must repeat a locked value (the culprit's name), overwrite it in the normaliser and name the exact value in the prompt.
- **Derive structure the model is bad at.** Graph-like data (independent evidence routes) is cheaper to derive from the clues than to coax from the model. Top up from data the model already gave; do not invent content.
- **Repair merges, it does not replace.** A repair reply that omits or reshapes an object must be merged over the previous object before it is validated.
- **Give every stage the banned-name list** (`BANNED_NAMES` plus `avoidNames`) in the system prompt. Models reuse "Vale" and "Voss" constantly, and the name check will reject them.
- **A reporting-only final audit must not discard a valid case.** Once every structural check has passed, remaining wording-level doubts from the last review are logged, not fatal. Accept unknown audit statuses by mapping them from the issues list.
- **Render what the model returns.** Do not pass a list of strings through a helper that expects records (it renders empty). Players must never see internal ids (`clue-3`); label them ("Lead 3").
- **Validate against the live model before opening the PR.** Run `bun run dev:proxy` (use `--port` if 8787 is taken) and the web app with `VITE_ORACLE_PROXY_URL` pointing at it. Drive the staged function from a script that posts to the worker and run it 6-8 times in parallel; log each retry's problem list to see which check keeps firing; keep going until every run succeeds. Then click through the real page once. Expect 60-100 s for a 7-call pipeline.

## Wiring

- **Public** (the generator's method in `apps/web/src/lib/services/seo/generator-engine-*.ts`): staged by default, `staged: false` forces the one-pass baseline, and `signal` is threaded to `runModel`.
- **In-app** (`campaign-generator-service-ai.ts`): try staged first with `contextChain` as `contextPrefix`. Anything the staged calls cannot carry stays on the one-pass route: a continuity thread (`request.interaction`), streaming previews, prompt metrics.
- **Progress list:** use `StagedProgress` (`staged-progress.ts`). Add the step ids to `StagedStepId` in `staged-progress.ts`. In `generator-page-generation.ts`, reset with `ctx.onOneShotProgress?.(null)`, pass `onProgress: ctx.onOneShotProgress` and `signal: ctx.oneShotRuns?.start()`. Add the slug to `NON_STREAMABLE_SLUGS` in the same file, and to the `progressSteps` condition and `supportsStreaming` exclusion list in `GeneratorPageContent.svelte`. Step labels are plain language ("Sectors, hazards and treasures").
- **Diagnostics:** return stats (`outcome`, `stoppedAt`, `aiCalls`, repaired stages, review findings, remaining issues) via an `onStats` dep. Log them only behind `import.meta.env.DEV` with `console.debug` (public engine, and `CampaignGeneratorModal` through a `CampaignGeneratorServiceDeps` callback). Never send them anywhere.

## Tests

- One test per validator, and a scripted `complete()` that routes replies by the stage marker string.
- Cover: happy path (call count, fixed plan kept), a retry that fixes a stage, a kept first draft when the retry is junk, `null` plus `stoppedAt` on an unusable stage, abort mid-run, an unreadable review, an accepted repair, and the progress statuses (including fallback/skipped).
- Any regex over generated prose needs a counterexample table: flagged and not-flagged inputs (see codex-review `patterns.md` → Heuristic Prose Checks). Keep it a soft problem with its limits in the doc comment.
- For each changed hunk, name the test that fails if it is reverted.

### Causal integrity for mystery-style generators

Valid shape is not the same as solvable. Require, in the locked foundation, where the central object is now, who holds it, its intended fate and how it is recovered, plus why the chosen method was needed. Give every revelation a `kind` and make sure the culprit, motive and object are each covered. Check that at least one clue leads to the object's location, and that the two routes to a revelation share no clue and start at different sources. Make the audit prompt list these invariants explicitly. If a repair reply is unusable, keep the case that already passed its checks instead of falling back.
