# Public shell grammar

**Status:** proposed, awaiting approval. No code has been changed to match it.
**Scope:** the 30 pages under `src/routes/(marketing)`. Nothing in the app.
**Chunk:** 9, phase 1 of the [UX assessment](../reports/ai-aesthetic-ux-assessment.md).

## The actual problem

Not a taste problem. A missing-file problem.

`(marketing)/+layout.svelte` renders head tags, analytics, and
`{@render children()}`. That is all. There is no shared wordmark, navigation, or
footer for public pages, so three partial shells grew in the gap:

| Shell                         |  Pages |
| ----------------------------- | -----: |
| `SEOGeneratorLayout`          |      8 |
| `SEOPageLayout`               |      5 |
| Bare `MarketingFooter` import |      5 |
| **Nothing at all**            | **10** |

The ten with nothing include `/generators`, `/blog`, `/blog/[slug]`, every
individual generator page, `/worlds`, `/changelog`, and
`/free-rpg-campaign-manager`. Those are, after `/`, the highest-traffic public
pages on the site.

Content widths vary per page with no rule behind them: `max-w-6xl`, `5xl`,
`4xl`, `3xl`, `2xl`, `xl`. Vertical rhythm likewise: `py-32`, `py-20`, `py-18`,
`py-16`, `py-14`, `py-5`.

So "each page looks separately generated" is literally true. They were built
separately, because there was nothing to build them into.

## Constraints this grammar is written under

- **Mobile is 55% of visits**, desktop 43% ([chunk 0
  baseline](../research/chunk-0-perception-validation.md)). Every rule below is
  specified at 390px first and widened, not the reverse.
- **80% of visits are direct and 16% come from Reddit.** People land on one page
  from a link. A shared nav is worth having, but it will not be the thing that
  rescues a page: each page still has to work as an entry point on its own.
- **The workspace themes are out of scope.** Parchment, LCARS, Pip-Boy and the
  rest stay exactly as they are. This grammar covers public pages only.

## 1. Width and responsive layout

### The two-width concept

Public pages employ a deliberate **two-width architecture**:

1. **Outer page canvas**: The outer container or shell constraint (`max-w-2xl`, `max-w-4xl`, `max-w-6xl`, or widescreen `max-w-7xl` up to ~1280–1440px+). This accommodates wide layouts, multi-column navigation, responsive content + complementary sidebar split views, dashboards, and full-bleed grids without feeling cramped.
2. **Inner readable measure**: Body prose, article text, questions, and explanations **never stretch across wide viewports**. Continuous paragraphs are strictly constrained to a comfortable measure of **~65–75 characters per line** (`max-w-2xl` / `max-w-prose` / `~65ch`). Equating a wide outer shell with wide text columns is strictly prohibited.

### Outer canvas widths

Four canonical outer canvas widths, chosen by layout structure:

| Token             | Value       | Use                                                                                |
| ----------------- | ----------- | ---------------------------------------------------------------------------------- |
| `--shell-narrow`  | `max-w-2xl` | Focused single-column reading: legal, minimal announcements (~672px)               |
| `--shell-default` | `max-w-4xl` | Standard single-column forms, standard landing views (~896px)                      |
| `--shell-wide`    | `max-w-6xl` | Mid-width landing sections and marketing pages (~1152px)                           |
| `--shell-full`    | `max-w-7xl` | Widescreen layouts: directories/catalogues, article + aside, split views (~1280px) |

Horizontal padding is `px-4` below `sm`, `px-6` from `sm` up, and optionally `lg:px-8` on widescreen boundaries.

### Responsive content + aside layout

For long-form reading, documentation, answers, and articles with contextual asides (table of contents, related topics, metadata, tools):

- **Mobile (< 1024px / below `lg`)**: Stacks in natural source order into a single readable column. The contextual aside flows below the primary content or is collapsible; source order preserves accessible heading semantics.
- **Desktop (>= 1024px / `lg` and `xl` 1280px–1440px+)**: The canvas expands to `--shell-full` (`max-w-7xl` / `1280px+`). Content and aside sit side-by-side:
  - Main article/content column takes the primary span, with prose measure bounded at ~65–75ch (`max-w-2xl` / `max-w-prose`).
  - Contextual aside occupies a bounded rail (`w-64` to `w-80` / `col-span-4`), sticky where appropriate, without giant blank dead zones or generic CTA clutter.

### Inner prose measure

| Token             | Value                  | Use                                            |
| ----------------- | ---------------------- | ---------------------------------------------- |
| `--prose-measure` | `max-w-2xl` (~65–75ch) | Paragraphs, blockquotes, article copy, intros  |
| `--prose-lead`    | `max-w-3xl`            | Lead summaries, hero descriptions, subheadings |

## 2. Vertical rhythm

Four steps, not eleven.

| Step    | Mobile  | Desktop | Use                             |
| ------- | ------- | ------- | ------------------------------- |
| Section | `py-12` | `py-20` | Between major page sections     |
| Block   | `py-8`  | `py-12` | Between blocks inside a section |
| Group   | `gap-4` | `gap-6` | Between related items           |
| Item    | `gap-2` | `gap-2` | Within one item                 |

`py-32` heroes go. On a 390px screen a 128px pad is a third of the viewport
spent on nothing.

## 3. Typography roles

Four roles. If a piece of text is not one of these, it is body.

| Role            | Treatment                                                            |
| --------------- | -------------------------------------------------------------------- |
| Page title      | `font-header`, `text-3xl` mobile / `text-5xl` desktop, sentence case |
| Section heading | `font-header`, `text-xl` / `text-2xl`, sentence case                 |
| Body            | `font-body`, `text-base`, max 70 characters per line                 |
| Metadata        | `font-mono`, `text-xs`, **uppercase permitted here and only here**   |

## 4. The uppercase rule

This is the countable part of the chunk.

**Uppercase and wide tracking are for metadata only:** dates, entity types,
breadcrumb context, small status labels, tags. Everything else is sentence case,
including buttons, section titles, navigation, and instructional text.

Current counts, measured today:

| Scope                | Components | `uppercase` occurrences |
| -------------------- | ---------: | ----------------------: |
| Whole app            | 252 of 368 |                   1,137 |
| **Marketing routes** |     **14** |                 **102** |

Only the marketing figure is in scope. The target is **fewer than 30 remaining
in marketing routes**, all of them metadata by the definition above, with the
before and after count stated in the PR. A motif reads as authored when it is
selective and as generated when it is applied to everything.

## 5. Action hierarchy

At most **one primary action per view**. Filled, theme-primary, the thing you
want them to do.

Secondary actions are outlined. Tertiary are text links. A page presenting four
equally weighted buttons has decided nothing on the visitor's behalf, which is
what the assessment means by "the visitor spends more time reading the product's
name than choosing what to do".

Primary actions sit **above the fold on mobile**, before any large graphic.

## 6. When ornament is allowed

| Device         | Allowed when                                              | Not allowed                                                         |
| -------------- | --------------------------------------------------------- | ------------------------------------------------------------------- |
| Card           | Items are genuinely parallel and comparable               | As a container for a single thing, or to add visual weight to prose |
| Uppercase      | Metadata, per section 4                                   | Buttons, headings, nav, body                                        |
| Shadow         | Something floats above the page (menu, modal, sticky bar) | Static sections, to imply depth                                     |
| Gradient       | Never on public pages in this pass                        |                                                                     |
| Genre ornament | The page is about that genre, e.g. a theme hub            | Site chrome                                                         |

## 7. The shell itself

One component, `MarketingShell`, rendered by `(marketing)/+layout.svelte` so all
30 pages inherit it:

- **Header:** wordmark linking to `/`, up to five nav items, one primary action
  ("Open the app"). Collapses to wordmark plus menu below `md`.
- **Main:** a landmark with the width token as a prop, defaulting to
  `--shell-default`.
- **Footer:** the existing `MarketingFooter`, reparented here rather than
  imported per page.

`SEOPageLayout` and `SEOGeneratorLayout` become consumers of it rather than
parallel implementations.

## Sequence

1. This document, approved. _(no code)_
2. Build `MarketingShell`, wire it into the route-group layout, refactor the two
   SEO layouts to consume it. Capture visual fixtures at 390 and 1440 **before**
   any page-specific change.
3. Migrate the 10 orphan pages, deleting their bespoke chrome.
4. Uppercase and card pass across the 14 marketing components, with counts.
5. Verify: fixture diffs, the chunk 7 axe harness against public routes, 390px
   first.

## What this will not do

Worth stating so the chunk is judged on what it can deliver.

It will not move the number that most needs moving: `/tools` and the individual
generator pages sit at **1.17 to 1.20 views per visit**. People arrive, act or do
not, and leave. A consistent nav helps people who navigate between pages, and
most visitors here do not. That number is chunk 10's problem, and this chunk is
the foundation it needs rather than the fix itself.

## 7. Route inventory (widescreen pass, #4437)

Classes: **grid** = catalogue/directory, **prose** = long-form copy,
**structured** = landing sections, **tool** = forms and interactive output.

| Route family                                              | Class         | Container                                                                                                           | Decision                                                     |
| --------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `/explore`, `/explore?label=`                             | grid          | `max-w-7xl`, 3 columns at `xl`                                                                                      | Widened                                                      |
| `/examples`                                               | grid          | `max-w-7xl`, 3 columns at `xl`                                                                                      | Widened                                                      |
| `/examples/[slug]`                                        | structured    | `max-w-7xl`, 8/4 split at `lg`                                                                                      | Widened; generation context floats right                     |
| `/generators`, `/generators/[theme]`, `/tools`            | grid          | `max-w-7xl`, 4 columns at `xl`                                                                                      | Widened                                                      |
| `/for`                                                    | grid          | `max-w-7xl`, 4 columns at `xl`                                                                                      | Widened                                                      |
| `/features`, `/worlds`                                    | grid          | `max-w-7xl`                                                                                                         | Widened; card grids already responsive                       |
| `/blog`, `/answers`, `/topics/*`                          | mixed         | `max-w-7xl`                                                                                                         | Done in #4434, #4435, #4436                                  |
| `SEOPageLayout` (`/features/[slug]`, `/vs`, `/solutions`) | structured    | hero, FAQ, related `max-w-4xl`; features grid, product proof, hosting table `max-w-7xl`; feature matrix `max-w-6xl` | Widened where grid, media or table; hero and FAQ stay narrow |
| `/generators/[slug]`, `/tools/*` generator pages          | tool          | `SEOGeneratorLayout`                                                                                                | Exception: control/output pair is tuned                      |
| `/silhouettes`                                            | tool          | own layout                                                                                                          | Exception: interactive explorer                              |
| `/resources/castle-floorplans`                            | grid          | `max-w-7xl`, 2 columns at `lg`, 4 for next steps                                                                    | Widened; intro stays `max-w-2xl`                             |
| `/changelog`, `/responsible-ai-worldbuilding`             | prose         | `max-w-2xl` to `4xl`                                                                                                | Exception: long-form copy stays readable                     |
| `/privacy`, `/terms`                                      | prose         | `max-w-5xl`, text `max-w-3xl` plus a 16rem rail at `lg`                                                             | Text stays at reading width; sticky contents rail beside it  |
| `/biomes`                                                 | grid + detail | `max-w-7xl`, 4 columns at `xl`; detail 7/5 split at `lg`                                                            | Widened; the profile editor keeps `max-w-6xl`                |

Prose measure (`max-w-2xl`/`3xl`) on intros is unchanged everywhere.
