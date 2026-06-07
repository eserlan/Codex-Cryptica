<script lang="ts">
  import { base } from "$app/paths";
  import { themeStore } from "$lib/stores/theme.svelte";
  let { data } = $props();
</script>

<svelte:head>
  <title>The Archive | Codex Cryptica Blog</title>
  <meta
    name="description"
    content="Explore the official Codex Cryptica blog for guides on local-first RPG world-building, tactical mapping, and data sovereignty."
  />
  <link rel="canonical" href={data.canonicalUrl} />
</svelte:head>

<div
  class="min-h-screen bg-theme-bg text-theme-text selection:bg-theme-primary selection:text-theme-bg"
>
  <div class="max-w-4xl mx-auto px-6 py-20 md:py-32">
    <header class="mb-16 md:mb-24">
      <h1
        class="text-4xl md:text-6xl font-header font-bold uppercase tracking-[0.2em] mb-6 bg-gradient-to-r from-theme-text to-theme-text/60 bg-clip-text text-transparent"
      >
        The Archive
      </h1>
      <p class="text-theme-text/70 max-w-2xl text-lg leading-relaxed">
        Deep dives into the technology and philosophy behind Codex Cryptica.
        Learn how to secure your lore and master the spatial brain.
      </p>

      <!-- Responsible AI Pillar Link Banner -->
      <div
        class="mt-8 p-5 rounded-2xl border border-theme-primary/20 bg-theme-surface/30 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-theme-primary/40 transition-colors"
      >
        <div class="space-y-1">
          <h2
            class="text-xs font-mono font-bold uppercase tracking-widest text-theme-primary flex items-center gap-2"
          >
            <span class="icon-[lucide--shield-alert] h-4 w-4"></span>
            Responsible AI Positioning
          </h2>
          <p class="text-sm text-theme-muted">
            Read our 7-part devlog series and guidelines on keeping
            human-centric narrative control at the core of AI worldbuilding
            tools.
          </p>
        </div>
        <a
          href="{base}/responsible-ai-worldbuilding"
          class="inline-flex items-center gap-2 self-start sm:self-center px-4 py-2 text-xs font-bold font-header uppercase tracking-widest bg-theme-primary text-theme-bg rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-md shrink-0"
        >
          Read the Pillar
          <span class="icon-[lucide--arrow-right] h-3.5 w-3.5"></span>
        </a>
      </div>
    </header>

    <div class="grid gap-12 md:gap-20">
      {#each data.articles as article (article.slug)}
        <article class="group relative flex flex-col gap-4">
          <div
            class="flex items-center gap-4 text-xs font-mono text-theme-primary uppercase tracking-widest mb-2"
          >
            <time datetime={article.publishedAt}>
              {new Date(article.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "UTC",
              })}
            </time>
            <span class="w-8 h-px bg-theme-border"></span>
            <span>{themeStore.resolveJargon("blog_entry")}</span>
          </div>

          <h2
            class="text-2xl md:text-3xl font-header font-bold group-hover:text-theme-primary transition-colors"
          >
            <a
              href="{base}/blog/{article.slug}"
              class="after:absolute after:inset-0"
            >
              {article.title}
            </a>
          </h2>

          <p class="text-theme-text/70 line-clamp-3 text-lg leading-relaxed">
            {article.description}
          </p>

          <div
            class="mt-2 flex items-center gap-2 text-theme-primary font-bold uppercase text-xs tracking-[0.2em] group-hover:gap-4 transition-all"
          >
            {themeStore.resolveJargon("blog_action")}
            <span class="icon-[lucide--arrow-right] w-4 h-4"></span>
          </div>
        </article>
      {/each}
    </div>

    {#if data.articles.length === 0}
      <div
        class="py-20 text-center border border-dashed border-theme-border rounded-lg bg-theme-surface/5"
      >
        <p class="text-theme-muted font-mono uppercase tracking-widest">
          No transmissions found in the archive.
        </p>
      </div>
    {/if}
  </div>
</div>

<style>
  @reference "../../../app.css";
</style>
