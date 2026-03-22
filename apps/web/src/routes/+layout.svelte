<script lang="ts">
  import "../app.css";
  import { base } from "$app/paths";

  let { children } = $props();
</script>

<svelte:head>
  <title>Codex Cryptica | AI RPG Campaign Manager</title>
  <meta
    name="description"
    content="AI-assisted, local-first RPG campaign manager. Organize your lore, visualize your world's knowledge graph, and generate content with Google Gemini."
  />
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
