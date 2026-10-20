# Research and decisions

## Existing contract

Decision: retain the Zod schema. `sections` already requires only one block; `example` and `checklist` are union members, not required occurrences. `codexConnection` is optional; related link arrays default to empty. No data migration or renderer redesign is justified.
Rationale: the conflict is instruction/test policy. Registry tests currently require an example on every Answer, at least three sections, a >140-character excerpt and a non-Answer Codex surface link. These create pressure to pad and promote.
Alternatives: a schema discriminator per editorial intent or automatic prose scoring would add policy and complexity without establishing quality.

## Canonical copies

Decision: retain canonical `.agent` and synchronise compatible copies in this slice. `.codex` currently matches canonical; `.agents` differs in image guidance and category comments. Reconcile these deliberately and inventory any further copies.
Rationale: avoids a broader skill-loader migration and broken relative resource links. A later consolidation is optional, not a prerequisite.

## Historical benchmark

Source snapshots: PR #3899 merge `1f61d4cfc5d670534199587e462fb12bfda8f9ac`; PR #3915 merge `58678ae171f1450aa3412387e5a9d8ed9b44ecec`.
Article: `apps/web/src/lib/content/answers/pages/which-dice-do-i-roll-in-dnd-and-when.ts`.
Observed correction: distinguishes attack-then-damage from effects naming dice directly; clarifies using the listed attack bonus once; adds publisher rules links and percentile examples; removes unrelated tool suggestions; removes “memorise every die from memory”.
Residual weakness: #3915 still narrates the fighter roll without giving an actual d20 result, target AC, damage result and calculation. The weak/strong comparison and repeated takeaway remain. Therefore corrected does not mean fully meeting #3918.
Decision: compare original, correction and proposed sample separately. Demonstrate 12 + 5 = 17 against AC 15, then an explicitly chosen d8 result of 6 + 3 = 9. Verify any rule claims against the relevant publisher edition during implementation; arithmetic alone does not establish rules accuracy.

## Contrasting samples

1. Definition: `what-is-a-point-crawl.ts`. Retain named routes and distinct costs; avoid turning “at least one hidden link” and “no two links cost the same” into definitional necessities. Separate optional design advice from the definition. Check “six points” against the actual four named locations in its example. Reader outcome: identify a point/link and explain a travel trade-off without inferring mandatory secret routes.
2. Worldbuilding distinction: `what-is-the-difference-between-gods-and-demon-lords-in-a-fantasy-world.ts`. Retain system-neutral alternatives and the temple/cult player choice. Test whether the “Why it works”, overlap section and checklist repeat the same distinction. Compress where they add no new decision; keep the explicit setting-dependence. Reader outcome: choose one distinction and predict a visible consequence without assuming universal fantasy cosmology.
   These are critiques for a benchmark, not instructions to publish unsolicited rewrites. Together with the beginner rules article they test substantially different reader jobs.

## What remains independent

Draft guidance can prevent padding, missing calculations and forced links. Actual rules interpretation, edition accuracy, link relevance, product capability claims and whether a scene produces the claimed decision still require independent source/editorial verification. Document findings honestly; fewer legitimate review reports is not itself success.
