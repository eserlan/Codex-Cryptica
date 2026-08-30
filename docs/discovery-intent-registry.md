# Discovery intent registry

**Status:** active. Enforced by Principle XIII of [the constitution](../.specify/memory/constitution.md).
**Code:** `apps/web/src/lib/content/discovery/`
**Audit:** `bun scripts/discovery-audit.mjs` — also runs in `prebuild`, so an
error fails the build in CI

## What this is

A record of which public page owns which search intent, and why that page
deserves to exist. It answers one question:

> What user intent are we serving, which page owns it, and what unique value
> makes that page deserve to exist?

## What this is not

**It is not a keyword-to-page generator, and must never become one.**

The registry exists to _constrain_ the public surface, not to produce it. An
entry is written because a page is being proposed, and writing the entry is
meant to be the moment someone notices the intent already has an owner. Nobody
should ever enumerate keywords and mint entries — or pages — from the list.

If a change to this registry makes it easier to create pages in bulk, that
change is going the wrong way.

## Why it exists

Codex has eight public discovery families — `/for`, `/answers`, `/solutions`,
`/vs`, `/import`, `/features`, `/tools`, `/generators` — plus theme hubs and
evergreen posts. They grew separately, and several already circle the same
subject. Without a shared record, the failure is silent: nobody sets out to
build a duplicate, and the site accumulates them anyway.

Overlap is fine when the _job_ differs. Accidental duplication is not.

## The model

Each entry records only what nothing else owns. Titles, descriptions and body
copy stay in their existing content modules; this holds intent and rationale.

| Field                 | What it is                                                     |
| --------------------- | -------------------------------------------------------------- |
| `id`                  | Stable kebab-case identifier                                   |
| `pageKind`            | Which family the page belongs to                               |
| `canonicalPath`       | The one URL that owns the intent                               |
| `primaryIntent`       | The intent in the reader's words, lower case and unpunctuated  |
| `intentAliases`       | Other phrasings of the **same** intent — these do not get URLs |
| `audience`            | Who is asking, when the page is audience-specific              |
| `userJob`             | What the reader is trying to _do_                              |
| `uniqueValue`         | Why this page deserves to exist beyond containing the keyword  |
| `relatedIntents`      | Entries a reader might confuse this with                       |
| `parentCluster`       | Groups pages that circle one subject from different jobs       |
| `indexable`           | Whether the page is meant to be indexed                        |
| `status`              | `planned` / `live` / `retired`                                 |
| `acknowledgedOverlap` | Overlap that has been examined and accepted, with the reason   |

### `userJob` is the field that decides coexistence

Two pages on one subject may both exist when they do different jobs:

| Page                             | Job                                             |
| -------------------------------- | ----------------------------------------------- |
| `/answers/what-is-a-point-crawl` | `understand` — explain the concept              |
| a point crawl generator          | `create` — produce one                          |
| a curated point crawl example    | `see-an-example` — show a finished one          |
| `/for/hexcrawl-campaigns`        | `adopt-workflow` — how Codex supports the style |

Sharing a subject _and_ a job is the shape cannibalisation takes.

## The workflow

```
proposed discovery page
  → check the registry for an existing owner
  → reuse that intent, or register a distinct user job
  → implement the page
  → validate ownership (bun scripts/discovery-audit.mjs)
```

**Check first.** `findIntentOwner("how do you organise npc relationships")`
returns the entry that already claims it, aliases included. If something owns
the phrasing, the answer is almost always to extend that page or add an alias —
not to create a URL.

**Register before building.** The entry is a design step, not paperwork after
the fact. If you cannot write a `uniqueValue` that is more than a restatement of
the intent, the page should not be built.

## The audit

Two severities, deliberately separated.

**Errors** are decidable from the data and fail the build:

| Code                                                        | Meaning                                                |
| ----------------------------------------------------------- | ------------------------------------------------------ |
| `duplicate-id`                                              | Two entries share an id                                |
| `duplicate-canonical-path`                                  | Two entries claim one URL                              |
| `duplicate-primary-intent`                                  | Two indexable pages claim one intent                   |
| `alias-claims-owned-intent`                                 | An alias takes a phrasing another page owns as primary |
| `dangling-related-intent` / `dangling-acknowledged-overlap` | A reference to an id that does not exist               |
| `self-reference`                                            | An entry relates to itself                             |
| `weak-unique-value`                                         | The rationale only restates the intent                 |
| `unregistered-discovery-page`                               | A governed route has no entry                          |

**Warnings** need a person and never fail a build:

| Code                              | Meaning                                          |
| --------------------------------- | ------------------------------------------------ |
| `same-job-same-vocabulary`        | Two pages share a cluster, a job and their terms |
| `acknowledged-duplicate-intent`   | A recorded duplicate, kept visible               |
| `shared-phrasing-across-clusters` | One phrasing claimed from two clusters           |

The overlap heuristic is deliberately conservative. It ignores terms used by
three or more entries in a cluster — every importer says "import", every
comparison says "vs" — and clears pairs whose `audience` fields differ. Semantic
adjacency is a judgement call and is never a hard failure.

## Governed scope

`governed-routes.ts` derives the governed set from the same configuration the
routes are built from, so a new `/for` pack or `/answers` page appears in the
audit the moment it is added.

Governed: `/for`, `/answers`, `/solutions`, `/features`, `/vs`, `/import`,
`/tools`, `/generators` (including theme hubs), the standalone landing pages,
family index routes, and the named evergreen blog posts.

Not governed: application routes, legal pages, and dated devlog posts. The rule
is meant to shape the search-facing surface, not to tax ordinary work.

## Findings from the initial audit

Seeding the registry with the existing surface surfaced these. They are recorded
rather than fixed here — consolidation is a content decision, not a refactor to
smuggle into the PR that adds the registry.

### `/tools/*` duplicates `/generators/*`

Six pairs target the same intent with the same `create` job:

| `/tools` page                           | `/generators` page          |
| --------------------------------------- | --------------------------- |
| `/tools/faction-generator`              | `/generators/faction`       |
| `/tools/vampire-clan-generator`         | `/generators/vampire-clan`  |
| `/tools/cyberpunk-nomad-clan-generator` | `/generators/nomad-clan`    |
| `/tools/dnd-npc-generator`              | `/generators/dnd-npc`       |
| `/tools/fantasy-name-generator`         | `/generators/fantasy-names` |
| `/tools/quest-hook-generator`           | `/generators/quest`         |

`llms.txt` already describes the `/tools` pages as informational landing pages
that link into the canonical interactive tools, which is an accurate description
of a duplicate rather than a justification for one. Left unacknowledged on
purpose, so the audit keeps raising them.

### `/generators/adventure-generator` and `/generators/adventure-idea-generator`

These share an `introTitle` _and_ a `metaDescription` in
`generator-page-meta.ts`. This is the clearest single duplicate on the site.

### Recorded, accepted overlaps

Kept with reasons in `acknowledgedOverlap`: `/solutions/worldbuilding-tool` and
`/worldbuilding-tool`; `/solutions/ai-gm-assistant`, `/solutions/ai-dm-assistant`
and `/features/ai-gm-assistant`; `/solutions/local-first-rpg` and its offline and
worldbuilding variants. Each is a pre-existing split, visible rather than
forgotten.

## Later uses

The model can support internal-link suggestions, sitemap auditing, orphan-page
detection, unserved-query analysis and `llms-full.txt` section validation. None
of these are built, and none should block adding an entry.
