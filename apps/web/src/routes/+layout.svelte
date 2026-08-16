<script lang="ts">
  import "../app.css";
  import { base } from "$app/paths";
  import { onMount } from "svelte";
  import { getRobotsDirective } from "$lib/seo/site";

  let { children } = $props();

  // Wire the LLM capability-token flow app-wide. No Turnstile challenge is
  // issued here — this only attaches the session manager to the shared AI
  // client, so any page that generates gets a token on demand. It has to be
  // this broad: the public no-login generators under (marketing) use the same
  // client singleton and never mount the (app) layout.
  //
  // Imported dynamically to keep @codex/ai-engine out of the initial bundle
  // for pages that never generate (blog, privacy, landing).
  onMount(() => {
    void import("$lib/services/ai/session-bootstrap").then((m) =>
      m.initAiSession(),
    );
    void import("$lib/services/mobile/capacitor-bridge").then((m) =>
      m.capacitorBridge.init(),
    );
  });
</script>

<svelte:head>
  <meta name="robots" content={getRobotsDirective()} />
  <link
    rel="sitemap"
    type="application/xml"
    title="Sitemap"
    href="{base}/sitemap.xml"
  />
</svelte:head>

{@render children()}
