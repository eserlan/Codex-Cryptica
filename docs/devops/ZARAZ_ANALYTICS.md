# SEO Attribution Analytics (Cloudflare Zaraz)

This document describes the custom-event tracking added in #1796 to measure
SEO/marketing acquisition through to activation, using [Cloudflare
Zaraz](https://developers.cloudflare.com/zaraz/) as the event sink.

## Scope boundary (read this first)

Tracking is limited entirely to the public marketing/generator pages under
the `(marketing)` route group and the single moment a visitor clicks "Save to
Codex." **Nothing that happens after the redirect into the actual app —
vault creation, entity creation, edits, connections, deletions — is ever
observed or tracked.** `is_first_saved_entity`, `vault_created`, and
`related_entity_created` are all _inferred_ from generator-side data (a
dedicated `localStorage` flag, and content the generator already produced)
before the redirect, not from observing what actually happens in the vault
afterward.

This is a hard product requirement, not an oversight — do not add tracking
calls to anything under `apps/web/src/lib/services/seo/import-handler.ts`,
vault/entity stores, or the event bus.

The same boundary applies to the discovery-funnel events added in #2687
below: `source_id`/`target_id` are always a stable page slug or root-relative
path, never a prompt, generated entity title, vault name, or other
user-authored content.

## Where it's wired

- `apps/web/src/lib/services/analytics/attribution.ts` — captures
  `utm_source`/`utm_medium`/`utm_campaign` and recognised AI referrals from
  the landing URL into first-touch (write-once) and latest-touch
  (always-overwrite) `localStorage` records.
- `apps/web/src/lib/services/analytics/ai-referral.ts` — the allowlisted,
  fail-closed classifier for AI-assistant UTM values and referrer hostnames.
- `apps/web/src/lib/services/analytics/zaraz-analytics.ts` — `trackEvent()`,
  a fail-silent wrapper around `window.zaraz.track()` that merges current
  attribution into every event. Also defines `window.__codexAnalytics.track`,
  which fulfills a forwarding hook `onboarding-funnel.ts` already calls — but
  since that bridge is only ever initialized from the marketing layout, any
  in-app onboarding-funnel calls to it continue to no-op, same as before this
  change.
- `apps/web/src/lib/services/analytics/generator-save-tracking.ts` —
  `trackSaveToCodex()`, called at the outbound "Save to Codex" click.
- `apps/web/src/routes/(marketing)/+layout.svelte` — initializes the
  analytics bridge and captures attribution once per marketing-page visit.
- `apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte` — emits
  `generator_started`/`generator_completed` and calls `trackSaveToCodex()`.
- `apps/web/src/lib/services/analytics/discovery-tracking.ts` (#2687) —
  `trackDiscoveryPageViewed()`, `trackDiscoveryClick()`,
  `classifyDiscoveryTarget()` (href → `target_kind`/`target_id` for
  free-form content links), and `createDiscoveryViewGuard()` (the
  once-per-page-visit dedupe described below).
- `apps/web/src/lib/actions/trackDiscoveryClick.ts` (#2687) — the
  `use:trackDiscoveryClick={{ ... }}` action wired onto discovery-page links
  and CTAs, so each page only supplies the event payload, not a click
  handler.
- Wired into (#2687):
  - `apps/web/src/routes/(marketing)/answers/[slug]/+page.svelte`
  - `apps/web/src/routes/(marketing)/examples/[slug]/+page.svelte`
  - `apps/web/src/routes/(marketing)/for/[slug]/+page.svelte`
  - `apps/web/src/lib/components/seo/SEOPageLayout.svelte` (`/vs/[slug]`,
    plus `/alternatives/[slug]` which 301s into the same `/vs` page — and,
    outside the named discovery families, `/solutions/[slug]` and
    `/features/[slug]`, tracked under `source_kind: "other"`)
- `apps/web/src/lib/services/analytics/answer-share-tracking.ts` (#3037) —
  `trackAnswerShareClicked()`, `trackAnswerShareCompleted()`,
  `trackAnswerShareLinkCopied()` for the Share action on `/answers/[slug]`.
  Kept separate from discovery-tracking.ts since share intents don't fit
  that module's click/target model.
- `apps/web/src/lib/components/ShareButton.svelte` (#3037) — the generic
  Web-Share-API-with-Copy-Link-fallback button, wired into
  `apps/web/src/routes/(marketing)/answers/[slug]/+page.svelte`'s header.
  Deliberately not coupled to the answer-sharing tracking calls above (or to
  any snapshot/persistence backend) — the page passes
  `onShareClicked`/`onShareCompleted`/`onLinkCopied` callbacks, so the
  component stays reusable for other share surfaces (e.g. generator results,
  #2916) with different event names.
- `apps/web/src/lib/services/sharing/GeneratorShareService.ts` (#2916) —
  creates immutable text snapshots through the R2-backed Worker and keeps
  only the private revocation token in local browser storage. The generator
  result and Session Hub detail actions use the same ShareButton surface.
- `apps/web/src/lib/services/analytics/answer-feedback-tracking.ts` (#3038)
  — `trackAnswerUsefulVote()` for the "Was this useful?" prompt at the end
  of an answer's substantive content.
- `apps/web/src/lib/components/UsefulnessFeedback.svelte` (#3038) — the
  Yes/No + optional structured-reason widget, wired the same
  callback-prop way as `ShareButton.svelte` (`onVote`). It also owns a
  per-browser duplicate-vote marker in `localStorage`
  (`codex_answer_feedback_<slug>`, via the existing `UIPersistence` helper)
  so a reader can't accidentally vote twice, with an explicit "Change your
  answer" action to vote again deliberately.

## Events

| Event                              | Fires when                                                                             | Properties                                                                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `seo_entry`                        | A marketing page is visited with new UTM or AI-referral attribution                    | `entry_page_type` (`generator` \| `solutions` \| `comparison` \| `alternatives` \| `blog` \| `importer` \| `tools` \| `other`) |
| `generator_started`                | A visitor submits a generator form (not the silent auto-draft on page load)            | `generator_type`                                                                                                               |
| `generator_completed`              | Generation succeeds                                                                    | `generator_type`                                                                                                               |
| `entity_saved`                     | "Save to Codex" is clicked                                                             | `generator_type`, `is_hub_batch`, `item_count`, `is_first_saved_entity`                                                        |
| `vault_created`                    | `entity_saved` fires with `is_first_saved_entity: true`                                | `generator_type`, `is_hub_batch`, `item_count`                                                                                 |
| `related_entity_created`           | A save includes one or more `[[wiki-links]]`/references                                | `related_entity_count` (bucketed: `"0"`, `"1"`, `"2-5"`, `"6+"`)                                                               |
| `discovery_page_viewed`            | A supported discovery page is viewed (once per page per visit — see below)             | `source_kind`, `source_id`, `path`                                                                                             |
| `discovery_click`                  | A visitor follows a meaningful discovery-page link/CTA                                 | `source_kind`, `source_id`, `target_kind`, `target_id`, `placement`                                                            |
| `answer_share_clicked`             | The Share action on an answer page is activated                                        | `slug`, `intent` (when the answer has a `discovery.id`)                                                                        |
| `answer_share_completed`           | `navigator.share()`'s promise resolves (the user picked a destination, did not cancel) | `slug`, `intent`                                                                                                               |
| `answer_share_link_copied`         | The Copy Link fallback succeeds (no native share support)                              | `slug`, `intent`                                                                                                               |
| `answer_useful_vote`               | A reader answers "Was this useful?"                                                    | `slug`, `intent`, `value` (`yes` \| `no`), `reason` (closed set, "no" votes only, optional)                                    |
| `generator_share_clicked`          | Share is activated for a generated result or Session Hub detail                        | `generator_type`, `source`                                                                                                     |
| `generator_share_created`          | The immutable public snapshot is stored successfully                                   | `generator_type`, `source`                                                                                                     |
| `generator_share_link_copied`      | A generated-result share URL is copied successfully                                    | `generator_type`, `source`                                                                                                     |
| `generator_share_opened`           | A shared generator snapshot loads successfully                                         | `generator_type`, `source`, `share_id`                                                                                         |
| `generator_share_remix_clicked`    | A visitor follows the shared-result Remix CTA                                          | `generator_type`, `source`, `share_id`                                                                                         |
| `generator_share_generate_clicked` | A visitor follows the originating generator CTA                                        | `generator_type`, `source`, `share_id`                                                                                         |

Every event also carries `first_touch` and `latest_touch` objects when
attribution has been captured for the current browser. Their shape is
`{ utm_source?, utm_medium?, utm_campaign?, channel?, provider?, source?, landing_path, at }`.
For a latest-touch AI referral, the event additionally exposes flat properties
for destination-tool segmentation:

- `acquisition_channel`: `ai_referral`
- `acquisition_provider`: `openai`, `perplexity`, `microsoft`, `anthropic` or `google`
- `acquisition_source`: `chatgpt`, `perplexity`, `copilot`, `claude` or `gemini`
- `acquisition_landing_path`: the root-relative landing path

Zaraz and the configured destination tool supply the browser session/visit
association. Codex does not create a separate visitor identifier.

### AI-referral classification

Classification is deliberately allowlisted and fail-closed. A recognised
`utm_source` wins over a conflicting referrer; otherwise the initial external
referrer hostname is checked. Only the hostname is retained — referrer paths,
queries and fragments are discarded.

| Provider   | Source       | Recognised UTM values                         | Recognised referrer hosts        |
| ---------- | ------------ | --------------------------------------------- | -------------------------------- |
| OpenAI     | `chatgpt`    | `chatgpt`, `chatgpt.com`                      | `chatgpt.com`, `chat.openai.com` |
| Perplexity | `perplexity` | `perplexity`, `perplexity.ai`                 | `perplexity.ai`                  |
| Microsoft  | `copilot`    | `copilot`, `copilot.microsoft.com`, `bing-ai` | `copilot.microsoft.com`          |
| Anthropic  | `claude`     | `claude`, `claude.ai`                         | `claude.ai`                      |
| Google     | `gemini`     | `gemini`, `gemini.google.com`                 | `gemini.google.com`              |

Plain Google/Bing search referrals, `openai.com`, unknown assistants and
spoofed suffixes remain in their existing channel because they cannot be
identified confidently. The initial referrer is consumed once per marketing
page mount; later client-side navigation can still capture a new UTM-tagged
landing URL without reusing the original referrer.

### Discovery funnel (#2687)

This extends the `seo_entry`/Web Analytics view of discovery traffic with
which pages actually move a visitor toward a generator or the app —
Search Console tells you what got someone to click through _into_ Codex from
a search result; `discovery_page_viewed`/`discovery_click` tell you what
they did once they were on a discovery page.

`source_kind` and `target_kind` share one closed vocabulary:

- `source_kind`: `answer | example | for | comparison | alternative |
importer | blog | tools | other`
- `target_kind`: `generator | app | answer | example | for | comparison |
importer | external`

`target_kind`/`target_id` for a free-form content link (e.g. an answer's
`codexConnection.href`, or any link whose destination isn't already known
from the content-collection it came from) is computed by
`classifyDiscoveryTarget(href)`, which strips the query string and hash
first, then reads the href's first path segment: `/generators/*` →
`generator` (`target_id`: the slug, e.g. `"npc"`), `/answers/*` → `answer`,
`/examples/*` → `example`, `/for/*` → `for`, `/vs/*` and `/alternatives/*` →
`comparison`, `/import/*` and `/migrations/*` → `importer` (all keyed by
slug the same way), an absolute URL → `external` (`target_id`: the URL's
origin+path, e.g. `"https://groupfinder.gg/list"`), and anything else
(`/solutions/*`, `/features/*`, `/`, ...) → `app` (`target_id`: the full
root-relative path, e.g. `"/solutions/campaign-manager"` — not just the
slug, since `/solutions/x` and `/features/x` would otherwise both collapse
to the ambiguous `target_id` `"x"`), since it's a deeper product page rather
than another discovery page. Where a link's destination kind is already
known from its source list (e.g. every "Other answers" link on an answer
page is another answer), the page passes `targetKind`/`targetId` explicitly
instead of calling the classifier.

`placement` is a short, page-local string identifying where on the page the
link lives — e.g. on `/answers/[slug]`: `section_cta`, `codex_connection`,
`related_tool`, `related_guide`, `related_answer`. Each wired page defines
its own placement names for its own link groups; there is no shared enum,
since it's meant to describe layout, not carry business meaning on its own.

**Avoiding duplicate `discovery_page_viewed` fires:** a `$effect` alone is
not enough here, because SvelteKit reuses the _same_ page component
instance across a client-side navigation between two pages of the same
dynamic route (e.g. `/answers/a` → `/answers/b` re-runs `load`, but nothing
remounts) — a plain `onMount()`-style guard would only ever fire once, for
the very first slug visited in a session. Each wired page keeps its own
`createDiscoveryViewGuard()` instance and checks the current slug against it
inside the `$effect`, so the event fires exactly once per distinct page —
including across that kind of in-place navigation — without double-firing
on unrelated reactive churn (e.g. hydration re-running the effect for the
slug it already reported).

**Supported page families today:** `/answers/[slug]`, `/examples/[slug]`,
`/for/[slug]`, and `/vs/[slug]` (comparison; `/alternatives/[slug]` redirects
into it before rendering). Importer/other SEO landing pages are not yet
wired — extend them the same way: call `trackDiscoveryPageViewed()` from a
guarded `$effect`, and add `use:trackDiscoveryClick={{ ... }}` to the page's
outbound links, choosing `placement` names that describe that page's own
layout.

**Expected Zaraz dashboard mappings:** map `discovery_page_viewed` to a
pageview-shaped destination event keyed by `source_kind` + `source_id`, and
`discovery_click` to a click/conversion-shaped one keyed by
`source_kind`/`source_id` → `target_kind`/`target_id`, so the destination
tool can build: views and outbound-CTA clicks per page family and slug,
click-through rate, CTA-placement performance, and
answer/example/for → generator/app conversion funnels (join
`discovery_page_viewed` → `discovery_click` on the same `source_kind` +
`source_id` within a session).

### Answer sharing (#3037)

A restrained Share action on `/answers/[slug]` — much simpler than the
generator-result sharing in #2916, which persists public snapshots for
remix; this has no backend, it just shares the answer's own already-public
canonical URL. `ShareButton.svelte` prefers `navigator.share()` (the native
OS share sheet) and falls back to a Copy Link button when unsupported.

`answer_share_completed` is only fired when `navigator.share()`'s own
promise resolves — that promise rejects with `AbortError` when the user
dismisses the share sheet without picking a destination, so this is a real
completion signal from the browser, not an assumption that opening the
sheet means the share happened. A cancelled share (or the Copy Link path)
never fires `answer_share_completed`.

`intent` is the answer's `discovery.id` when the page has discovery
metadata (most do) — omitted otherwise, same optional-property convention
as `first_touch`/`latest_touch`. No article content (title, question,
description) is ever sent; only the stable slug and intent id.

### "Was this useful?" feedback (#3038)

An editorial signal, not a public rating — `UsefulnessFeedback.svelte` never
displays a vote count, individual voter identity, or free-text comments.
A "no" vote can optionally attach one reason from a small closed set (`Too
vague`, `Too long`, `Didn't answer my question`, `Advice didn't fit my
game`, `Already knew this`, `Other`); picking a reason and clicking "no"
with no reason ("Skip") both resolve to exactly one `answer_useful_vote`
event — the reason step never fires a second event.

Per #3038's own guidance to avoid duplicating an already-reliably-captured
signal into a second store, this does **not** introduce a database or
backend aggregation endpoint: `answer_useful_vote` flows through the same
Zaraz pipeline as every other event here, and is aggregated by the
destination analytics tool exactly the way `discovery_click` already is
(see the dashboard-mapping guidance above). Revisit this only if editorial
review genuinely needs a query the destination tool can't answer.

The per-browser duplicate-vote guard is local only (`localStorage`, via
`UIPersistence`) — it prevents an accidental repeat vote on the same
browser, and is not a source of truth Codex reads back from anywhere; the
Zaraz event stream is the only aggregate.

## Cloudflare Zaraz dashboard configuration

This repo has no Zaraz IaC — the loader and event routing are configured
entirely in the Cloudflare dashboard, per domain:

1. Cloudflare dashboard → the zone for `codexcryptica.com` → **Zaraz** →
   enable Zaraz if not already active. This injects the Zaraz loader script;
   no code change is needed here.
2. **Tools** → add the destination(s) that should receive these events
   (e.g. a GA4 or other analytics tool), and map each of the event names
   above to that tool's event format.
3. Zaraz automatically exposes `window.zaraz.track(name, properties)` once
   enabled — `trackEvent()` no-ops safely if `window.zaraz` is absent (e.g.
   local dev, or Zaraz not yet enabled on a given environment), so this
   feature is safe to ship ahead of the dashboard configuration.
