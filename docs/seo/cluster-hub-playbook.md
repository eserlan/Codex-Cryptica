# Building an exhaustive cluster hub

A step-by-step method for taking a topic (a generator, a technique, a query
space) from "one page exists" to "this topic cannot be searched or asked
about without Codex Cryptica coming up" — without tripping the site's own
anti-cannibalization rules or shipping thin, fabricated, or orphaned pages.

This is the generalised version of the process used for the heist cluster
(#2850, #2852, #2855). Read `docs/seo/heist-puzzle-cluster-map.md` alongside
this for a worked example of every step below.

## What a cluster is

A cluster is a `parentCluster` in the Discovery Intent Registry: a group of
pages about one subject, each doing a **different job** for the reader. On
this site the jobs that matter for a content cluster are:

| Job                             | Page type                         | Question it answers                                           |
| ------------------------------- | --------------------------------- | ------------------------------------------------------------- |
| `create`                        | `/generators/[slug]`              | "make me one now"                                             |
| `understand` / `adopt-workflow` | `/answers/[slug]`                 | "how does this work" / "how do I run this"                    |
| `see-an-example`                | `/examples/[slug]`                | "show me a finished one"                                      |
| `evaluate`                      | `/vs/[slug]`, `/solutions/[slug]` | "is this tool right for me" (never "which technique is best") |
| `navigate`                      | index/hub pages                   | "where do I go for X"                                         |

**A full cluster is one page per job that has real content to justify it —
not one page per keyword.** A generator with no answer page has an
unserved `understand` job; an answer with no example has an unserved
`see-an-example` job. Filling those gaps is expansion. Adding a second page
for a job that's already served is cannibalization, and the site's own audit
script will say so.

## Step 0: Audit before writing anything

Before adding a single file, find out what already exists and who already
owns the intent.

```sh
bun scripts/discovery-audit.mjs        # errors + warnings across the whole registry
bun scripts/discovery-report.mjs       # cluster × job coverage matrix
```

Also grep by hand — the audit only catches registered pages:

```sh
grep -rli "<topic>" apps/web/src/lib/content/{answers,examples}/pages apps/web/src/lib/components/seo/generator-page-meta.ts apps/web/src/lib/content/for/packs
```

Write down, before touching anything:

- every existing page that already touches the topic (generator, answers,
  examples, `/for` pages, `/tools` stubs);
- for each, its `parentCluster`, `primaryIntent`, and `userJob`;
- which jobs in the table above are already served, and which are empty.

If there's a page already earning real search traffic in this space
(check Search Console if you have access), **do not move or rename it.**
Expansion adds pages around it; it does not touch its URL or canonical.

## Step 1: Decide what's actually missing

Map target queries to jobs, not to pages:

- "best X generator" / "X generator" / "tabletop X generator" → all the same
  `create` job, already served by the one generator page. These are
  **aliases of an existing intent**, not new pages (see Step 2).
- "how do you run/design X" → `understand` or `adopt-workflow`. If nothing
  answers this, that's a new answer page.
- A second, genuinely different question about the same subject (e.g. "how
  do you run a heist" vs "what makes a good heist target") → a **second**
  answer page is fine, provided it does a different job or covers a
  different sub-question. See Step 3.
- "show me one" → an example page. One example per genre/system variant that
  a real searcher would land on is reasonable; one example per keyword
  variant is not.

Do not invent a new page type (a ranked roundup, a comparison-of-techniques
page) unless you've checked for precedent first — see Step 2.

## Step 2: "Best X" queries are aliases, not pages

Constitution XIII (Discovery Intent Governance) Rule 3 is explicit: _"Obvious
synonyms, plurals and word-order variants MUST be recorded as aliases of the
existing canonical intent rather than becoming separate pages."_ Superlative
phrasing ("best", "top") is a variant, not a new intent, unless there is
already a site-wide precedent for ranked/roundup pages (there isn't — `/vs/*`
is exclusively Codex-vs-competitor-tool comparisons, never one subject vs
itself).

The correct treatment:

1. Add the phrase to the generator's (or answer's) `intentAliases` in
   `apps/web/src/lib/content/discovery/entries/generators.ts` (or the
   relevant entries file).
2. Add **one** FAQ entry to that page's content
   (`apps/web/src/lib/components/seo/generator-page-meta.ts` for generators)
   that answers the "best" framing as **evaluative criteria** ("look for
   layered security, escalating failure, a getaway that isn't a formality")
   rather than a superlative claim about itself. This is both more honest
   and exactly the shape an FAQPage / LLM answer engine wants to quote.

Never build a dedicated page for this. If you're tempted to, first grep the
whole answers/`/vs/` registry for `"best"` to check whether any precedent
exists — as of this writing, none does, and inventing one violates Rule 5
("not a keyword-page factory").

## Step 3: A second answer page, safely

Multi-answer clusters are normal — several clusters already carry five to
seven answers each. The safety mechanism is the `discovery` block on
`AnswerConfigInput` (`apps/web/src/lib/content/answers/schema.ts`):

```ts
discovery: {
  id: "answer-<new-slug-ish-id>",
  parentCluster: "<same cluster as the sibling page>",
  primaryIntent: "<the specific question this page answers>",
  intentAliases: [...],
  userJob: "understand",   // pick a job DIFFERENT from every sibling in the cluster
  uniqueValue: "<what this page covers that the sibling doesn't, one sentence>",
  relatedIntents: ["answer-<sibling-id>"],
  acknowledgedOverlap: [{
    with: "answer-<sibling-id>",
    reason: "<one sentence: why both exist despite sharing a subject>",
  }],
},
```

Two rules that keep this safe:

- **Pick a `userJob` no sibling in the cluster already has**, or if you must
  share one, make sure the `uniqueValue` and `intentAliases` use different
  vocabulary from the sibling (see `clusterGenericTokens` in
  `apps/web/src/lib/content/discovery/audit.ts` — a term used by 3+ entries
  in a cluster stops counting as a collision signal, but with only two
  answers, shared distinctive words like "design" between two genuinely
  different pages will trip `same-job-same-vocabulary`).
- **`acknowledgedOverlap` does not need to be added in both directions**,
  but do add the reciprocal `relatedIntents` entry on the _existing_ page
  too, and add the new slug to the existing page's `relatedAnswers` array.

Run `bun scripts/discovery-audit.mjs` after adding the entry. Zero new
warnings is the bar — if you see `same-job-same-vocabulary` naming your new
page, reword the aliases/`uniqueValue` before shipping, don't ignore it.

Then run `bun sync:answers` (if the answer file wasn't picked up
automatically) and `bun run check:answer-mesh` to confirm the reciprocal
link exists.

## Step 4: Worked examples, generated honestly

An example with no real content behind it is worse than no example — the
schema (`apps/web/src/lib/content/examples/schema.ts`) exists specifically
to prevent quietly presenting polished or fabricated text as genuine output.
Provenance is `"raw"` (verbatim, unedited) or `"lightly-edited"` (state what
changed in `provenanceNote`). There is no third option, and no schema
escape hatch for "content I imagined would fit."

### Producing genuine content

Every generator in this codebase can be driven outside the browser through
the local `oracle-proxy` worker, the same way `scripts/heist-eval.ts`
demonstrates for the heist generator:

```sh
# terminal 1
bun run dev:proxy          # wrangler dev on the oracle-proxy worker, :8787
                            # needs a provider key (e.g. OPENAI_API_KEY) in
                            # apps/workers/oracle-proxy/.dev.vars

# terminal 2, a throwaway script in your scratchpad
```

```ts
import { generateViaProxy } from "/absolute/path/to/scripts/heist-eval"; // heist-specific.
// For any other generator, there is no reusable generateViaProxy — instead find its
// DefaultGeneratorEngine.generateX(...) method in
// apps/web/src/lib/services/seo/generator-engine.ts, then follow its imports to the
// matching prompt builder (e.g. packages/generator-engine/src/public-<name>.ts's
// buildXPrompt) and response parser, and drive that same pair against the proxy.

const draft = await generateViaProxy(
  "http://localhost:8787",
  someType,
  someGenre,
);
// draft.content / draft.lore is genuine, audited, repaired-if-needed output
```

The worker's session-token guard fails open under `wrangler dev` (no
`SESSION_TOKEN_SECRET` set locally), which is documented and intentional in
`scripts/heist-eval.ts`'s own header comment — this is how a script gets AI
output without a browser-issued Turnstile token. It spends real provider
tokens against whichever key is in `.dev.vars`.

Once you have genuine `content`/`lore`, hand-convert it into
`ExampleBlockSchema` blocks (`prose`/`list`/`facts`), matching the section
headings and structure the raw output already has — do not rewrite the
substance, only the container. Write the `annotation` (the editorial
reading) and `context` (metadata chips) by hand; those are supposed to be
curatorial, not generated.

If the content isn't in English-British spelling throughout (check for
`-ize`/`-or`/`-er` American endings), fix that during conversion and note it
in `provenanceNote` if it's the only edit made.

### Producing a genuine hero image

Every example needs an R2-hosted hero image
(`https://assets.codexcryptica.com/announcements/*`) — enforced in practice
by `examples/registry.test.ts` even though the schema field is optional.
The same local proxy serves image generation, over Cloudflare Workers AI,
with no extra secret required:

```sh
curl -X POST http://localhost:8787/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{"prompt": "<scene description, no people if the prompt risks a safety flag>", "width": 1024, "height": 683}'
```

Decode the base64 `result.image` to a file. If the response is
`500 IMAGE_GEN_FAILED` with "output has been flagged," the prompt likely
implies injury, violence, or a vulnerable person — rephrase around the
scene/objects instead of the person, or drop people from the shot entirely.
Two image endpoints share this rule: content generation and image generation
both refuse over safety triggers, and there's no override.

Upload with the exact pattern documented in `docs/deployment/assets.md`:

```sh
bunx wrangler r2 object put \
  codex-cryptica-statics/announcements/<key>.jpg \
  --file=<local-path> \
  --content-type=image/jpeg \
  --remote
```

`--remote` is mandatory — without it wrangler reports success but writes
only to the local simulator. Verify with `curl -I` that the public URL
actually returns `200` before referencing it in code. Then add a row to
`docs/deployment/r2-asset-db.md` (key, size, type, date, one-line purpose) —
this snapshot doc is hand-maintained and silently goes stale otherwise.

## Step 5: Wire every page to every other page

The goal is a fully-connected subgraph: generator ↔ every answer, generator
↔ every example, every answer ↔ every other answer in the cluster, every
example ↔ its generator and relevant answers, and same-subject examples ↔
each other. Concretely:

- Generator page: add each new answer/example to
  `slugMeta.<slug>.relatedLinks` in `generator-page-meta.ts`.
- Each answer: add the sibling answer's slug to `relatedAnswers`; add the
  generator and any relevant sibling tools to `relatedTools`.
- Each example: `relatedGenerators`, `relatedAnswers` (as full `{title,
description, href}` link objects, not slugs), and `relatedExamples` (plain
  slug strings) for sibling examples.

Verify with:

```sh
bun run check:answer-mesh        # reciprocal answer links, no broken hrefs
bun scripts/discovery-audit.mjs  # no dangling relatedIntents, no cannibalization
```

Do not force a link that doesn't read naturally just to raise a link count —
the mesh checker flags _missing_ reciprocity, not link density, and an
unnatural cross-reference reads as SEO filler to both readers and crawlers.

## Step 6: Discovery registry entries

Every new answer/example needs a matching entry (answers are usually
auto-derived from the page file's own `discovery` block via
`apps/web/src/lib/content/discovery/entries/answers.ts`; examples need a
**hand-added** entry in `entries/examples.ts`, since example registration is
never automatic). Match the shape of a sibling entry exactly: `id`,
`pageKind`, `canonicalPath`, `primaryIntent`, `intentAliases`, `userJob`,
`uniqueValue`, `parentCluster`, `relatedIntents`, `indexable: true`,
`status: "live"`.

Cross-check every id you reference in `relatedIntents` actually exists:

```sh
grep -n 'id: "<the-id>"' apps/web/src/lib/content/discovery/entries/*.ts
```

A dangling reference is a build-time discovery-audit error, not a warning.

## Step 7: Discovery surfaces — sitemap and llms.txt

Answers and examples are pulled dynamically from their registries into
`apps/web/src/routes/sitemap.xml/+server.ts` and
`scripts/generate-llms-full.mjs` — nothing to do here once Steps 3-4 are
registered.

**Generator pages are the risk.** At least one sitemap implementation in
this codebase has, historically, hardcoded its own copy of the generator
slug list instead of importing `GENERATOR_SLUGS` from
`apps/web/src/params/generator_slug.ts`, and it drifted (a generator was
live and linkable but silently absent from the sitemap — see #2850's
`/generators/puzzle` bug). If you're touching a generator's discoverability,
check both `apps/web/src/routes/sitemap.xml/+server.ts` and
`scripts/generate-sitemap.mjs` derive their `generatorRoutes` from
`GENERATOR_SLUGS` rather than a private list, and fix it the same way if not
(it's a one-line import swap, not a rewrite).

Regenerate and check by hand:

```sh
bun scripts/generate-sitemap.mjs
grep -c "<new-slug>" apps/web/static/sitemap.xml   # expect >= 1 per new page
```

## Step 8: Full verification pass

Run, in this order, before opening a PR:

```sh
bun sync:answers                        # if a new answer wasn't auto-registered
bun scripts/discovery-audit.mjs         # 0 errors; review any new warnings
bun run check:answer-mesh               # reciprocal links, no broken hrefs
cd apps/web && bunx vitest run src/lib/content src/lib/components/seo/generator-page-meta.test.ts src/routes/sitemap.xml
bunx tsc --noEmit -p .
```

The `registry.test.ts` suites for answers and examples are strict on
purpose: British spelling, a mandatory `example` section on every answer (a
`checklist` section is expected for framework-style answers specifically,
not enforced site-wide), mandatory R2 image + `sourceUrl` on examples, no
duplicate titles/descriptions, no self-referential or dangling links,
minimum word counts. Treat every failure as a real defect, not friction — it
is catching exactly the kind of thin or dishonest content this playbook
exists to avoid.

## What this playbook will not do for you

- **Pick which query is worth building around.** That needs real Search
  Console / analytics traffic data. If you don't have it, expand around the
  pages that already exist and leave any page that's already earning
  organic traffic untouched — don't guess a "better" canonical query and
  redirect away from a working one.
- **Tell you when to stop.** A cluster is exhaustive when every real job in
  the table in "What a cluster is" is served once, well. A second example
  in the same genre, a third answer restating the first two, or a page built
  because a keyword exists rather than because a reader has that job, is
  where "exhaustive" tips into "keyword-page factory" — the exact failure
  mode Constitution XIII Rule 5 exists to block. When in doubt, under-build
  and let traffic data tell you what to add next.
- **Write an LLM-visibility benchmark for you.** If the goal includes being
  citable by AI answer engines, that requires manually asking the target
  queries against ChatGPT/Claude/Perplexity/Google AI Overviews and
  recording whether/how Codex Cryptica is cited, on a schedule (e.g. after
  initial indexing, then a four-week recheck). No script in this repo
  automates that as of this writing.
