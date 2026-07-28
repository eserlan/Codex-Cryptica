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

## Events

| Event                    | Fires when                                                                  | Properties                                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `seo_entry`              | A marketing page is visited with new UTM attribution                        | `entry_page_type` (`generator` \| `solutions` \| `comparison` \| `alternatives` \| `blog` \| `importer` \| `tools` \| `other`) |
| `generator_started`      | A visitor submits a generator form (not the silent auto-draft on page load) | `generator_type`                                                                                                               |
| `generator_completed`    | Generation succeeds                                                         | `generator_type`                                                                                                               |
| `entity_saved`           | "Save to Codex" is clicked                                                  | `generator_type`, `is_hub_batch`, `item_count`, `is_first_saved_entity`                                                        |
| `vault_created`          | `entity_saved` fires with `is_first_saved_entity: true`                     | `generator_type`, `is_hub_batch`, `item_count`                                                                                 |
| `related_entity_created` | A save includes one or more `[[wiki-links]]`/references                     | `related_entity_count` (bucketed: `"0"`, `"1"`, `"2-5"`, `"6+"`)                                                               |

Every event also carries `first_touch` and `latest_touch` objects (each
`{ utm_source?, utm_medium?, utm_campaign?, landing_path, at }`) when
attribution has been captured for the current browser.

## Cloudflare Zaraz dashboard configuration

This repo has no Zaraz IaC — the loader and event routing are configured
entirely in the Cloudflare dashboard, per domain:

1. Cloudflare dashboard → the zone for `codexcryptica.com` → **Zaraz** →
   enable Zaraz if not already active. This injects the Zaraz loader script;
   no code change is needed here.
2. **Tools** → add the destination(s) that should receive these events
   (e.g. a GA4 or other analytics tool), and map each of the 6 event names
   above to that tool's event format.
3. Zaraz automatically exposes `window.zaraz.track(name, properties)` once
   enabled — `trackEvent()` no-ops safely if `window.zaraz` is absent (e.g.
   local dev, or Zaraz not yet enabled on a given environment), so this
   feature is safe to ship ahead of the dashboard configuration.
