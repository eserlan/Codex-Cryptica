# Idea Developer pattern analysis: experiment and decision (#3466)

**Status:** dry run done; pattern-finding scored on GPT-5.6 Luna (production); full side-by-side comparison pending.
**Recommendation:** not an implementation epic yet. Pattern-finding held up on a real model, so run the full comparison next; if it confirms the dry run, ship a narrow version as a reusable service (see [Decision](#decision)).

## Question

Does a narrative-pattern pass, which names the familiar shapes a premise uses, what they lead an audience to expect, and where its structure is thin, make Idea Developer's critique more useful than the current single call?

## What was built

| Piece            | Where                                                         | Notes                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pattern taxonomy | `packages/generator-engine/src/narrative-patterns.ts`         | 24 Codex-native patterns in five families (reveal, character, faction, situation, structure). Each has a shape, the expectation it sets up, and two **levers**: ways to complicate it without discarding it. Written for Codex; nothing taken from TV Tropes.                                                                                                               |
| Analysis pass    | `packages/generator-engine/src/narrative-pattern-analysis.ts` | One classifier call returning matched patterns with evidence, off-list patterns, seven structural signals (`present`/`thin`/`missing`), reveal dependency, audience expectations and a sentence on distinctiveness. No scores. Unknown ids are kept as off-list rather than dropped. The completion function is injected, so a smaller model or Jev (#3465) can replace it. |
| Brief hand-off   | `IdeaDeveloperService.develop(idea, mode, { patternBrief })`  | Optional. When present, the brief is appended after the idea as fallible background. The output schema is unchanged, and the public page does not send a brief, so users see no difference.                                                                                                                                                                                 |
| A/B harness      | `scripts/idea-pattern-ab.ts` (`bun run eval:idea-patterns`)   | Ten premises; baseline (1 call) against assisted (2 calls) per mode. Scores pattern-finding against hand labels (found, missed, wrong), and reports calls, latency, pattern coverage, off-list rate, and whether pattern names leak into creator-facing text. `--detect-only` runs just the classifier; `--markdown` prints both routes side by side for reading.           |

## Dry run

No model API key was available when this was written, so Claude stood in for **every** call on five premises in Assess mode. The baseline replies were written before the pattern analyses. Every reply went through the real prompts, Zod schemas, brief formatter and renderer. Full transcript: [3466-idea-pattern-dry-run.md](./3466-idea-pattern-dry-run.md).

**Caveat:** the person who designed the prompts also played the model and knew the hypothesis. Treat this as a check of the pipeline and of the _kinds_ of difference to look for, not as evidence that the assisted route is better.

| Premise            | Probe              | Assisted vs baseline                                                                                                                                                                                                                                                                                         |
| ------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| dragon-protector   | reveal-driven      | **Better.** Only the assisted route raised the knight's own complicity ("What did the knight do in the king's service…"), which is the issue's own example prompt. It also suggested keeping the dragon genuinely dangerous and giving the king decent loyalists. Both routes spotted the reveal dependency. |
| dragon-parts-town  | static lore        | **Slightly better.** It named the default expectation (supply runs out, townsfolk complicit) and offered "make the secret protective" and "split the town" as alternatives. The baseline already said "an image, not a situation".                                                                           |
| vague-moon         | too thin           | **No difference.** Nothing matched; the structural signals only restated what the baseline already said.                                                                                                                                                                                                     |
| bridge-toll        | several patterns   | **Better**, with one wrong label. "Let the vacancy be deliberate" and "a lie both sides maintain" were sharper than the baseline's gaps. But the classifier also matched _Dwindling Lifeline_ for "the only bridge", which is a stretch.                                                                     |
| retired-chosen-one | already subversive | **Mixed.** "Right about the harm but wrong about who owes" was a real gain. But _Prophecy Trap_ was a loose match, and its expectation leaked in as a weaker stress test.                                                                                                                                    |

Harness numbers (dry run): 2.2 taxonomy matches and 0.4 off-list patterns per idea; 11 of 24 patterns used; no pattern names leaked into creator-facing text; twice the calls.

Against the hand labels, the dry-run analyses found 6/6 expected patterns, with 2 wrong (_Dwindling Lifeline_ for the bridge, _Prophecy Trap_ for the retired chosen one) and 3 of 5 exact. The labels were written after the dry run, so this only shows the scoring works; it is not evidence about any model.

## Pattern-finding on GPT-5.6 Luna

Run on 23 October 2026 with `bun run eval:idea-patterns --detect-only` against the deployed worker, using an automation session token. All 10 classifier calls were answered by `luna-fast`, which production still maps to GPT-5.6 Luna; the switch to GPT-6 Luna is in #4363 and was not deployed. One call per idea, so this is a single sample, not a measure of run-to-run consistency.

| Measure                         | Result     |
| ------------------------------- | ---------- |
| Expected patterns found         | **8 / 9**  |
| Missed                          | 1          |
| Wrong matches                   | 2          |
| Ideas exactly right             | **7 / 10** |
| Off-list patterns per idea      | 1.2        |
| Ideas expecting none, given one | 1 of 4     |

| Idea               | Found                                                     | Missed        | Wrong                       | Off-list                                              |
| ------------------ | --------------------------------------------------------- | ------------- | --------------------------- | ----------------------------------------------------- |
| dragon-protector   | disgraced-champion, misunderstood-monster, rot-at-the-top |               | villain-has-better-evidence |                                                       |
| dragon-parts-town  | living-off-the-beast                                      |               |                             |                                                       |
| giant-village      | safe-haven-falls                                          |               |                             |                                                       |
| vague-moon         |                                                           |               |                             |                                                       |
| water-rights-heist | dwindling-lifeline                                        |               |                             | Heist, Corporate Exploitation                         |
| drowned-city-ferry |                                                           |               |                             | Patterned Disappearances, Investigative Mystery       |
| lighthouse-log     | prophecy-trap                                             |               |                             | Time Loop, Future Knowledge                           |
| bridge-toll        | empty-throne                                              | fragile-truce |                             | Inheritance Dispute                                   |
| bakery-caravan     |                                                           |               |                             | Road Story, Cascading Crisis                          |
| retired-chosen-one |                                                           |               | disgraced-champion          | Retired Hero, Villainous Litigation, After the Ending |

**Reading the misses and wrong matches:**

- **Missed _Fragile Truce_ on bridge-toll.** Defensible: the premise says the guilds are rivals sharing a bridge but never states a truce. It found the stronger pattern, _Empty Throne_, and named _Inheritance Dispute_ off-list, which says the same thing in other words.
- **_Villain Has the Better Evidence_ on dragon-protector.** A fair reading rather than an error: the dragon, cast as the villain, is acting on what the kingdom does not know. This is a labelling question, not a model failure; it should probably be _acceptable_. The labels were left unchanged after the run so the score stays honest; review them before the next one.
- **_Disgraced Champion_ on retired-chosen-one.** A real mistake: she is retired and successful, not disgraced. It is also the only invented match among the four ideas labelled with no patterns. The model named the right shape off-list (_Retired Hero_, _After the Ending_), which suggests it reached for the nearest list entry when the list had no good fit.
- **No over-matching elsewhere.** The two loose matches from the dry run (_Dwindling Lifeline_ on the bridge, _Prophecy Trap_ on the retired chosen one) did not appear, and the three other ideas with no expected patterns got none.

**What it means:**

1. **Pattern-finding is good enough to build on.** Most expected patterns were found and wrong matches were rare, so the classifier is not the weak link. That clears step 1 of the [Decision](#decision).
2. **The list has gaps the model keeps naming.** About one off-list pattern per idea, three times the dry run's rate. _Heist_, _Inheritance Dispute_, _After the Ending_ and _Road Story_ are common TTRPG shapes worth adding, each with its own levers.
3. **Wrong matches come from missing entries more than from loose reading.** Both errors sit next to an off-list name that fits better, so widening the list should reduce them more than a stricter prompt would.

## Findings

1. **The value comes from the levers, not the labels.** Every gain traced back to a taxonomy lever or a named expectation. Pattern names alone ("this is a Misunderstood Monster") added nothing a creator could act on.
2. **Structural signals duplicate the existing Assess prompt.** The baseline already found the reveal dependency, the missing conflict and the undefined player role. The seven-signal block costs tokens without adding much.
3. **A fixed list invites over-matching.** Even with an explicit "leave out loose matches" instruction, two of thirteen matches were stretches, and a wrong label brings the wrong levers with it. The brief's "it may be wrong" framing contained this, but did not stop it.
4. **It helps premises that already have shape.** There was no gain on a one-line mood, and the gain on an already-subversive premise was mixed.
5. **Familiarity stayed neutral.** No output treated a trope as a flaw, and no pattern names leaked into the creator-facing text.

## Decision

Not yet. The dry run is encouraging enough to justify a production-model run, not a build.

**Which model answers:** the proxy sends both the harness's calls and the public page's to Luna (`luna-fast`) by default: GPT-5.6 Luna today, GPT-6 Luna once #4363 ships, with `gemini-3.5-flash-lite` as a silent fallback when there is no OpenAI key or Luna fails. To test what users get, set `OPENAI_API_KEY` in `apps/workers/oracle-proxy/.dev.vars`; with only `GEMINI_API_KEY`, every call falls back to Gemini, which tests a cheaper model. The harness records the proxy's `modelKey` for every call and shows the counts in its summary and each side-by-side heading. Check them before comparing runs, because a run that mixes models is not one model's result.

1. **Score pattern-finding first:** `bun run eval:idea-patterns --detect-only` makes one classifier call per sample idea and scores it against the hand labels in `IDEA_CASES`. Each idea lists the patterns it clearly uses (`expected`) and defensible extra readings (`acceptable`); anything else the classifier matches counts as wrong. Four ideas expect no patterns, to catch invented matches. If the model misses many expected patterns or produces many wrong ones, stop here, because the later steps depend on it. The labels are one person's judgement, so review them before trusting the score. **Done on GPT-5.6 Luna; it passed** (see [Pattern-finding on GPT-5.6 Luna](#pattern-finding-on-gpt-56-luna)).
2. **Run the full comparison:** `bun run eval:idea-patterns --modes assess,challenge --markdown > ab.md` against the local proxy. Read the output side by side, looking for findings 1–4. Each assisted run also shows its pattern score.
3. **Add a third arm before deciding:** a single call that carries only the matched patterns' expectations and levers, using a cheaper match step or even keyword pre-selection, with no structural-signal block. If it matches the two-call route, the extra call is not worth it.
4. **If the real model confirms the gain**, ship narrowly:
   - Assess and Challenge modes only.
   - A small curated taxonomy (about 20–40 entries) maintained for its levers, with a minimum-evidence threshold to reduce over-matching.
   - Packaged as a reusable `generator-engine` service so the Oracle narrative assistant (#3926) can use the same vocabulary, rather than as a feature only Idea Developer has.
5. **If it does not**, keep the taxonomy as an internal vocabulary for #3926 and the generators, and close this line of work.

## The issue's open questions

- **Curated database or LLM alone?** A small curated list, because the useful part (levers) is authored judgement an LLM does not supply by default. Labels alone are not worth curating.
- **How broad?** Still small, but wider than 24. The dry run suggested diminishing returns (0.4 off-list matches per idea), but GPT-5.6 Luna named about one off-list pattern per idea, and both of its wrong matches sat next to a missing entry. Adding common TTRPG shapes such as _Heist_, _Inheritance Dispute_, _After the Ending_ and _Road Story_ looks worthwhile.
- **Genre-specific or neutral?** Neutral shapes work across genres. Add genre-specific levers only where a lever does not translate.
- **Avoiding "familiar = bad"?** Do it in the prompt ("Familiar patterns are not flaws"), and drop scores entirely. In the dry run this held.
- **Useful or merely interesting?** Expectations and levers are useful. Pattern names and structural ratings are mostly interesting.
- **Where should it live?** As a reusable service, shared with #3926; Idea Developer is a consumer.
- **Can the taxonomy support generators or discovery?** Possibly, as a vocabulary, but that should not drive the taxonomy now (see Constitution XIII on discovery pages).
- **Jev?** The classifier step is low-stakes and structured, so it is a reasonable place for #3465's cheaper model. `analyseNarrativePatterns` takes its own completion function, so the classifier can be swapped without touching the developer call. The harness currently sends both through the same proxy.
