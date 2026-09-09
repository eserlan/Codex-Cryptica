# Heist & puzzle cluster map (#2850)

Audit of the heist and RPG-puzzle query clusters: one canonical page per
intent, the links between them, and their discovery-surface status. Written
alongside the code fixes in #2850; update this file whenever a page in either
cluster is added, retitled, or relinked.

## Heist cluster

The cluster now has one generator, **two answers** (execution framework +
target/prize design), and **three worked examples** across three genres
(Space Western, Classic Fantasy, Cyberpunk).

| Intent                                                                | Canonical page                                              | Notes                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool ("best/RPG/tabletop RPG heist generator")                        | `/generators/heist`                                         | `slugMeta.heist` in `apps/web/src/lib/components/seo/generator-page-meta.ts`. Keywords now include `heist generator`, `rpg heist generator`, `tabletop rpg heist generator`, `infiltration scenario generator`, `blades in the dark score generator`, `dnd heist ideas`. "Best heist generator" is handled as a discovery intent alias plus a dedicated FAQ entry, not a separate page. |
| Informational, execution ("how to run a heist in a tabletop RPG")     | `/answers/how-do-you-run-a-heist-in-a-tabletop-rpg`         | The four-phase flashback/alarm-track framework. `userJob: adopt-workflow`.                                                                                                                                                                                                                                                                                                              |
| Informational, target/prize design ("what makes a good heist target") | `/answers/what-makes-a-good-heist-target-in-a-tabletop-rpg` | New. `userJob: understand`, deliberately distinct from the execution answer; `acknowledgedOverlap` records why the two coexist in the same cluster (choosing the prize vs. running the session). Verified with `bun scripts/discovery-audit.mjs` (0 new warnings).                                                                                                                      |
| Worked example, Space Western                                         | `/examples/the-breakwater-vault-space-western-heist`        | Provenance: `raw` (verbatim output, GitHub discussion #2790).                                                                                                                                                                                                                                                                                                                           |
| Worked example, Classic Fantasy                                       | `/examples/the-dawnheart-diadem-fantasy-heist`              | New. Provenance: `lightly-edited` (generated directly through the production heist generator for this content pass, not a community discussion; text unaltered, only reformatted into page blocks). `sourceUrl` points at issue #2850.                                                                                                                                                  |
| Worked example, Cyberpunk / Corporate                                 | `/examples/the-quell-extraction-cyberpunk-heist`            | New. Same provenance basis as the fantasy example. Demonstrates the Extraction heist type (rescuing an uncooperative subject) rather than Theft.                                                                                                                                                                                                                                        |

Links (all bidirectional):

- generator → both answers, generator → all three examples (`heist.relatedLinks`)
- each answer → generator, each answer → the other answer (`relatedAnswers`, reciprocal, verified via `bun run check:answer-mesh`)
- each example → generator, → both answers, and the two new examples → each other (`relatedGenerators`, `relatedAnswers`, `relatedExamples`)

Hero images for the two new examples and the new answer's OG card were
generated with the in-app Cloudflare Workers AI image pipeline (via the local
oracle-proxy, the same path `scripts/heist-eval.ts --mode ai` uses for text)
and uploaded to `codex-cryptica-statics` (see `docs/deployment/r2-asset-db.md`).

Sitemap: included (answers/examples were always pulled dynamically from their
registries; the generator route is now derived from `GENERATOR_SLUGS` instead
of a hand-maintained list — see fix below). `llms-full.txt`: answers and
examples are included automatically via `scripts/generate-llms-full.mjs`
(walks the answers/examples registries); the generator page itself has no
llms-full.txt representation, matching every other generator.

## Puzzle cluster

Unchanged in this pass beyond the aliasing/FAQ treatment below — see the
"explicitly out of scope" section for why it wasn't expanded further.

| Intent                                                                                             | Canonical page                                                      | Notes                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool ("best RPG puzzle generator")                                                                 | `/generators/puzzle`                                                | `slugMeta.puzzle`. "Best RPG puzzle generator" added as a discovery intent alias plus a dedicated FAQ entry, not a separate page.                                                 |
| Informational ("how do you design RPG puzzles that do not stall the game?" / "multiple solutions") | `/answers/how-do-you-design-rpg-puzzles-that-do-not-stall-the-game` | **This page already receives organic traffic per the issue** — its URL and canonical are untouched by this pass.                                                                  |
| Worked example                                                                                     | `/examples/the-venting-helix-derelict-hazard`                       | Provenance: `raw` (GitHub discussion #2553). Filed under `kind: "encounter"` (the examples schema has no separate `puzzle` kind), generator field points at `/generators/puzzle`. |

Links: generator → answer and generator → example were **missing** before
the first pass (`puzzle.relatedLinks` only pointed at Quest and Dungeon
generators) and have been added. answer → generator, answer → example,
example → generator, and example → answer already existed.

Sitemap / llms-full.txt: same status as the heist cluster.

## Sitemap fix

`apps/web/src/routes/sitemap.xml/+server.ts` and `scripts/generate-sitemap.mjs`
each carried their own hand-maintained generator slug list. Both had drifted
from `apps/web/src/params/generator_slug.ts`'s `GENERATOR_SLUGS` — the live
sitemap route was missing `puzzle`, `faction-roster`, `dark-fantasy-faction`,
`constellation`, and `encounter`; the build script was missing all but four
slugs including both `heist` and `puzzle`. Both now derive their generator
routes from `GENERATOR_SLUGS` directly, so a new generator can't silently go
missing from the sitemap again.

## "Best X generator" queries — alias, not a new page

Discovery Intent Governance (Constitution XIII) treats superlative phrasing
as a variant of an existing intent, not grounds for a new URL, and no page
type on the site does ranked/roundup comparisons of one subject (`/vs/*` is
exclusively Codex-vs-competitor-tool). So "best rpg heist generator", "best
heist generator for tabletop rpg campaigns", and "best rpg puzzle generator"
were added as `intentAliases` on `generator-heist`/`generator-puzzle`
(`apps/web/src/lib/content/discovery/entries/generators.ts`), each paired
with one FAQ entry on the relevant generator page answering the "best"
framing as evaluative criteria rather than a superlative claim.

## Explicitly out of scope for this pass

- **Puzzle cluster's fixed benchmark query.** The issue asks this to be
  chosen from real Search Console/analytics traffic data, which isn't
  available from the repo. No query or landing-page traffic data has been
  recorded here — pull that from Search Console before treating any query as
  confirmed. The puzzle cluster was deliberately not expanded with new
  examples/answers this pass, to avoid adding pages before that traffic
  anchor is confirmed.
- **Baseline impressions/clicks/average position for the puzzle query.** Not
  recorded; needs Search Console access.
- **The "tiny LLM visibility benchmark"** (two fixed queries, four-week
  recheck) named in the issue does not exist anywhere in this repository and
  was not created in this pass.
- **A "refine" generator action / Zaraz event.** No refine feature exists in
  the product for any generator, heist/puzzle included, so there is nothing
  to instrument.
