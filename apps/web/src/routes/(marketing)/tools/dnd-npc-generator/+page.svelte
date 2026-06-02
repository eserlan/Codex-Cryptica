<script lang="ts">
  import { base } from "$app/paths";
</script>

<svelte:head>
  <title>DnD NPC Generator | Free RPG Game Master Tools | Codex Cryptica</title>
  <meta
    name="description"
    content="Generate complete non-player characters with stats, traits, and background details instantly. Save them straight into your local campaign vault."
  />
  <link
    rel="canonical"
    href="https://codexcryptica.com/tools/dnd-npc-generator"
  />
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
      <span class="w-1.5 h-1.5 rounded-full bg-theme-primary animate-pulse"
      ></span>
      Standalone Suite Coming Soon
    </div>
    <h1 class="text-4xl font-bold font-header mb-4">
      DnD <span class="text-theme-primary">NPC Generator</span>
    </h1>
    <p class="text-theme-muted mb-8 leading-relaxed">
      Interactive name generators, settlement builders, and AI-powered NPC
      creators are currently in development for this standalone page. In the
      meantime, you can use the fully functional built-in generator templates
      and the AI Lore Oracle directly inside the campaign workspace.
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
