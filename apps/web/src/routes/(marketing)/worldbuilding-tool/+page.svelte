<script lang="ts">
  import { base } from "$app/paths";
</script>

<svelte:head>
  <title>Free Worldbuilding Tool & Lore Database | Codex Cryptica</title>
  <meta
    name="description"
    content="Create, link, and organize world maps, history, and factions. Codex Cryptica is a free, local-first worldbuilding tool running 100% in your browser."
  />
  <link rel="canonical" href="https://codexcryptica.com/worldbuilding-tool" />
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
      Free <span class="text-theme-primary">Worldbuilding Tool</span> & Lore Database
    </h1>
    <p class="text-theme-muted mb-8 leading-relaxed">
      Our comprehensive worldbuilding features—including interactive canvas
      networks, chronological timelines, local-first OPFS storage, and
      bidirectional wiki-style backlinks—are fully integrated and ready to use
      in the app workspace.
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
