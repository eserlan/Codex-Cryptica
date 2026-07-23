<script lang="ts">
  import { base } from "$app/paths";
  import { themeStore } from "$lib/stores/theme.svelte";
  import ArticleRenderer from "$lib/components/blog/ArticleRenderer.svelte";
  import ResponsibleAISeriesNav from "$lib/components/blog/ResponsibleAISeriesNav.svelte";
  import { RA_SERIES_SLUGS } from "$lib/content/responsible-ai-series";
  import { safeJsonLd } from "$lib/utils/json-ld";

  let { data } = $props();
  const article = $derived(data.article);
  const isRASeries = $derived(RA_SERIES_SLUGS.has(article.slug));
  const articleContent = $derived(
    article.content.replace(/^#[^\n]+\n/, "").trimStart(),
  );

  const jsonLdString = $derived(
    safeJsonLd({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: article.title,
      description: article.description,
      datePublished: article.publishedAt,
      dateModified: article.publishedAt,
      url: data.canonicalUrl,
      mainEntityOfPage: { "@type": "WebPage", "@id": data.canonicalUrl },
      author: {
        "@type": "Organization",
        name: "Codex Cryptica",
        url: "https://codexcryptica.com",
      },
      publisher: {
        "@type": "Organization",
        name: "Codex Cryptica",
        url: "https://codexcryptica.com",
      },
      articleSection: "Worldbuilding & RPG Tools",
      keywords: article.keywords.join(", "),
    }),
  );
</script>

<svelte:head>
  <title>{article.title} | Codex Cryptica Blog</title>
  <meta name="description" content={article.description} />
  <meta name="keywords" content={article.keywords.join(", ")} />
  <link rel="canonical" href={data.canonicalUrl} />

  <!-- Open Graph -->
  <meta property="og:title" content={article.title} />
  <meta property="og:description" content={article.description} />
  <meta property="og:type" content="article" />
  <meta property="article:published_time" content={article.publishedAt} />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html `<scr` +
    `ipt type="application/ld+json">${jsonLdString}</scr` +
    `ipt>`}
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
        <span aria-hidden="true" class="w-8 h-px bg-theme-border"></span><span
          class="sr-only"
        >
          ·
        </span>
        <span>{themeStore.resolveJargon("blog_entry")}</span>
      </div>

      <h1
        class="text-3xl md:text-5xl font-header font-bold uppercase leading-tight mb-8"
      >
        {article.title}
      </h1>

      <p
        class="text-theme-text/70 text-xl italic leading-relaxed border-l-4 border-theme-primary pl-6"
      >
        {article.description}
      </p>
    </header>

    <main class="mb-20">
      <ArticleRenderer content={articleContent} />
    </main>

    {#if isRASeries}
      <ResponsibleAISeriesNav currentSlug={article.slug} />
    {/if}

    <footer class="pt-12 border-t border-theme-border">
      <div>
        <p
          class="text-[10px] font-mono text-theme-muted uppercase tracking-widest mb-3"
        >
          Topics
        </p>
        <div class="flex flex-wrap gap-2">
          {#each article.keywords.slice(0, 6) as keyword}
            <span
              class="px-3 py-1 bg-theme-surface border border-theme-border rounded-full text-[10px] font-mono text-theme-muted tracking-wider"
            >
              {keyword
                .replace(/-/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          {/each}
        </div>
      </div>

      <div
        class="mt-16 p-8 rounded-lg bg-theme-surface/30 border border-theme-border flex flex-col md:flex-row items-center justify-between gap-8"
      >
        <div class="text-center md:text-left">
          <h3
            class="text-lg font-header font-bold uppercase tracking-widest mb-2"
          >
            Ready to bring your lore home?
          </h3>
          <p class="text-sm text-theme-muted">
            Local-first. Your vault stays yours.
          </p>
        </div>
        <a
          href="{base}/?utm_source=blog-{article.slug}&utm_medium=blog-cta&utm_campaign=devlog"
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
