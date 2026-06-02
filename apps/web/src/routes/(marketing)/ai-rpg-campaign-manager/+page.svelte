<script lang="ts">
  import { base } from "$app/paths";
</script>

<svelte:head>
  <title>AI RPG Campaign Manager & GM Assistant | Codex Cryptica</title>
  <meta
    name="description"
    content="Supercharge your campaign creation. Generate rich NPC backstories, faction secrets, and city layouts using the AI-assisted Lore Oracle."
  />
  <link
    rel="canonical"
    href="https://codexcryptica.com/ai-rpg-campaign-manager"
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
    <span class="icon-[lucide--sparkles] text-theme-primary w-12 h-12 mb-6"
    ></span>
    <h1 class="text-4xl font-bold font-header mb-4">
      AI RPG <span class="text-theme-primary">Campaign Manager</span> & GM Assistant
    </h1>
    <p class="text-theme-muted mb-8 leading-relaxed">
      Write campaign lore natively with the local-first Lore Oracle. Prompt,
      synthesize, and create structured character and quest records.
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
