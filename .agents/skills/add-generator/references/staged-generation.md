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
