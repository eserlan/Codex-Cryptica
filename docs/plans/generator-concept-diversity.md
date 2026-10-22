# Generator concept diversity

**Problem:** most generations reuse the same handful of concepts. Over about 50 live mystery runs, 30 titles mentioned a bell ("The Bell Beneath the Chapel" came up 17 times), and ledgers, chapels, lanterns and tides recur across other generators too.

**Causes:**

1. **Shared exemplars.** The examples in `campaign-generator-exemplars.ts` share one coastal world. Across them: ledger 22 times, salt 17, tide 17, harbour 16, debt 15, bell 13. The "do not reuse names" note doesn't stop motifs carrying over.
2. **Prompt anchors.** Seed libraries and prompt examples use the same motifs. The one-shot seeds include "a stolen relic bell" and "the reeve's ledger", and the mystery stage 1 examples are gothic.
3. **Default settings.** Default runs send identical options, and nothing in the prompt varies them.
4. **The mystery structure.** It always requires a central key item, which pushes the model towards relics and documents.
5. **History tracks the wrong thing.** `generation-input-history.ts` remembers the options chosen, not the concepts generated.

**Goal:** generations differ in concept (situation, stakes, setting, central device), not just in names. This is not a ban on bells or ledgers; they just stop being the model's default.

---

## PR 1: remove the anchors and roll variety in code

Branch: `feat/generator-concept-diversity`

**Status: implemented, not yet committed.** T6 found a gap in titles (see below), which PR 2 is meant to close.

### T1. Rewrite the shared exemplars

File: `packages/generator-engine/src/campaign-generator-exemplars.ts`

- [x] Each example has its own world: no cross-references and no shared names (Greywick Landing, Salt Concord, Ottavia Brenn are gone).
- [x] None uses bells, ledgers, salt, tides, harbours or debt as its central device. Word-boundary check: the only hits left are substrings in "unlabelled" and "underbelly", which are not motifs.
- [x] Every heading each schema requires is kept. The heist, tome and NPC tests pin these.
- [x] All 33 exemplars rewritten or adjusted.

### T2. Overlap guard test

File: `packages/generator-engine/src/campaign-generator-exemplars.test.ts`

- [x] Motif anchors (bell, ledger, tide, harbour, salt, chapel, lantern, debt) may appear in at most 1 exemplar each.
- [x] **Changed from the first draft:** a flat "no content word in more than 2 exemplars" rule fails on ordinary English (before, title, party, quiet…). The general rule is now: no content word in more than 8 of 33 exemplars (a quarter). Function words and schema headings are on a stoplist, which is large (about 260 words). The stoplist is the weak point: it can hide a real overlap, so the motif list is the strict check.
- [x] Negative case: a crafted overlapping fixture is flagged.

### T3. Clean up prompt examples and seed libraries

- [x] `public-heist.ts`: the example sentence is now the Halden Seed.
- [x] `public-news-sheet.ts`: "The Harbourside Ledger" is dropped from the title examples.
- [x] `one-shot-seeds.ts`: relic bell, reeve's ledger, festival bells, the bell ritual, plague ledger, the bell in the square, the bell tolls and the church bell tower are replaced.
- [x] `public-mystery.ts`: the fallback titles are new, and the local fallback clue lines no longer mention a bell or a ledger.
- [x] `mystery-staged.ts` stage 1: the key item is a physical object or piece of evidence (not a person, secret or relationship; see T6), and the gothic method examples are neutral.
- [x] The registry test's NPC exemplar name is updated.

### T4. Shared random dimensions

File: `packages/generator-engine/src/concept-dimensions.ts` (pure, injectable random source, `villain-diversity.ts` pattern)

- [x] Dimensions: `situation`, `conflictSource`, `distinctiveElement`, `stakeKind`.
- [x] Genre fit in three layers: shape-not-setting entries (untagged), five genre families (`pre-industrial`, `gothic`, `modern`, `space`, `post-apocalyptic`), and a `dark` tag kept away from Hopeful tone and the optimistic genre.
- [x] `rollConcept(genre, tone, rng, avoidIds)`, `formatConceptBlock(choices)`, and `conceptPool` for inspection.
- [x] Tests (15): seeded determinism, pool filtering, family filtering, `dark` exclusion, avoided ids with fallback, custom genre, minimum six options per genre and dimension, and formatting.

### T5. Wire the dimensions into the story generators

- [x] Mystery: stage 1 of the staged path (`mystery-staged.ts`) and the one-pass prompt (`public-mystery.ts`). The rng is injectable.
- [x] One-shot: the core stage (`one-shot-staged.ts`). Later stages build on the locked core.
- [x] Adventure, heist and tome: `contextChain` for those ids only, rolled once per request (cached in a `WeakMap`), not for interaction (refinement) requests.
- [x] Villain keeps its own dimensions.
- [x] Tests cover each path, the context order (campaign context stays first), the failure path, and the cache. The cache test pins `Math.random` and fails if the cache is removed.

### T6. Live check

Scratch scripts, not committed. Default options (Classic Fantasy, default tone). Adventure and heist were not run live: they go through the app's campaign path, which needs more setup than the scratch script.

**Mystery, 16 runs with the concept block (two batches of eight):**

| Variant                                      | Succeeded | Notes                                                                                                                      |
| -------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------- |
| Concept off, new key-item wording            | 8 of 8    | Still 3 of 8 titled "The Bell Beneath the Chapel": the bell comes from the model's own prior, not from the staged prompts. |
| Concept on, new key-item wording             | 1 of 8    | Failures at stage 3 (independent routes). Making the key item a person or secret breaks routes. Reverted.                  |
| Concept on, old key-item wording             | 5 of 8    | Titles more varied, but still failures.                                                                                    |
| Concept on, physical key-item wording        | 7 of 8    | Titles varied (fog, springs, floods, a council vote).                                                                      |
| Concept on, after the grazing-feud rewording | 7 of 8    |                                                                                                                            |

Target from the plan: no motif in more than 2 of 16, and no "The X Beneath Y" pattern in more than 3.

- **Situations: met.** The concept block gives clearly different situations.
- **Titles: not met.** Six of the 14 successful titles contain "Bell" (five if "Bellwrit" is excluded), and five use "Beneath". The model invents titles, and the stages don't constrain them. PR 2's seed stage (candidate `titleIdea`s, recent-seed filtering) is the planned fix. Adding a title rule to PR 1 would be a blacklist, which this plan rejects.
- Success rate: 14 of 16 across the two final batches, against 8 of 8 without the concept block. The gap is open; the stage 3 route check is the likely cause, not the concept itself.

### T7. Validate and open the PR

- [x] `bun scripts/lint-changed.mjs`: passes.
- [x] `bun scripts/test-changed.mjs`: passes.
- [x] Whole `packages/generator-engine` suite: 2,711 pass, 1 fail. The failure is `heist-generation.test.ts` "retains the original when repair output is unusable", which also fails on the clean branch because the runtime's JSON parse message differs from the test's expectation. Not caused by this PR.
- [x] `bunx fallow audit`: pass (no introduced findings after splitting `conceptBlock`).
- [x] codex-review: run, one finding fixed (the non-discriminating cache test).
- [ ] Open the PR, with the T6 table in the body and the title gap stated.

---

## PR 2: LLM seed stage (pick from candidates)

Branch: `feat/generator-concept-seed`, stacked on PR 1 (`feat/generator-concept-diversity`) because it uses `concept-dimensions.ts`.

**Status: implemented for mystery and one-shot. Adventure, heist and tome are deferred** (see T10).

Code rolls the dimensions. The model writes several consistent seeds that fit them, and code picks one. Choosing from a list instead of taking the first answer counters mode collapse, because a model's first idea is always its most typical. This PR also owns the title problem from T6.

### T8. Shared seed stage

File: `packages/generator-engine/src/concept-seed.ts`

- [x] `generateConceptSeed({ genre, tone, context, recent }, { complete, rng, signal })` asks for five candidates shaped `{premise, stake, setting, distinctiveElement, titleIdea}`, consistent with the rolled dimensions and the context. It checks the reply with `askChecked` (the runtime that `runCheckedStage` wraps; it has no progress object to update). Only the first five candidates are considered, even if the model returns more.
- [x] Picks at random among candidates that share fewer than two content words with a recent seed (premise and title idea). If every candidate repeats, picks at random among the least similar.
- [x] Returns `null` when no usable reply arrives after retries, or when the call fails, so the caller falls back to the rolled dimensions. Cancellation propagates.
- [x] Tests (14): complete and incomplete candidates, trimming, bad shapes, repeat filtering, least-similar fallback, the injected rng, the recent seeds and dimensions in the request, unreadable replies, a failing call, partial replies with a retry, cancellation, the candidate cap, and the block format.

### T9. Seed history

File: `apps/web/src/lib/services/seo/generation-input-history.ts`

- [x] `GenerationSeedHistoryStore`: session storage under `GENERATION_SEED_HISTORY`, five seeds per generator, most recent first, one per premise. Malformed and blank entries are dropped on read and write.
- [x] Mystery (web) and one-shot (web) read the history and record the accepted seed.
- [ ] The campaign mystery path has no web history yet and passes `recent: []`.
- [x] Tests (7): record and read back, per-generator keys, premise de-duplication, the cap, blank and incomplete seeds, malformed stored entries, and unavailable storage. A blank-premise bug was found by these tests and fixed.

### T10. Lock the seed into the stage pipelines

- [x] **Mystery** (`mystery-staged.ts`): `deps.seed` replaces the rolled concept in stage 1 with a locked case seed block. The title idea is the suggested title. Callers run the seed first: the web service (with history) and the campaign path (`campaign-mystery-generation.ts`).
- [x] **Mystery one-pass** (`public-mystery.ts`): `buildMysteryPrompt` now returns `context` (campaign and session context only). The staged route uses `context`, so the one-pass concept block no longer reaches stage 1. The web staged route previously passed `userMessage` as its context, which also carried the one-pass instructions; that is now `context`, a behaviour change.
- [x] **One-shot** (`one-shot-staged.ts`): `deps.seed` replaces the rolled concept in the core stage. The web caller runs the seed first, with one-shot history.
- [ ] **Adventure, heist, tome**: deferred. Their prompts are built synchronously from the context chain, so they need an async pre-pass in the campaign service, as the name pre-pass does. That is a separate change.
- [ ] "Imagining the premise" progress step: not added. It would change the step lists that the staged progress tests pin. Users will see no step while the seed call runs.

### T11. Live check

Scratch scripts, not committed. Default mystery options (Classic Fantasy). Each batch of eight ran in parallel; each batch received the previous batch's accepted seeds as history, the same as a session.

| Variant                                                                  | Succeeded      | Successful titles with "Bell" | Titles with "Beneath" |
| ------------------------------------------------------------------------ | -------------- | ----------------------------- | --------------------- |
| Seed on (five batches, 40 runs)                                          | 27 of 40 (67%) | 1 of 27                       | 0 of 27               |
| Seed off, concept block only (three batches, 24 runs, earlier and today) | 18 of 24 (75%) | 10 of 18                      | 9 of 18               |

- **Titles: met.** The seed stage removes the bell and "Beneath" defaults from the titles. This was the reason for the stage.
- **Success rate: inconclusive.** The 8-point gap is within the noise at these sample sizes. Most failures in both variants stop at stage 3, the independent-route check, which is a pre-existing staged-route issue.
- **Locked vs soft seed block:** the locked wording (the plan's design) was used for 32 runs, 21 succeeded (66%). A softened wording gave 6 of 8 in one batch. Too few runs to choose between them, so the locked wording stays.
- The seed-off baseline was measured on a noisier day: 4 of 8, with 4 bell titles. The earlier 7 of 8 and 7 of 8 batches are not directly comparable.

### T12. Validate and open the PR

- [x] `bun scripts/lint-changed.mjs`: passes.
- [x] `bun scripts/test-changed.mjs`: passes.
- [x] `packages/generator-engine` suite: passes, except the pre-existing heist failure (also fails on the clean branch).
- [x] `apps/web` svelte-check: 0 errors. It found a type error in PR 1's `concept-dimensions.ts`; fixed here and in PR 1.
- [x] `bunx fallow audit`: see the PR body.
- [ ] codex-review and the PR.

---

## Out of scope for now

- Leaving out the exemplar when the vault already has world context. Revisit after T6 shows how much the exemplars alone drove the repetition. T6 suggests the exemplars were not the main driver of the bell titles, since the bell appeared with the concept block off.
- Seed stages for single-call generators (NPC, rumour, item). These keep the plain random draw from T4.
- The stoplist-based overlap test (T2). Replacing it with a corpus-level check would be more accurate, but it needs a separate design.
