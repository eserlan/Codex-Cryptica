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
  `utm_source`/`utm_medium`/`utm_campaign` from the landing URL into
  first-touch (write-once) and latest-touch (always-overwrite) `localStorage`
  records.
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

## Events

| Event                    | Fires when                                                                  | Properties                                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `seo_entry`              | A marketing page is visited with new UTM attribution                        | `entry_page_type` (`generator` \| `solutions` \| `comparison` \| `alternatives` \| `blog` \| `importer` \| `tools` \| `other`) |
| `generator_started`      | A visitor submits a generator form (not the silent auto-draft on page load) | `generator_type`                                                                                                               |
| `generator_completed`    | Generation succeeds                                                         | `generator_type`                                                                                                               |
| `entity_saved`           | "Save to Codex" is clicked                                                  | `generator_type`, `is_hub_batch`, `item_count`, `is_first_saved_entity`                                                        |
| `vault_created`          | `entity_saved` fires with `is_first_saved_entity: true`                     | `generator_type`, `is_hub_batch`, `item_count`                                                                                 |
| `related_entity_created` | A save includes one or more `[[wiki-links]]`/references                     | `related_entity_count` (bucketed: `"0"`, `"1"`, `"2-5"`, `"6+"`)                                                               |
| `discovery_page_viewed`  | A supported discovery page is viewed (once per page per visit — see below)  | `source_kind`, `source_id`, `path`                                                                                             |
| `discovery_click`        | A visitor follows a meaningful discovery-page link/CTA                      | `source_kind`, `source_id`, `target_kind`, `target_id`, `placement`                                                            |

Every event also carries `first_touch` and `latest_touch` objects (each
`{ utm_source?, utm_medium?, utm_campaign?, landing_path, at }`) when
attribution has been captured for the current browser.

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
`classifyDiscoveryTarget(href)`, which reads the href's first path segment:
`/generators/*` → `generator`, `/answers/*` → `answer`, `/examples/*` →
`example`, `/for/*` → `for`, `/vs/*` and `/alternatives/*` → `comparison`,
`/import/*` and `/migrations/*` → `importer`, an absolute URL → `external`
(keyed by the full URL), and anything else (`/solutions/*`, `/features/*`,
`/`, ...) → `app`, since it's a deeper product page rather than another
discovery page. Where a link's destination kind is already known from its
source list (e.g. every "Other answers" link on an answer page is another
answer), the page passes `targetKind`/`targetId` explicitly instead of
calling the classifier.

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
