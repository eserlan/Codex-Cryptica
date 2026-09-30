# Findings: Contextual AI Help Assistant Spike (#3427)

**Date**: 2026-09-30 | **Branch**: `3427-contextual-ai-help-assistant` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Recommendation

**Proceed to a fuller build, on the architecture the spike used, with D1 + Vectorize deferred.** The vertical slice works end to end with a real model: on Settlement → Connections the assistant answers "How do I connect the faction I just created?" correctly, cites its sources, and offers a two-step guide that opens the Status tab and highlights Add, without changing anything in the vault. Retrieval over the real help articles is good enough at this corpus size (95% recall@3, 100% no-match on undocumented questions), so the extra resources D1 + Vectorize would need are not justified yet.

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
8. **Screen context can override the question's topic** (see limits): one evaluation question, "How do I generate entries related to this one?" asked from the Connections tab, retrieves Connections help because the on-screen feature is boosted.

## Decisions and their status

| Question from the issue                 | Outcome                                                                                                                                                                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| YAML, JSON, TypeScript for the registry | TypeScript data modules: typed, no new dependency, cross-reference validation in tests and the bundle build. Help prose stays in Markdown and is referenced by ID.                                                               |
| D1 + Vectorize vs AI Search             | **Not built.** None of the adoption triggers is met: 168 chunks and a 140 KB bundle (triggers: over about 2,000 chunks or 1 MB), recall 95% (trigger: below 85%). The design for both remains in `contracts/knowledge-store.md`. |
| Embeddings vs lexical recall comparison | **Not run.** It needs Cloudflare Workers AI credentials that were not available in the session. Only lexical and context ranking were measured.                                                                                  |
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
- **Screen context can override a question's topic** (finding 8). Context boosts help the headline case and hurt that one; the balance was set by hand.
- **Live runs used only Luna.** The Gemini fallback path was not exercised live (no Gemini key).
- **"Correct" for the 10 headline runs** was judged by a script checking for the Status tab, Add, the guide and a Connections citation, plus reading three samples. A human reviewer (SC-001) has not read them.
- **Not evaluated:** the 5-person usability check (SC-010, deliberately deferred); screen-reader and mobile-width behaviour by hand; the deploy workflow change in a real CI run; staging.
- **Existing tests that fail on this machine only:** two tests in `session-bootstrap.test.ts` fail here because a local, untracked `.env` points the proxy at `localhost`. They pass with a hosted proxy URL, and `test-changed` was run with that override.

## Follow-ups (prioritised)

Drafted, not created as GitHub issues (that is outward-facing and awaits approval).

1. **Fix `reasoning_effort: "minimal"` in the `classification` and `utility` operation defaults** (`llm/registry.ts`). They would return 400 from Luna; no live caller yet, so a latent bug.
2. **Grow the evaluation set to 100+ questions with held-out examples**, including rephrasings, and re-tune the floor and boosts on a train/test split.
3. **Run the embeddings comparison** (Workers AI, offline) and record recall against lexical-plus-context before deciding on Vectorize.
4. **Human review of live answers** (SC-001) and a 5-person usability check (SC-010).
5. **Register more features**, and add a rule or lint that a user-facing feature PR touches the registry.
6. **Decide the assistant's name, quick prompts and proactive-help setting** (left provisional by the spec).
7. **Tackle the context-overrides-topic case**, for example by weighting the question's action verbs, or boosting only when the question is ambiguous.
8. **Exercise the Gemini fallback live**, and add a provider-failure alert on the new log line.
9. **Streaming the prose** only if p90 regresses.
10. **Knowledge sync into D1 + Vectorize** only when an adoption trigger is hit.
11. **Mutating or proactive assistance** remain out of scope and each needs its own spec.
