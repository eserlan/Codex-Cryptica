# Heist & puzzle cluster map (#2850)

Audit of the heist and RPG-puzzle query clusters: one canonical page per
intent, the links between them, and their discovery-surface status. Written
alongside the code fixes in #2850; update this file whenever a page in either
cluster is added, retitled, or relinked.

## Heist cluster

| Intent                                                        | Canonical page                                       | Notes                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool ("best/RPG/tabletop RPG heist generator")                | `/generators/heist`                                  | `slugMeta.heist` in `apps/web/src/lib/components/seo/generator-page-meta.ts`. Title: "Heist Generator \| RPG Score & Infiltration Creator \| Codex Cryptica". Keywords now include `heist generator`, `rpg heist generator`, `tabletop rpg heist generator`, `infiltration scenario generator`, `blades in the dark score generator`, `dnd heist ideas`. |
| Informational ("how to run/design a heist in a tabletop RPG") | `/answers/how-do-you-run-a-heist-in-a-tabletop-rpg`  | `apps/web/src/lib/content/answers/pages/how-do-you-run-a-heist-in-a-tabletop-rpg.ts`. FAQPage + BreadcrumbList JSON-LD generated generically via `answers/json-ld.ts`.                                                                                                                                                                                   |
| Worked example                                                | `/examples/the-breakwater-vault-space-western-heist` | `apps/web/src/lib/content/examples/pages/the-breakwater-vault-space-western-heist.ts`. Provenance: `raw` (verbatim output, GitHub discussion #2790). CreativeWork + BreadcrumbList JSON-LD via `examples/json-ld.ts`.                                                                                                                                    |

Links (all now bidirectional):

- generator → answer, generator → example (`heist.relatedLinks`)
- answer → generator ("Generate a heist" CTA), answer → example (`relatedTools`/example cross-refs)
- example → generator, example → answer (`relatedGenerators`, `relatedAnswers`)

Sitemap: included (answers/examples were always pulled dynamically from their
registries; the generator route is now derived from `GENERATOR_SLUGS` instead
of a hand-maintained list — see fix below). `llms-full.txt`: answer and
example are included automatically via `scripts/generate-llms-full.mjs`
(walks the answers/examples registries); the generator page itself has no
llms-full.txt representation, matching every other generator.

## Puzzle cluster

| Intent                                                                                             | Canonical page                                                      | Notes                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool ("best RPG puzzle generator")                                                                 | `/generators/puzzle`                                                | `slugMeta.puzzle`. Title: "RPG Puzzle Generator \| Table-Ready Encounter Puzzles \| Codex Cryptica".                                                                                                                   |
| Informational ("how do you design RPG puzzles that do not stall the game?" / "multiple solutions") | `/answers/how-do-you-design-rpg-puzzles-that-do-not-stall-the-game` | `apps/web/src/lib/content/answers/pages/how-do-you-design-rpg-puzzles-that-do-not-stall-the-game.ts`. **This page already receives organic traffic per the issue** — its URL and canonical are untouched by this pass. |
| Worked example                                                                                     | `/examples/the-venting-helix-derelict-hazard`                       | Provenance: `raw` (GitHub discussion #2553). Filed under `kind: "encounter"` (the examples schema has no separate `puzzle` kind), generator field points at `/generators/puzzle`.                                      |

Links: generator → answer and generator → example were **missing** before
this pass (`puzzle.relatedLinks` only pointed at Quest and Dungeon
generators) and have been added. answer → generator, answer → example,
example → generator, and example → answer already existed.

Sitemap / llms-full.txt: same status as the heist cluster.

## Sitemap fix (this pass)

`apps/web/src/routes/sitemap.xml/+server.ts` and `scripts/generate-sitemap.mjs`
each carried their own hand-maintained generator slug list. Both had drifted
from `apps/web/src/params/generator_slug.ts`'s `GENERATOR_SLUGS` — the live
sitemap route was missing `puzzle`, `faction-roster`, `dark-fantasy-faction`,
`constellation`, and `encounter`; the build script was missing all but four
slugs including both `heist` and `puzzle`. Both now derive their generator
routes from `GENERATOR_SLUGS` directly, so a new generator can't silently go
missing from the sitemap again.

## Explicitly out of scope for this pass

- **Puzzle cluster's fixed benchmark query.** The issue asks this to be
  chosen from real Search Console/analytics traffic data, which isn't
  available from the repo. No query or landing-page traffic data has been
  recorded here — pull that from Search Console before treating any query as
  confirmed.
- **Baseline impressions/clicks/average position for the puzzle query.** Not
  recorded; needs Search Console access.
- **The "tiny LLM visibility benchmark"** (two fixed queries, four-week
  recheck) named in the issue does not exist anywhere in this repository and
  was not created in this pass.
- **A "refine" generator action / Zaraz event.** No refine feature exists in
  the product for any generator, heist/puzzle included, so there is nothing
  to instrument.
