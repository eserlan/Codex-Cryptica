<script lang="ts">
  import { base } from "$app/paths";
  let { data } = $props();
</script>

<svelte:head>
  <title>The Archive | Codex Cryptica Blog</title>
  <meta
    name="description"
    content="Explore the official Codex Cryptica blog for guides on local-first RPG world-building, tactical mapping, and data sovereignty."
  />
</svelte:head>

<div
  class="min-h-screen bg-theme-bg text-theme-text selection:bg-theme-primary selection:text-theme-bg"
>
  <div class="max-w-4xl mx-auto px-6 py-20 md:py-32">
    <header class="mb-16 md:mb-24">
      <h1
        class="text-4xl md:text-6xl font-header font-bold uppercase tracking-[0.2em] mb-6 bg-gradient-to-r from-theme-text to-theme-text/40 bg-clip-text text-transparent"
      >
        The Archive
      </h1>
      <p class="text-theme-muted max-w-2xl text-lg leading-relaxed">
        Deep dives into the technology and philosophy behind Codex Cryptica.
        Learn how to secure your lore and master the spatial brain.
      </p>
    </header>

    <div class="grid gap-12 md:gap-20">
      {#each data.articles as article}
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
            <span>Intel Report</span>
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

          <p class="text-theme-muted line-clamp-3 text-lg leading-relaxed">
            {article.description}
          </p>

          <div
            class="mt-2 flex items-center gap-2 text-theme-primary font-bold uppercase text-xs tracking-[0.2em] group-hover:gap-4 transition-all"
          >
            Decrypt Full Entry
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
