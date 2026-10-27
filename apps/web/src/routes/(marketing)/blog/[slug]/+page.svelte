<script lang="ts">
  import { basePath } from "#lib/utils/base-path.js";
  import { themeStore } from "#lib/stores/theme.svelte.js";
  import ArticleRenderer from "#lib/components/blog/ArticleRenderer.svelte";
  import BlogTableOfContents from "#lib/components/blog/BlogTableOfContents.svelte";
  import { extractBlogToc } from "#lib/components/blog/blog-toc.js";
  import ResponsibleAISeriesNav from "#lib/components/blog/ResponsibleAISeriesNav.svelte";
  import PublicPageContainer from "#lib/components/seo/PublicPageContainer.svelte";
  import { PUBLIC_LAYOUT } from "#lib/components/seo/marketing-shell.js";
  import { RA_SERIES_SLUGS } from "#lib/content/responsible-ai-series.js";
  import { safeJsonLd } from "#lib/utils/json-ld.js";
  import {
    SITE_AUTHOR,
    DISCORD_URL,
    REDDIT_URL,
    GITHUB_URL,
  } from "#lib/config/index.js";
  import SeoHead from "#lib/components/seo/SeoHead.svelte";

  let { data } = $props();
  const article = $derived(data.article);
  // A post may name its own author; otherwise the site's.
  const authorName = $derived(article.author?.trim() || SITE_AUTHOR.name);
  const isRASeries = $derived(RA_SERIES_SLUGS.has(article.slug));
  const articleContent = $derived(
    article.content.replace(/^#[^\n]+\n/, "").trimStart(),
  );
  const headings = $derived(extractBlogToc(articleContent));

  // Every post had a bare link card before this: the root layout declares
  // twitter:card but no image anywhere, so there was nothing to show. A post
  // names its own capture in frontmatter; the rest fall back to the product
  // screenshot. Plain R2 URLs — social crawlers don't negotiate formats, so
  // these must not go through the cdn-cgi transform.
  const DEFAULT_CARD_IMAGE =
    "https://assets.codexcryptica.com/screenshots/feature-connect.jpg";
  const DEFAULT_CARD_IMAGE_ALT =
    "A Codex Cryptica campaign vault showing an entity graph beside an open character record";
  const cardImage = $derived(article.image?.trim() || DEFAULT_CARD_IMAGE);

  const cardImageAlt = $derived(
    article.image?.trim()
      ? (article.imageAlt?.trim() ?? article.title)
      : DEFAULT_CARD_IMAGE_ALT,
  );

  const jsonLdString = $derived(
    safeJsonLd({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: article.title,
      description: article.description,
      datePublished: article.publishedAt,
      // Only claim a modification when there was one. Echoing publishedAt here
      // tells every reader and crawler that every post was revised on the day
      // it went out.
      dateModified: article.updatedAt ?? article.publishedAt,
      url: data.canonicalUrl,
      mainEntityOfPage: { "@type": "WebPage", "@id": data.canonicalUrl },
      // A Person, not the Organization: search engines and readers both treat
      // an org-authored article as content rather than as someone's writing.
      author: {
        "@type": "Person",
        name: authorName,
        // SITE_AUTHOR.url identifies one specific person. A post that names its
        // own author must not inherit it, or the structured data claims that
        // byline belongs to someone else's page.
        ...(article.author?.trim() ? {} : { url: SITE_AUTHOR.url }),
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

<SeoHead
  title="{article.title} | Codex Cryptica Blog"
  description={article.description}
  canonicalUrl={data.canonicalUrl}
  type="article"
  image={cardImage}
  imageAlt={cardImageAlt}
  keywords={article.keywords}
  publishedTime={article.publishedAt}
  author={authorName}
  twitterCard="summary_large_image"
  jsonLd={jsonLdString}
/>

{#snippet articleBody()}
  <div
    class={headings.length >= 2 || isRASeries
      ? PUBLIC_LAYOUT.split.container
      : ""}
  >
    <div
      class="{headings.length >= 2 || isRASeries
        ? PUBLIC_LAYOUT.split.content
        : ''} {PUBLIC_LAYOUT.prose.measure}"
    >
      <div class="mb-20">
        <ArticleRenderer content={articleContent} />
      </div>

      {#if isRASeries}
        <div class="lg:hidden">
          <ResponsibleAISeriesNav currentSlug={article.slug} />
        </div>
      {/if}
    </div>

    {#if headings.length >= 2 || isRASeries}
      <aside
        class="{PUBLIC_LAYOUT.split
          .aside} custom-scrollbar sticky top-24 hidden max-h-[calc(100vh-7rem)] scroll-py-2 space-y-8 self-start overflow-y-auto lg:block"
        aria-label="Article navigation"
      >
        {#if headings.length >= 2}
          <BlogTableOfContents {headings} />
        {/if}

        {#if isRASeries}
          <ResponsibleAISeriesNav currentSlug={article.slug} />
        {/if}
      </aside>
    {/if}
  </div>
{/snippet}

<div
  class="min-h-screen bg-theme-bg text-theme-text selection:bg-theme-primary selection:text-theme-bg py-12 sm:py-20 md:py-28"
>
  <PublicPageContainer width="full">
    <nav class="mb-12">
      <a
        href="{basePath()}/blog"
        class="inline-flex items-center gap-2 text-theme-text hover:underline transition-colors text-xs font-bold group"
      >
        <span
          class="icon-[lucide--arrow-left] w-4 h-4 group-hover:-translate-x-1 transition-transform"
        ></span>
        Back to Archive
      </a>
    </nav>

    <header class="mb-16 {PUBLIC_LAYOUT.prose.lead}">
      <div
        class="flex items-center gap-4 text-xs font-mono text-theme-text uppercase tracking-widest mb-6"
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
        <span data-testid="blog-byline">By {authorName}</span>
        {#if article.updatedAt}
          <span aria-hidden="true" class="w-8 h-px bg-theme-border"></span><span
            class="sr-only"
          >
            ·
          </span>
          <span data-testid="blog-updated">
            Updated <time datetime={article.updatedAt}
              >{new Date(article.updatedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "UTC",
              })}</time
            >
          </span>
        {/if}
        <span aria-hidden="true" class="w-8 h-px bg-theme-border"></span><span
          class="sr-only"
        >
          ·
        </span>
        <span>{themeStore.resolveJargon("blog_entry")}</span>
      </div>

      <h1 class="text-3xl md:text-5xl font-header font-bold leading-tight mb-8">
        {article.title}
      </h1>

      <p
        class="text-theme-text text-xl italic leading-relaxed border-l-4 border-theme-primary pl-6"
      >
        {article.description}
      </p>
    </header>

    {@render articleBody()}

    <footer
      class="pt-12 border-t border-theme-border mt-16 {PUBLIC_LAYOUT.prose
        .lead}"
    >
      <div>
        <p
          class="text-micro font-mono text-theme-text uppercase tracking-widest mb-3"
        >
          Topics
        </p>
        <div class="flex flex-wrap gap-2">
          {#each article.keywords.slice(0, 6) as keyword}
            <span
              class="px-3 py-1 bg-theme-surface border border-theme-border rounded-full text-micro font-mono text-theme-text tracking-wider"
            >
              {keyword
                .replace(/-/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          {/each}
        </div>
      </div>

      <div
        class="mt-12 p-6 rounded-lg bg-theme-surface/40 border border-theme-border/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-header"
      >
        <div class="text-center sm:text-left">
          <span class="font-bold text-theme-text block sm:inline"
            >Join the discussion:</span
          >
          <span class="text-theme-text ml-0 sm:ml-1"
            >Share campaign notes, ask questions, or report issues.</span
          >
        </div>
        <div class="flex flex-wrap items-center justify-center gap-4 shrink-0">
          {#if DISCORD_URL}
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              class="text-theme-text hover:text-theme-primary transition-colors inline-flex items-center gap-1.5"
            >
              <span
                class="icon-[lucide--message-square] w-3.5 h-3.5"
                aria-hidden="true"
              ></span>
              Discord
            </a>
          {/if}
          {#if REDDIT_URL}
            <a
              href={REDDIT_URL}
              target="_blank"
              rel="noopener noreferrer"
              class="text-theme-text hover:text-theme-primary transition-colors inline-flex items-center gap-1.5"
            >
              <span
                class="icon-[lucide--message-circle] w-3.5 h-3.5"
                aria-hidden="true"
              ></span>
              Reddit
            </a>
          {/if}
          {#if GITHUB_URL}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              class="text-theme-text hover:text-theme-primary transition-colors inline-flex items-center gap-1.5"
            >
              <span class="icon-[lucide--github] w-3.5 h-3.5" aria-hidden="true"
              ></span>
              GitHub
            </a>
          {/if}
        </div>
      </div>

      <div
        class="mt-8 p-8 rounded-lg bg-theme-surface/30 border border-theme-border flex flex-col md:flex-row items-center justify-between gap-8"
      >
        <div class="text-center md:text-left">
          <h3 class="text-lg font-header font-bold mb-2">
            Ready to bring your lore home?
          </h3>
          <p class="text-sm text-theme-text">
            Local-first. Your vault stays yours.
          </p>
        </div>
        <a
          href="{basePath()}/?utm_source=blog-{article.slug}&utm_medium=blog-cta&utm_campaign=devlog"
          class="px-8 py-4 bg-theme-primary text-theme-on-primary font-bold font-header text-xs rounded hover:bg-theme-primary/90 transition-all active:scale-95 shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.3)]"
        >
          Enter the Codex
        </a>
      </div>
    </footer>
  </PublicPageContainer>
</div>

<style>
  @reference "../../../../app.css";
</style>
