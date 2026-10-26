<script lang="ts">
  import "../../app.css";
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/env";
  import { basePath } from "#lib/utils/base-path.js";
  import { page } from "$app/state";
  import { SCHEMA_ORG } from "#lib/config/index.js";
  import { safeJsonLd } from "#lib/utils/json-ld.js";
  import { attributionStore } from "#lib/services/analytics/attribution.js";
  import MarketingShell from "#lib/components/seo/MarketingShell.svelte";
  import {
    trackEvent,
    initCodexAnalyticsBridge,
    resetCodexAnalyticsBridge,
  } from "#lib/services/analytics/zaraz-analytics.js";

  let { children } = $props();
  let analyticsReady = $state(false);
  let initialReferrer = "";
  let initialReferrerConsumed = false;

  const schemaOrgString = $derived(safeJsonLd(SCHEMA_ORG));

  /** Coarse entry-page category for the seo_entry event — never anything
   *  more specific than the top-level route group (#1796). */
  function entryPageType(pathname: string): string {
    if (pathname.startsWith("/generators")) return "generator";
    if (pathname.startsWith("/solutions")) return "solutions";
    if (pathname.startsWith("/vs")) return "comparison";
    if (pathname.startsWith("/alternatives")) return "alternatives";
    if (pathname.startsWith("/blog")) return "blog";
    if (pathname.startsWith("/import")) return "importer";
    if (pathname.startsWith("/migrations")) return "importer";
    if (pathname.startsWith("/tools")) return "tools";
    if (pathname.startsWith("/topics")) return "topics";
    return "other";
  }

  // Single central hook for every marketing page (#1796): this is the only
  // route group this feature ever touches — see the analytics module
  // docstrings for the hard "nothing inside the app" scope boundary.
  onMount(() => {
    initCodexAnalyticsBridge();
    initialReferrer = document.referrer;
    analyticsReady = true;
  });

  // Reactive on page.url (not just onMount) so a second attributed URL
  // visited via client-side navigation within (marketing) — no full reload
  // — is still captured, not just the very first page load (#1796 review
  // feedback).
  $effect(() => {
    if (!browser || !analyticsReady) return;
    const referrer = initialReferrerConsumed ? undefined : initialReferrer;
    initialReferrerConsumed = true;
    const capturedNewAttribution = attributionStore.captureIfAttributed(
      new URL(page.url.href),
      referrer,
    );
    if (capturedNewAttribution) {
      trackEvent("seo_entry", {
        entry_page_type: entryPageType(page.url.pathname),
      });
    }
  });

  // Tears down window.__codexAnalytics.track when leaving (marketing) — e.g.
  // a client-side navigation into (app) that never triggers a full page
  // reload — so onboarding-funnel.ts's in-app milestone calls go back to
  // no-oping instead of reaching Zaraz through a hook that outlived the
  // pages it's scoped to (#1796 review feedback).
  onDestroy(() => {
    resetCodexAnalyticsBridge();
  });
</script>

<svelte:head>
  <link rel="help" href="{basePath()}/llms.txt" />
  <link
    rel="alternate"
    type="application/atom+xml"
    title="Codex Cryptica answers and blog"
    href="{basePath()}/feed.xml"
  />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html `<scr` +
    `ipt type="application/ld+json">${schemaOrgString}</scr` +
    `ipt>`}
</svelte:head>

<MarketingShell>
  {@render children()}
</MarketingShell>
