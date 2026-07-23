<script lang="ts">
  import "../../app.css";
  import { onMount } from "svelte";
  import { base } from "$app/paths";
  import { page } from "$app/state";
  import { SCHEMA_ORG } from "$lib/config";
  import { safeJsonLd } from "$lib/utils/json-ld";
  import { attributionStore } from "$lib/services/analytics/attribution";
  import {
    trackEvent,
    initCodexAnalyticsBridge,
  } from "$lib/services/analytics/zaraz-analytics";

  let { children } = $props();

  const schemaOrgString = $derived(safeJsonLd(SCHEMA_ORG));

  /** Coarse entry-page category for the seo_entry event — never anything
   *  more specific than the top-level route group (#1796). */
  function entryPageType(pathname: string): string {
    if (pathname.startsWith(`${base}/generators`)) return "generator";
    if (pathname.startsWith(`${base}/solutions`)) return "solutions";
    if (pathname.startsWith(`${base}/vs`)) return "comparison";
    if (pathname.startsWith(`${base}/alternatives`)) return "alternatives";
    if (pathname.startsWith(`${base}/blog`)) return "blog";
    if (pathname.startsWith(`${base}/import`)) return "importer";
    if (pathname.startsWith(`${base}/tools`)) return "tools";
    return "other";
  }

  // Single central hook for every marketing page (#1796): this is the only
  // route group this feature ever touches — see the analytics module
  // docstrings for the hard "nothing inside the app" scope boundary.
  onMount(() => {
    initCodexAnalyticsBridge();
    const capturedNewAttribution = attributionStore.captureIfAttributed(
      new URL(page.url),
    );
    if (capturedNewAttribution) {
      trackEvent("seo_entry", {
        entry_page_type: entryPageType(page.url.pathname),
      });
    }
  });
</script>

<svelte:head>
  <link rel="help" href="{base}/llms.txt" />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html `<scr` +
    `ipt type="application/ld+json">${schemaOrgString}</scr` +
    `ipt>`}
</svelte:head>

{@render children()}
