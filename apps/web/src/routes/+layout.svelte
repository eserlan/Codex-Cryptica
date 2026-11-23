<script lang="ts">
  import "../app.css";
  import { basePath } from "#lib/utils/base-path.js";
  import { onMount } from "svelte";
  import FeedbackHost from "#lib/components/feedback/FeedbackHost.svelte";
  import { watchShellCanonical } from "#lib/seo/shell-canonical.js";
  let { children } = $props();

  // Only render a global override when a staging/preview build sets it
  // explicitly. Rendering the default here unconditionally would duplicate
  // (and potentially fight) a page-level `<SeoHead robots=... />` — e.g.
  // `/explore?label=X` needs `noindex` while the un-filtered `/explore`
  // stays indexable (#2762). With no env override, "no tag" already equals
  // the default directive, so per-page SeoHead is free to be the one source
  // of truth.
  const robotsOverride = import.meta.env.VITE_ROBOTS_DIRECTIVE?.trim();

  // Importing session-bootstrap remains an AI-feature responsibility. Keep
  // cold public routes free of token/session setup until an AI request starts.
  onMount(() => {
    // The app booted, so its chunks loaded: hand chunk failures from here on
    // to the version-skew handling in hooks.client.ts (see app.html).
    window.__codexDisarmStaleBuildRecovery?.();
    const stopShellCanonical = watchShellCanonical(document);
    void import("#lib/services/mobile/capacitor-bridge.js").then((m) =>
      m.capacitorBridge.init(),
    );
    return stopShellCanonical;
  });
</script>

<svelte:head>
  {#if robotsOverride}
    <meta name="robots" content={robotsOverride} />
  {/if}
  <link
    rel="sitemap"
    type="application/xml"
    title="Sitemap"
    href="{basePath()}/sitemap.xml"
  />
</svelte:head>

{@render children()}

<FeedbackHost />
