# Chunk 0: Perception validation

**Status:** baseline captured, sessions not yet run.
**Blocks:** chunks 9 through 14 of the
[UX assessment](../reports/ai-aesthetic-ux-assessment.md).
**Cost:** one afternoon of sessions. No design work happens in this chunk.

## Why this exists

Chunks 9 through 14 are four L-sized workstreams and the majority of the plan by
effort. They rest on one reviewer's read that the product "looks AI-made". That
read may be right. It has not been tested on a single user, and the plan spends
months on it either way.

This chunk buys the answer for an afternoon. Its output is one page: what
fraction of first-time GMs describe the product as generic, templated, or
AI-made **unprompted**, and which surface they name.

## The decision rule, agreed in advance

Write the numbers down before running the sessions, so the result cannot be
argued into whichever answer suits the schedule.

| Result                                                   | What happens to chunks 9 to 14                                                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Fewer than a third** raise it unprompted (0 to 2 of 6) | Rescoped to Tier B only: duplicate generators, blog structure, uppercase audit. The brand-shell rebuild is dropped. |
| **A third to a half** (2 to 3 of 6)                      | Tier B proceeds. The named surface, and only that surface, gets shell work.                                         |
| **A majority** raise it (4+ of 6)                        | Chunks 9 to 14 proceed in full, prioritised by the surfaces participants named.                                     |

## Part 1: analytics baseline

Captured 2026-08-08 for the 30 days ending that date, from Cloudflare Web
Analytics, production only (site tag `95cbc0a78e3a4889878ad91f062f41fc`,
`codexcryptica.com`).

**Volume:** 3,080 page views across 1,880 visits, 1.64 views per visit.

### Entry and depth by route

`views/visit` is the closest available proxy for engagement depth: a value near
1.0 means visitors arrive and leave without a second page.

| Route                             | Views | Visits | Views/visit |
| --------------------------------- | ----: | -----: | ----------: |
| `/` (welcome)                     | 1,160 |    690 |        1.68 |
| `/generators`                     |   180 |    110 |        1.64 |
| `/generators/adventure-generator` |   130 |    110 |        1.18 |
| `/import`                         |   100 |     70 |        1.43 |
| `/map`                            |    90 |     30 |        3.00 |
| `/generators/sci-fi`              |    80 |     50 |        1.60 |
| `/canvas`                         |    80 |     30 |        2.67 |
| `/tools`                          |    70 |     60 |        1.17 |
| `/generators/dungeon-generator`   |    70 |     50 |        1.40 |
| `/generators/pirate`              |    60 |     50 |        1.20 |
| `/table`                          |    60 |     20 |        3.00 |
| `/blog`                           |    30 |     10 |        3.00 |

The welcome page is 38% of all views and 37% of all visits, so it is the single
surface most worth getting right regardless of how the sessions land.

`/tools` and the individual generator pages sit at 1.17 to 1.20 views per visit:
people arrive, use or do not use the thing, and leave. That is the shape chunk
10's "decision-first welcome" is trying to change, and it is the number to
re-measure afterwards.

### Devices

| Device  | Visits | Share |
| ------- | -----: | ----: |
| Mobile  |  1,030 | 54.8% |
| Desktop |    810 | 43.1% |
| Tablet  |     40 |  2.1% |

**Mobile is the majority of real traffic.** Worth holding onto: the assessment's
desktop-heavy findings describe the minority case, and any chunk 9 to 14 work
that is validated only at 1440px is being validated on the smaller half of the
audience.

### Referrers

| Source                | Visits | Share |
| --------------------- | -----: | ----: |
| Direct or unknown     |  1,510 | 80.3% |
| Reddit (app + web)    |    300 | 16.0% |
| GitHub                |     30 |  1.6% |
| Search (Bing, Google) |     20 |  1.1% |
| Other                 |     20 |  1.1% |

Search is a rounding error today. That matters for how the SEO generator pages
are judged: they are not currently earning search traffic, so their value has to
be argued on something other than the numbers in this table.

### What these numbers cannot tell you

Be honest about the gaps rather than reading them as zeros:

- **Bounce rate is not available.** Cloudflare Web Analytics does not expose it.
  `views/visit` is a proxy, not the same measure.
- **Scroll depth is not tracked at all.** The assessment asks for it. Getting it
  means adding an event, which is a product decision this chunk does not make.
- **Save-to-vault conversion is not in this dataset.** It is a Zaraz custom
  event (`public_generator_action_clicked`, `vault_created`), which lands in
  whatever Zaraz destination is configured, not in the RUM tables queried here.
  Pull it from the Zaraz destination before the sessions if you want the funnel.
- **Counts are rounded** to the nearest ten by the sampling, so small routes are
  indicative only.

### Re-running this

```
POST /graphql   (Cloudflare API)
viewer.accounts(filter:{accountTag: <account>}).rumPageloadEventsAdaptiveGroups(
  filter:{siteTag:"95cbc0a78e3a4889878ad91f062f41fc", datetime_geq:…, datetime_leq:…},
  orderBy:[count_DESC]
) { count sum{visits} dimensions{ requestPath deviceType refererHost } }
```

Note there are two RUM sites on the account. The second
(`ca9ad35e23a249548abe62e7222576db`, a multi-host ruleset) returns no data;
querying it and concluding "no traffic" would be wrong.

## Part 2: moderated sessions

### Recruiting

Five to eight GMs who have **not seen Codex Cryptica**. Mixed systems, not only
D&D 5e. Do not recruit from the existing Reddit audience: they have seen the
posts and will have absorbed the framing, which is the exact thing being tested.

Six is the working target. Below five, the decision rule cannot be applied
honestly.

### Setup

Production, `https://codexcryptica.com`, on the participant's own device.
Roughly half on mobile, since that is 55% of real traffic. Screen share, think
aloud, record if they consent. Fifteen minutes each.

**Say nothing about AI, design, or what the product is.** The whole measurement
is what they volunteer. If you name the topic first, the result is worthless.

### The script

Two questions, verbatim. Do not improvise around them.

> **Q1.** "What do you think this product is, and what would you click first?"

Let them talk. Silence is allowed. The only permitted prompt is "anything else?"
Stop at two minutes.

> **Q6.** "Which parts feel handcrafted, and which feel automated?"

Ask this **after** they have looked around for a few minutes. Let them navigate
where they want first; note which surfaces they actually visited, since a
surface they never saw cannot be named.

### What to record

For each participant, verbatim where possible:

| Field                                          | Notes                                                   |
| ---------------------------------------------- | ------------------------------------------------------- |
| P# and device                                  | Mobile or desktop                                       |
| Systems they run                               | For context on the sample                               |
| Q1: first category named                       | Their words, e.g. "a wiki for campaigns", "an AI thing" |
| Q1: generic/templated/AI mentioned unprompted? | **Yes or no. This is the headline number.**             |
| Q1: first click                                | Which control                                           |
| Surfaces visited before Q6                     | Welcome, Tools, a generator, blog, the app itself       |
| Q6: named handcrafted                          | Their words                                             |
| Q6: named automated                            | Their words                                             |
| Notable verbatim                               | One line worth quoting back                             |

## Part 3: the finding

Fill this in and delete the placeholders. One page, no design recommendations.

**Date:** _(run date)_ **Participants:** _(n)_ **Devices:** _(split)_

**Headline:** _n_ of _N_ participants described the product as generic,
templated, or AI-made unprompted in Q1.

**Surfaces named as automated in Q6:** _(list with counts)_

**Surfaces named as handcrafted in Q6:** _(list with counts)_

**First-click distribution:** _(control, count)_

**Decision, per the rule above:** _(rescope to Tier B / single-surface / proceed
in full)_

**What surprised us:** _(one or two lines; this is where the value usually is)_

### Failure mode to watch

If participants describe the product as handcrafted but cannot complete
"open the sample world and tell me what is connected to Eldrin" or "find every
character without using the graph", then perception improved and usability did
not. That is the wrong trade, and it should be recorded here even though those
questions are outside chunk 0's two.
