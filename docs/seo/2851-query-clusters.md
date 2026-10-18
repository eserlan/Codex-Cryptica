# Issue #2851 query-cluster map

Snapshot date: 2026-09-09

This document records the canonical ownership and release checks for the RPG
rumours and fictional religions clusters. It is a measurement plan as well as a
content map: search and Zaraz values must be filled from the external tools
before promotion and again after indexing has settled.

## Canonical ownership

| Search intent                                                      | User job                                  | Canonical page                                               | Supporting pages                                                                                                                     |
| ------------------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| RPG rumour generator, RPG rumor generator, tavern rumour generator | Create                                    | `/generators/rumour`                                         | `/answers/how-do-you-generate-useful-rpg-rumours`, `/examples/lowmere-six-words-rumour-table`                                        |
| How do I generate useful RPG rumours?                              | Understand                                | `/answers/how-do-you-generate-useful-rpg-rumours`            | `/answers/how-to-create-rumours-for-a-fantasy-town`, `/answers/how-do-you-create-quest-hooks-without-railroading`                    |
| Tabletop RPG rumours and a finished rumour table                   | See an example                            | `/examples/lowmere-six-words-rumour-table`                   | `/generators/rumour`, `/answers/how-do-you-generate-useful-rpg-rumours`                                                              |
| How do you create rumours for a fantasy town?                      | Understand a narrower settlement workflow | `/answers/how-to-create-rumours-for-a-fantasy-town`          | The broader rumour answer and Settlement Generator                                                                                   |
| How do I create a believable fictional religion?                   | Understand                                | `/answers/how-do-you-create-a-believable-fictional-religion` | Faction, Pantheon, and Secret Society generators; fictional language, faction, and settlement answers                                |
| Fantasy religion generator                                         | No dedicated owner                        | No page is claimed                                           | Use the Faction, Pantheon, or Secret Society workflow only where it fits the user's actual job. No religion generator claim is made. |

The fantasy-town answer remains a distinct narrower page. Its job is to build
an information network inside one settlement; the new answer owns the broader
six-entry pattern across RPG genres and campaign situations.

## Discovery and route checks

- `bun scripts/discovery-audit.mjs` passes with no deterministic errors. The
  remaining warnings are pre-existing `/tools` and `/generators` overlaps.
- The answer, generator, and example are all included in the generated sitemap.
- `llms.txt` and `llms-full.txt` include the new answer and example, and the
  short file now calls out the rumour generator.
- The cluster test at
  `apps/web/src/lib/content/discovery/issue-2851-clusters.test.ts` checks intent
  ownership, canonical route registration, and reciprocal answer, example, and
  generator links.
- The religion answer already has a crawlable worked example and reciprocal
  links to its closely related faction, settlement, language, pantheon, and
  secret-society answers. This issue adds practice variation, authority, and
  reform detail without creating a second religion page.
- The religion page's planned image/content cleanup is left to the separate
  work that owns that asset. This cluster change does not duplicate or replace
  that work.

## Measurement record

The repository does not contain Search Console or Zaraz dashboard values. The
release owner should record the following before promotion:

| Benchmark query                                  | Baseline impressions |    Baseline clicks |  Baseline position | Baseline landing page |
| ------------------------------------------------ | -------------------: | -----------------: | -----------------: | --------------------- |
| How do I generate useful RPG rumours?            |   External dashboard | External dashboard | External dashboard | External dashboard    |
| How do I create a believable fictional religion? |   External dashboard | External dashboard | External dashboard | External dashboard    |

The four-week recheck is due on 2026-10-07 or the nearest reporting window
after it. Record the same fields, plus whether the landing page is the claimed
canonical page.

The existing public discovery events cover the transitions needed for this
cluster: answer and example links emit `discovery_click`, generator submissions
emit `generator_started` and `generator_completed`, and existing copy, open,
save, and refinement actions retain their public-generator events. These events
carry page or generator identifiers only, not prompts or generated lore.
