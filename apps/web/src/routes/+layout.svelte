<script lang="ts">
  import "../app.css";
  import { resolve } from "$app/paths";
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

  // Wire the LLM capability-token flow app-wide. No Turnstile challenge is
  // issued here — this only attaches the session manager to the shared AI
  // client, so any page that generates gets a token on demand. It has to be
  // this broad: the public no-login generators under (marketing) use the same
  // client singleton and never mount the (app) layout.
  //
  // Imported dynamically to keep @codex/ai-engine out of the initial bundle
  // for pages that never generate (blog, privacy, landing).
  onMount(() => {
    const stopShellCanonical = watchShellCanonical(document);
    void import("#lib/services/ai/session-bootstrap.js").then((m) =>
      m.initAiSession(),
    );
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
    href="{resolve('')}/sitemap.xml"
  />
</svelte:head>

{@render children()}

<FeedbackHost />
