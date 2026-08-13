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
  });
</script>

<svelte:head>
  <title>Codex Cryptica | AI RPG Campaign Manager</title>
  <meta
    name="description"
    content="AI-assisted, local-first RPG campaign manager. Organize your lore, visualize your world's knowledge graph, and generate content with OpenAI/Luna."
  />
  <meta name="robots" content={getRobotsDirective()} />
  <meta property="og:type" content="website" />
  <meta
    property="og:title"
    content="Codex Cryptica | AI RPG Campaign Manager"
  />
  <meta
    property="og:description"
    content="Local-first RPG campaign manager with graph visualization and AI intelligence."
  />
  <meta name="twitter:card" content="summary_large_image" />
  <link
    rel="sitemap"
    type="application/xml"
    title="Sitemap"
    href="{base}/sitemap.xml"
  />
</svelte:head>

{@render children()}
