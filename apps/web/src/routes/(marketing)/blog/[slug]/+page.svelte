<script lang="ts">
  import { base } from "$app/paths";
  import ArticleRenderer from "$lib/components/blog/ArticleRenderer.svelte";

  let { data } = $props();
  const article = $derived(data.article);
</script>

<svelte:head>
  <title>{article.title} | Codex Cryptica Blog</title>
  <meta name="description" content={article.description} />
  <meta name="keywords" content={article.keywords.join(", ")} />

  <!-- Open Graph -->
  <meta property="og:title" content={article.title} />
  <meta property="og:description" content={article.description} />
  <meta property="og:type" content="article" />
  <meta property="article:published_time" content={article.publishedAt} />
</svelte:head>

<div
  class="min-h-screen bg-theme-bg text-theme-text selection:bg-theme-primary selection:text-theme-bg"
>
  <div class="max-w-3xl mx-auto px-6 py-20 md:py-32">
    <nav class="mb-12">
      <a
        href="{base}/blog"
        class="inline-flex items-center gap-2 text-theme-primary hover:text-theme-text transition-colors text-xs font-bold uppercase tracking-widest group"
      >
        <span
          class="icon-[lucide--arrow-left] w-4 h-4 group-hover:-translate-x-1 transition-transform"
        ></span>
        Back to Archive
      </a>
    </nav>

    <header class="mb-16">
      <div
        class="flex items-center gap-4 text-xs font-mono text-theme-primary uppercase tracking-widest mb-6"
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

      <h1
        class="text-3xl md:text-5xl font-header font-bold uppercase leading-tight mb-8"
      >
        {article.title}
      </h1>

      <p
        class="text-theme-muted text-xl italic leading-relaxed border-l-4 border-theme-primary pl-6"
      >
        {article.description}
      </p>
    </header>

    <main class="mb-20">
      <ArticleRenderer content={article.content} />
    </main>

    <footer class="pt-12 border-t border-theme-border">
      <div class="flex flex-wrap gap-2">
        {#each article.keywords as keyword}
          <span
            class="px-3 py-1 bg-theme-surface border border-theme-border rounded-full text-[10px] font-mono text-theme-muted uppercase tracking-wider"
          >
            #{keyword.replace(/\s+/g, "-").toLowerCase()}
          </span>
        {/each}
      </div>

      <div
        class="mt-16 p-8 rounded-lg bg-theme-surface/30 border border-theme-border flex flex-col md:flex-row items-center justify-between gap-8"
      >
        <div class="text-center md:text-left">
          <h3
            class="text-lg font-header font-bold uppercase tracking-widest mb-2"
          >
            Ready to secure your lore?
          </h3>
          <p class="text-sm text-theme-muted">
            The GM's most important tool is data sovereignty.
          </p>
        </div>
        <a
          href="{base}/"
          class="px-8 py-4 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-widest text-xs rounded hover:bg-theme-primary/90 transition-all active:scale-95 shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.3)]"
        >
          Enter the Codex
        </a>
      </div>
    </footer>
  </div>
</div>

<style>
  @reference "../../../../app.css";
</style>
