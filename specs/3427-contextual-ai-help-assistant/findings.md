# Findings: Contextual AI Help Assistant Spike (#3427)

**Date**: 2026-09-30 | **Branch**: `3427-contextual-ai-help-assistant` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Recommendation

**Retain lexical-plus-context retrieval as the baseline and defer deploying D1 + Vectorize.** The [#3612 comparison](#addendum-embeddings-comparison-3612) measured the current corpus: lexical recall@3 is 91.4% on the expanded set and 86.7% on the fresh frozen holdout. The production hybrid algorithm with complete vectors improves fresh recall to 93.3%, but lets two of ten unrelated questions through the retrieval floor; lexical refuses all ten. The fully embedded candidate reaches approximately 1 MB, so its size warrants review, but moving those same vectors to Vectorize would not fix the measured relevance and refusal regressions. Resolve those before extending hybrid retrieval or provisioning new knowledge-store resources.

Three things should be settled before wider exposure: the thin margin on the no-match threshold (see [Limits](#limits-of-the-evidence)), a larger independent evaluation set, and the repo-wide `reasoning_effort: "minimal"` problem described below.

## What was built

| Piece                                                                                                                                                                   | Where                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Framework-free engine: screen-description schema, action allow-list and validator, feature registry (5 entries), bundle builder, retrieval, prompt, response validation | `packages/help-engine/` (92 tests, 99.8% line coverage)         |
| `POST /api/help/ask`, `help-answer` operation, metric line, shared provider resolver                                                                                    | `apps/workers/oracle-proxy/src/help*.ts`, `llm/`                |
| Flagged Help panel, stores, client, highlight service, action runner, fallback                                                                                          | `apps/web/src/lib/{components,stores,services}/help-assistant/` |
| Hidden user article and a new Session Hub article                                                                                                                       | `apps/web/src/lib/content/help/`                                |

It is on only at staging, detected from the hostname at run time (plus `VITE_HELP_ASSISTANT=true` and a dev-build-only local switch), and appears only while the existing **AI Disabled** setting is off. Staging is detected at run time, not with a build flag, because the staging web build is promoted to production as the same artifact; a build flag would have switched it on in production too. With the flag off, none of the help code is downloaded: the production build puts the panel in its own 12 KB chunk, loaded by a dynamic `import()`, and the dev switch is absent from the shipped JavaScript.

## Deliverables from the issue

| Deliverable                      | Where it is settled                                                                                                                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Refine the architecture document | `docs/ARCH_CONTEXTUAL_AI_HELP_ASSISTANT.md` (new "Spike findings" section)                                                                                                                                         |
| MVP UX and assistant behaviour   | [spec.md](./spec.md) stories and clarifications; panel behaviour in [data-model.md](./data-model.md)                                                                                                               |
| Frontend context schema          | [contracts/screen-context.md](./contracts/screen-context.md), `packages/help-engine/src/context/`                                                                                                                  |
| Feature-registry schema          | [contracts/feature-registry.md](./contracts/feature-registry.md), `packages/help-engine/src/registry/`                                                                                                             |
| D1 schema and Vectorize metadata | [contracts/knowledge-store.md](./contracts/knowledge-store.md) (designed, not deployed)                                                                                                                            |
| Worker API contract              | [contracts/help-ask-api.md](./contracts/help-ask-api.md), `apps/workers/oracle-proxy/src/help.ts`                                                                                                                  |
| Safe UI action contract          | [contracts/help-actions.md](./contracts/help-actions.md), `packages/help-engine/src/actions/`                                                                                                                      |
| CI knowledge-sync approach       | [contracts/knowledge-store.md](./contracts/knowledge-store.md): two workflows, recommended for when D1 + Vectorize are adopted; the spike's own build-time bundle step is in `.github/workflows/deploy-worker.yml` |
| Cost and latency estimate        | Measured below                                                                                                                                                                                                     |
| One end-to-end vertical spike    | Built and exercised live and in a real browser                                                                                                                                                                     |
| Follow-up implementation issues  | [Follow-ups](#follow-ups-prioritised) (drafted, not yet created)                                                                                                                                                   |

## Measured results

**Live, against a local Worker with the real model** (Luna via the existing pipeline; a provider key from the developer's local Worker secrets file):

| Measure                                     | Result                                                                                                                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Headline scenario, 10 runs                  | 10 of 10 answered, screen-specific ("Open the Status tab… choose Add"), cited a Connections source, and offered the Status → Add guide                                 |
| 20 in-scope questions, one pass             | 20 answered, 20 cited, 19 with a correct source                                                                                                                        |
| Latency, 20-question pass                   | p50 1.96 s, p90 2.85 s (target: p90 ≤ 8 s)                                                                                                                             |
| Latency, headline scenario                  | median 1.6 s, max 2.0 s                                                                                                                                                |
| Tokens per interaction (Luna, average of 3) | about 670 prompt, 66 completion                                                                                                                                        |
| Cost per interaction                        | about $0.0011, roughly $11 per 10,000 (the plan estimated $0.0035 from a 2,000-token prompt; real prompts are about a third of that because registry chunks are short) |

**Offline retrieval over the real 38 help articles** (`bun run --cwd packages/help-engine eval`, enforced in CI by `tests/eval.test.ts`):

| Measure                                                    | Result                          |
| ---------------------------------------------------------- | ------------------------------- |
| Recall@3 on 20 in-scope questions                          | 95% (19 of 20); spec target 90% |
| All in-scope questions answerable (not a no-match)         | 100%                            |
| 10 out-of-scope or undocumented questions sent to no-match | 100%                            |
| Relevance of weakest in-scope vs strongest out-of-scope    | 0.35 vs 0.27                    |

**Browser checks** (Playwright, headless Chromium, stubbed service): the guide opens Status and highlights Add with a text label and a live announcement; Escape clears it; the vault's connection count is unchanged; the request body contains no entity names or IDs; offline and a failing service both show a plain message plus a link to the Connections help within the 2-second target; editing and tab switching stay responsive while a request hangs, and the request can be cancelled.

## What the spike corrected

1. **Add connection is on the Status tab, not the Connections tab.** The Connections tab is a read-only one-step picture. The spec, FR-020 and the scenario were changed, and it made the demo better: the guide is "open Status, then highlight Add".
2. **`gpt-5.6-luna` rejects `reasoning_effort: "minimal"`** (HTTP 400; it accepts none, low, medium, high, xhigh). The plan said "minimal"; the first live call failed with a 502. `help-answer` now uses `"low"`. **The existing `classification` and `utility` operation defaults also use `"minimal"`, have no live caller today, and would fail the same way.** Not changed here (out of scope); see follow-ups.
3. **Session Hub lives on the public generator pages, not in the app.** The help assistant is in-app only, so a Session Hub question can be answered from documentation but has no screen to point at. The registry entry says so, and a Session Hub help article was missing entirely and was added.
4. **There is no built-in `settlement` kind.** The seven built-ins are character, creature, location, item, event, faction and note. A Settlement is a `location`, or `custom` in a vault with its own category. The assistant is told `custom`, which is enough to answer, but it cannot tell a custom Settlement from a custom anything else.
5. **The repo's architecture rules said Workers may import only `schema`.** The plan wrongly claimed importing a workspace package matched existing practice. Resolved with a narrow, named exception in `.fallowrc.json` (a `help-engine` zone; workers may import `schema` and `help-engine`; `help-engine` may import only `schema`), approved by the maintainer. The Worker deploy workflow also had no install step, so a build step (Bun, install, bundle) and extra path filters were added.
6. **The Add button is absent in a read-only guest vault**, so the guide must not be offered there. Added a `connections-editable` flag that the highlight requires.
7. **Two real bugs found by the tests and live run:** a synonym folding "related" into "connect" sent "generate related entities" to the Connections help; and a cancel issued while the session token was still being fetched still sent the request.
8. **Screen context can override the question's topic** (see limits): one evaluation question, "How do I generate entries related to this one?" asked from the Connections tab, retrieves Connections help because the on-screen feature is boosted. _Addressed in #3617; see the addendum at the end._

## Decisions and their status

| Question from the issue                 | Outcome                                                                                                                                                                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| YAML, JSON, TypeScript for the registry | TypeScript data modules: typed, no new dependency, cross-reference validation in tests and the bundle build. Help prose stays in Markdown and is referenced by ID.                                                               |
| D1 + Vectorize vs AI Search             | **Not built.** None of the adoption triggers is met: 168 chunks and a 140 KB bundle (triggers: over about 2,000 chunks or 1 MB), recall 95% (trigger: below 85%). The design for both remains in `contracts/knowledge-store.md`. |
| Embeddings vs lexical recall comparison | Deferred during the spike because Workers AI credentials were unavailable. Now measured in the [#3612 addendum](#addendum-embeddings-comparison-3612), using the model shipped since the spike.                                  |
| Cloudflare AI Search                    | **Desk comparison only, not tried.** Kept as the fallback if the ingestion pipeline becomes a burden, since it cannot rank with live UI context.                                                                                 |
| One workflow or two for knowledge sync  | Two (schema migrations; knowledge sync), recommended for when D1 + Vectorize are adopted. Not built.                                                                                                                             |
| Streaming                               | Not built. The answer is one validated JSON object; measured p90 is 2.85 s against the 8 s target.                                                                                                                               |
| Metrics                                 | One server-side log line (outcome, latency, feature area); no client events, no identifiers. "Action accepted" is not measured.                                                                                                  |

## Privacy and safety checks

Covered by automated tests, not just review:

- The request is exactly the question, up to four prior turns, and the strict screen description; the test drives the real store, context builder and client with a screen full of names and IDs and inspects the bytes.
- A resolved path, an unknown key, or a user-defined category cannot leave the browser; the Worker re-validates and rejects.
- No file in the help code imports the analytics layer or a tracking library, and the only network call is the one help request.
- The conversation is never written to browser storage or IndexedDB.
- The Worker's only log output is the metric line; a test refuses extra keys, question text and identifiers. One operational log line was added for a missing knowledge bundle (no content).
- Every guide type is proven not to call any vault mutation; the allow-list has five non-mutating types.
- Model output is untrusted: citations not supplied are dropped, an answer with no valid citation becomes a no-match, and an action is accepted only if the server offered it.

## Copy review (Constitution IX)

All panel, fallback, no-match, privacy and highlight strings and the two new help articles were read for plain language. Changed: "entry"/"entries" to "entity"/"entities" to match the app's own help and UI, with retrieval treating entry and entity as one word so either phrasing works; the panel's own close button renamed "Close" so it is distinct from the floating toggle for screen-reader users. Fallback messages contain no status codes or technical terms (asserted by a test).

## Quickstart walkthrough (record)

Not walked through by a person in a browser. Automated equivalents cover it:

| Step                                                                                                | Covered by                                                                                       |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1–5: ask on Connections, see the Status-tab answer and sources, Show me, highlight, nothing changed | `tests/help-assistant-highlight.spec.ts` (real browser, stubbed service) and the live runs above |
| 6: undocumented question (Roll20)                                                                   | Retrieval evaluation, Worker tests (no model call), panel tests                                  |
| 7: offline                                                                                          | `tests/help-assistant-offline.spec.ts`                                                           |
| Privacy inspection                                                                                  | `help-privacy.test.ts` and the Playwright request-body assertion                                 |

## Limits of the evidence

- **The no-match threshold is tuned on the same 30 questions it is judged on**, and the gap between the weakest in-scope score (0.35) and the strongest out-of-scope score (0.27) is only 0.08. Expect both false refusals and false answers on a larger, independent set. The model is also told to answer "none" when the sources do not cover a question, so a weak match that passes the floor is caught a second time, but that was tested with a stub, not measured live on out-of-scope questions.
- **Screen context can override a question's topic** (finding 8). Context boosts help the headline case and hurt that one; the balance was set by hand. The boost is now scaled by match strength (#3617 addendum); two on-screen-family comparison questions still miss.
- **Live runs used only Luna.** The Gemini fallback path was not exercised live (no Gemini key).
- **"Correct" for the 10 headline runs** was judged by a script checking for the Status tab, Add, the guide and a Connections citation, plus reading three samples. A human reviewer (SC-001) has not read them.
- **Not evaluated:** the 5-person usability check (SC-010, deliberately deferred); screen-reader and mobile-width behaviour by hand; the deploy workflow change in a real CI run; staging.
- **Existing tests that fail on this machine only:** two tests in `session-bootstrap.test.ts` fail here because a local, untracked `.env` points the proxy at `localhost`. They pass with a hosted proxy URL, and `test-changed` was run with that override.

## Follow-ups (prioritised)

Drafted, not created as GitHub issues (that is outward-facing and awaits approval).

1. **Fix `reasoning_effort: "minimal"` in the `classification` and `utility` operation defaults** (`llm/registry.ts`). They would return 400 from Luna; no live caller yet, so a latent bug.
2. **Grow the evaluation set to 100+ questions with held-out examples**, including rephrasings, and re-tune the floor and boosts on a train/test split.
3. **Run the embeddings comparison** — completed in the [#3612 addendum](#addendum-embeddings-comparison-3612).
4. **Human review of live answers** (SC-001) and a 5-person usability check (SC-010).
5. **Register more features**, and add a rule or lint that a user-facing feature PR touches the registry.
6. **Decide the assistant's name, quick prompts and proactive-help setting** (left provisional by the spec).
7. **Tackle the context-overrides-topic case**, for example by weighting the question's action verbs, or boosting only when the question is ambiguous.
8. **Exercise the Gemini fallback live**, and add a provider-failure alert on the new log line.
9. **Streaming the prose** only if p90 regresses.
10. **Knowledge sync into D1 + Vectorize** only when an adoption trigger is hit.
11. **Mutating or proactive assistance** remain out of scope and each needs its own spec.

---

## Addendum: phase A coverage expansion (#3615)

Canvas, maps and VTT, entity editing, generators, backup and export, and import were added to the registry and the help articles, with navigation guides only (no new highlight targets). This addendum records what the larger evaluation showed.

### What was measured

The evaluation grew from 36 to 122 questions: 93 in scope (65 `tune`, 28 `holdout`) and 29 out of scope, with 13 confusion questions that must show both neighbouring features. The questions and their halves were fixed before any score was read; the spike's questions had already been tuned against and all count as `tune`.

| Measure (offline, no model)                        | Result | Target       |
| -------------------------------------------------- | ------ | ------------ |
| recall@3, `tune`                                   | 89%    | 90% — missed |
| recall@3, `holdout`                                | 75%    | 90% — missed |
| Unrelated questions sent to no-match               | 100%   | 100% — met   |
| Near-miss questions the word-overlap floor refuses | 1 of 8 | not a target |

The first look, before any retrieval change, was 85% tune, 68% held out and 76% refusal over all out-of-scope questions. The unrelated-question figure is the one that was always achievable; the other two are described below.

### Findings

1. **A word-overlap floor cannot refuse a near-miss.** "Can I back up my vault to Dropbox?" scores 0.49 because backup and vault are covered; the weakest real question scores 0.25. No floor separates them. Refusing these is the model's job (the prompt says to answer "none" when the sources do not cover the question). The set now keeps them apart from unrelated questions and `bun run eval -- --live` asks the model each one. **That live run has not been done**, so how well the model refuses near-misses is unmeasured. The 100% "undocumented" figure in the original spec is only true of unrelated questions.
2. **One feature can fill all three slots**, so "is X the same as Y" heard about only one of them. Now at most two chunks per feature are shown, and only a chunk that clears the floor can displace one (an earlier version let a weak chunk in and broke four questions; it was found by the tune misses and fixed). Comparison words ("difference", "same", "between") are no longer topics.
3. **A feature on screen pulls its own articles above a better match.** In Settings the only registered feature is backup, so "How do I set the default template for a new character?" returns the backup articles, because the +0.45 on-screen boost outweighs a stronger word match. This is a miss on the held-out half and was **not** tuned against. The likely fix is a registry entry per Settings tab (templates, theme, intelligence, publishing) or boosting by Settings tab. Both are content or design work rather than a parameter.
4. **A long chunk loses to short ones.** "Can I draw on the canvas?" has its answer in a long "Core Features" section that ranks below two short registry chunks and an unrelated one. Splitting long sections is a content change.
5. **Vocabulary gaps.** "What happens if my import gets interrupted?" misses because the article says "close the app or lose connection". A small synonym list would help, but each addition is a guess; it was not done.

### How much tuning was done

Two rounds against the `tune` half, plus one correction to the second round's own defect. The `holdout` half was read only to check the result and not to choose a change. Because the third look was at `tune` again, the held-out figure is the cleaner one of the two, and it is the lower.

### Not done

- The live near-miss run and the live answer-quality run for the new areas (needs a deployed Worker and a provider key).
- Highlight guides for canvas, VTT, Settings and the generators (phase B, #3616).
- A human reading of live answers.
- Staging: the Worker has to be redeployed after merge for the new knowledge to reach staging, because the knowledge ships inside the Worker bundle.

---

## Addendum: embeddings comparison (#3612)

**Measured 2026-10-04**, against the production-channel corpus on staging commit `9b359fa55`, with the evaluation implementation in this change. This supersedes the spike's unmeasured embeddings comparison and its old retrieval/adoption figures; the earlier tables remain historical records.

### Method and reproducibility

Compare lexical-plus-context retrieval with the **production hybrid algorithm using complete vectors**, not a pure cosine-only search or a deployed Vectorize index. Both runs use the same 284 chunks, 45 articles, 19 features, questions, context boosts, source-diversity rules, exact-title bypass and relevance floor (0.3). The hybrid takes the larger lexical/normalised semantic score, as production does. No ranking parameters, question wording or expected sources were changed for this experiment.

The model is Workers AI `@cf/baai/bge-small-en-v1.5` (384 dimensions, default mean pooling), already used by the application. The original issue proposed BGE-base; using BGE-small measures the shipped behaviour and reuses valid precomputed chunk vectors. The checked-in cache covers only 176 of the current 284 chunks after hash validation. This experiment fills the remaining 108 chunk vectors and missing question vectors with the same model; it therefore measures complete semantic coverage, not the partially cached bundle or a live deployment snapshot. Corpus vectors are rounded to four decimals like the sync artifact; query vectors retain full precision like the Worker. The model has a [512-token input limit](https://developers.cloudflare.com/workers-ai/models/bge-small-en-v1.5/); long sections may lose tail information. The experiment preserves the production input text rather than introducing new chunking.

The expanded set contains 93 in-scope questions (65 tune, 28 legacy regression) and 29 out-of-scope questions (21 unrelated, eight feature-related near-misses). The separately authored, previously frozen holdout contains 30 in-scope and ten unrelated questions. It remains a validation set, not material to tune against. These are authored fixtures, not user conversations or vault content. No answer-generating model or live Help endpoint is called. Refusal below means **retrieval-floor no-match**, not the model's final refusal.

The runner validates cache model, vector dimensions and finite values. Cache keys are the exact embedding input text, so changed chunks/questions cannot reuse old vectors. Incomplete offline caches fail rather than silently comparing partial semantic coverage. Valid shipped chunk vectors can seed the cache. Raw vectors remain in the ignored `.cache/` directory; the committed [expanded report](./embedding-comparison-expanded.json) and [fresh report](./embedding-comparison-fresh.json) contain per-question results, corpus/question/vector SHA-256 fingerprints and counts, without credentials.

```bash
# Populate missing vectors using CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID,
# or the existing Wrangler login. Refresh that login with bunx wrangler whoami.
bun packages/help-engine/tests/eval/run.ts --compare-embeddings --report .cache/help-eval-expanded.json
bun packages/help-engine/tests/eval/run.ts --compare-embeddings --fresh-holdout --report .cache/help-eval-fresh.json

# Repeat with cached vectors and no network/provider credentials:
bun packages/help-engine/tests/eval/run.ts --compare-embeddings --offline-embeddings --report .cache/help-eval-expanded.json
bun packages/help-engine/tests/eval/run.ts --compare-embeddings --offline-embeddings --fresh-holdout --report .cache/help-eval-fresh.json
```

An alternative cache path can be provided with `--embedding-cache FILE`. The default is `.cache/help-eval-embeddings.json` at the repository root. The offline repeats produced the same recall and refusal counts as the initial runs.

### Measured comparison

| Measure                                        | Lexical + context | Hybrid, complete vectors |
| ---------------------------------------------- | ----------------- | ------------------------ |
| Expanded recall@3, all in scope                | 85/93 (91.4%)     | 81/93 (87.1%)            |
| Expanded tune recall@3                         | 60/65 (92.3%)     | 56/65 (86.2%)            |
| Expanded legacy regression recall@3            | 25/28 (89.3%)     | 25/28 (89.3%)            |
| Expanded in-scope questions clearing the floor | 93/93 (100%)      | 93/93 (100%)             |
| Expanded unrelated questions refused           | 21/21 (100%)      | 11/21 (52.4%)            |
| Expanded near-misses refused                   | 1/8 (12.5%)       | 0/8 (0%)                 |
| Expanded all out-of-scope questions refused    | 22/29 (75.9%)     | 11/29 (37.9%)            |
| Fresh frozen recall@3                          | 26/30 (86.7%)     | 28/30 (93.3%)            |
| Fresh in-scope questions clearing the floor    | 29/30 (96.7%)     | 30/30 (100%)             |
| Fresh unrelated questions refused              | 10/10 (100%)      | 8/10 (80%)               |

For the expanded set, weakest in-scope relevance versus strongest unrelated relevance is **0.3202 vs 0.2878** for lexical (gap **+0.0324**) and **0.5657 vs 1.0000** for hybrid (gap **−0.4343**). For the fresh set it is **0.2763 vs 0.1761** for lexical (gap **+0.1002**) and **0.4942 vs 0.5250** for hybrid (gap **−0.0307**). Lexical's positive fresh gap does not mean its current floor answers every valid question: one is below 0.3. Neither hybrid cohort has a single threshold that separates every in-scope question from every unrelated one.

The hybrid retrieves two extra correct sources on the fresh set, including the question about correcting a misspelled character name. It also sends “Calculate a mortgage repayment schedule” and “How do I learn conversational Spanish?” past the floor. In the expanded set it loses correct top-three sources for questions such as linking two characters and saving a generated draft. These observations describe retrieval, not measured hallucinations or final answer quality; the existing answer-model refusal instructions may still refuse those requests. Near-misses already require that second check under lexical retrieval.

### Adoption decision

| Trigger in the knowledge-store contract     | Current evidence                                                                                                        | Decision                                                                               |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| More than approximately 2,000 chunks        | 284 chunks                                                                                                              | Not met                                                                                |
| Bundle larger than approximately 1 MB       | 232,830 bytes lexical; 733,845 with valid checked-in cached vectors; 1,041,468 with complete production-rounded vectors | Not met by the checked-in cache; approximately reached by the fully embedded candidate |
| Lexical recall@3 below 85%                  | 91.4% expanded, 89.3% legacy regression, 86.7% fresh frozen                                                             | Not met on the current measurements; the old 75% figure is superseded                  |
| Content must update without a Worker deploy | No new requirement established by this experiment                                                                       | Not established                                                                        |

**Recommendation: defer D1 + Vectorize deployment and retain lexical-plus-context as the acceptance baseline.** The fresh hybrid recall gain is useful evidence for further semantic retrieval work, but the refusal regression violates the unrelated-question target and the expanded recall regression rules out adopting this hybrid as a blanket improvement. A Vectorize storage/index migration does not by itself fix the current normalisation, ranking or refusal behaviour. The fully embedded candidate approaches the size trigger, while the checked-in partially cached bundle is about 734 KB. Removing bundled vectors retains a 233 KB lexical corpus. Treat the size trigger as a reason to review storage only if complete semantic coverage proves worth retaining. Reassess resource adoption after a separate retrieval/refusal change passes independent validation, or when one of the other operational triggers becomes real.

This issue provides the requested comparison and recommendation. It does not deploy resources, change runtime ranking or retune the floor. Live answer-quality and semantic query-latency/cost measurements remain separate work; this offline result cannot settle them.

## Addendum: screen context overriding the topic (#3617)

### Re-baseline

The finding was written against 20 questions with one miss. On the current sets (122 expanded, 40 frozen; lexical retrieval) there are 8 expanded misses. Re-running each miss with no screen context (the `none` screen) separates the causes:

| Miss                                                                                                                                  | Cause                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "How do I set the default template for a new character?" (Settings)                                                                   | **Screen boost.** `offline-sync` matches on one word (0.18) but its feature is on the Settings screen, so +0.32 lifts it above the real guide (0.49, no boost). |
| "What is the difference between the graph and the canvas?" (Graph)                                                                    | Screen boost, but between two on-screen families: `entity-reports` (0.72) gains 0.12 and passes `canvas` (0.74). Not a weak-match case.                         |
| Six others (interrupted import, generator vs Oracle, import vs generating, Google Drive vs backup, canvas vs explorer, fog vs hiding) | Ranking: two-sided comparisons or sparse wording. Identical with and without a screen.                                                                          |

The issue's own example, "How do I generate entries related to this one?" from the Connections tab, **no longer fails**: `registry:related-entity-generation` is first, since the registry coverage added in #3750. It is now a regression test.

Screen context also rescues 6 in-scope questions that miss without it, so removing or weakening it broadly would be a net loss.

### Options tried

Compared on the expanded set, the frozen set and both refusal sets, per question (gains and losses), not only totals.

| Option                                                   | Expanded          | Frozen            | Unrelated refusal | Verdict                                                                    |
| -------------------------------------------------------- | ----------------- | ----------------- | ----------------- | -------------------------------------------------------------------------- |
| Current boost                                            | 91.4% (85/93)     | 86.7% (26/30)     | 100% / 100%       | Baseline                                                                   |
| Cap boost at `k` x match strength, k = 0.3-0.7           | 90.3%             | 86.7-90.0%        | 100% / 100%       | Loses a question                                                           |
| Cap boost at `k` x match strength, k = 1.0-1.5           | 92.5%             | 86.7%             | 100% / 100%       | Fixes default template only                                                |
| **Scale boost by match strength, full at 0.35**          | **92.5% (86/93)** | **90.0% (27/30)** | **100% / 100%**   | **Adopted**                                                                |
| Same, full at 0.45                                       | 91.4%             | 90.0%             | 100% / 100%       | Loses "Should I export to share my world with players?"                    |
| Same, full at 0.5                                        | 90.3%             | 90.0%             | 100% / 100%       | **Loses the headline "connect the faction I just created"**                |
| Cap on-screen score at the best off-screen match (alone) | 91.4%             | 86.7%             | 100% / 100%       | No change on its own; adding it to scaling changed nothing either; dropped |

Not tried: weighting action verbs (generate, connect, roll) and applying the boost only to ambiguous questions. The question that motivated them no longer fails, and the remaining screen-caused miss is a weak-match case, so neither was needed.

### Result

The screen boost (up to 0.35 on the Connections tab) is multiplied by `min(1, matchStrength / 0.35)`, where match strength is the larger of lexical and semantic score. The effect:

- A chunk with a strong match gets the full boost, so the headline scenario and the six rescued questions are unchanged.
- A chunk that shares only a word or two gets a fraction, so it can no longer pass the guide that answers the question.
- Expanded recall@3 rises from 91.4% to 92.5% and frozen from 86.7% to 90.0%. No question is lost. Unrelated-question refusal stays 100% on both sets.

### How much tuning was done

One parameter, set on the same sets it is judged on, so treat the gains as small and the main value as the removed failure mode. The adopted value sits 0.10 below the first loss (0.45) and the headline breaks at 0.50, so there is limited headroom: **do not raise the threshold without re-running the headline.** One of the two gains is on the frozen set, which was not used to pick the direction.

### Not fixed

- "Graph versus canvas" still misses: both guides are in play and a different on-screen family outranks one of them. It needs a comparison-aware rule, not a weaker boost.
- The six ranking misses are unchanged and unrelated to screen context.
- The hybrid (embedding) retrieval path was not re-measured; its match strength uses the larger of lexical and semantic, so it gets the same scaling, but #3760 already found hybrid refusal behaviour worse than lexical.
