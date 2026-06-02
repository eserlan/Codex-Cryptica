<script lang="ts">
  import { base } from "$app/paths";
</script>

<svelte:head>
  <title>AI RPG Campaign Manager & GM Assistant | Codex Cryptica</title>
  <meta
    name="description"
    content="Supercharge your campaign creation. Generate rich NPC backstories, faction secrets, and city layouts using the AI-assisted Lore Oracle."
  />
  <meta name="robots" content="index, follow" />
  <link
    rel="canonical"
    href="https://codexcryptica.com/ai-rpg-campaign-manager"
  />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Codex Cryptica" />
  <meta
    property="og:title"
    content="AI RPG Campaign Manager & GM Assistant | Codex Cryptica"
  />
  <meta
    property="og:description"
    content="Supercharge your campaign creation. Generate rich NPC backstories, faction secrets, and city layouts using the AI-assisted Lore Oracle."
  />
  <meta
    property="og:url"
    content="https://codexcryptica.com/ai-rpg-campaign-manager"
  />
  <meta property="og:image" content="https://codexcryptica.com/logo.png" />
  <meta name="twitter:card" content="summary" />
  <meta
    name="twitter:title"
    content="AI RPG Campaign Manager & GM Assistant | Codex Cryptica"
  />
  <meta
    name="twitter:description"
    content="Supercharge your campaign creation. Generate rich NPC backstories, faction secrets, and city layouts using the AI-assisted Lore Oracle."
  />
  <meta name="twitter:image" content="https://codexcryptica.com/logo.png" />
  <link rel="help" href="{base}/llms.txt" />
</svelte:head>

<div
  class="min-h-screen bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg flex flex-col items-center justify-center p-6 text-center"
  style:background-image="var(--bg-texture-overlay)"
>
  <div
    class="max-w-2xl bg-theme-surface/50 border border-theme-border p-12 rounded-2xl shadow-xl"
  >
    <div
      class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-theme-primary/10 border border-theme-primary/20 text-theme-primary mb-6 mx-auto"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-theme-primary"></span>
      Feature Available in Workspace
    </div>
    <h1 class="text-4xl font-bold font-header mb-4">
      AI RPG <span class="text-theme-primary">Campaign Manager</span> & GM Assistant
    </h1>
    <p class="text-theme-muted mb-8 leading-relaxed">
      Our AI Lore Oracle assistant—capable of parsing draft summaries,
      auto-inferring lore relations, co-authoring campaign notes, and generating
      character art using local Gemini models—is fully integrated and ready to
      use in the app workspace.
    </p>
    <div class="flex flex-wrap justify-center gap-4">
      <a
        href="{base}/"
        class="px-8 py-3.5 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-wider text-xs rounded-lg hover:brightness-110 transition-all"
      >
        Enter Workspace
      </a>
      <a
        href="{base}/free-rpg-campaign-manager"
        class="px-8 py-3.5 bg-theme-surface border border-theme-border text-theme-text font-bold uppercase font-header tracking-wider text-xs rounded-lg hover:border-theme-primary/60 transition-all"
      >
        View Campaign Manager
      </a>
    </div>
  </div>
</div>
