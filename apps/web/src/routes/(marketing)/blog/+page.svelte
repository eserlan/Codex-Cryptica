<script lang="ts">
  import { basePath } from "#lib/utils/base-path.js";
  import { themeStore } from "#lib/stores/theme.svelte.js";
  import { SITE_AUTHOR } from "#lib/config/index.js";
  import PublicPageContainer from "#lib/components/seo/PublicPageContainer.svelte";
  import { PUBLIC_LAYOUT } from "#lib/components/seo/marketing-shell.js";
  import {
    RA_SERIES,
    RA_SERIES_SLUGS,
  } from "#lib/content/responsible-ai-series.js";
  import SeoHead from "#lib/components/seo/SeoHead.svelte";

  let { data } = $props();

  // The seven responsible-AI posts went out on one day, two hours apart. Listed
  // as seven standalone promotions they read as a batch, which is what they
  // are; presented as the series they are, they read as one deliberate piece of
  // writing. Their dates are untouched, only how the index frames them.
  // Ordered by the series' own sequence, not by date. The index sorts newest
  // first, which would number the final part 01.
  const seriesOrder = RA_SERIES.map((a) => a.slug);
  const seriesArticles = $derived(
    data.articles
      .filter((a: { slug: string }) => RA_SERIES_SLUGS.has(a.slug))
      .sort(
        (a: { slug: string }, b: { slug: string }) =>
          seriesOrder.indexOf(a.slug) - seriesOrder.indexOf(b.slug),
      ),
  );
  const standaloneArticles = $derived(
    data.articles.filter((a: { slug: string }) => !RA_SERIES_SLUGS.has(a.slug)),
  );
</script>

<svelte:head>
  <link
    rel="alternate"
    type="application/atom+xml"
    title="Codex Cryptica blog"
    href="{basePath()}/blog/feed.xml"
  />
</svelte:head>

<SeoHead
  title="The Archive | Codex Cryptica Blog"
  description="Explore the official Codex Cryptica blog for guides on local-first RPG world-building, tactical mapping, and data sovereignty."
  canonicalUrl={data.canonicalUrl}
  image="https://assets.codexcryptica.com/screenshots/feature-connect.jpg"
  imageAlt="A Codex Cryptica campaign vault showing an entity graph beside an open character record"
  keywords={[
    "rpg blog",
    "worldbuilding blog",
    "local-first rpg",
    "ttrpg campaign manager",
  ]}
/>

<div
  class="min-h-screen bg-theme-bg text-theme-text selection:bg-theme-primary selection:text-theme-bg py-12 sm:py-20 md:py-28"
>
  <PublicPageContainer width="full">
    <header class="mb-16 md:mb-24 {PUBLIC_LAYOUT.prose.lead}">
      <h1
        class="text-4xl md:text-6xl font-header font-bold mb-6 bg-gradient-to-r from-theme-text to-theme-text/60 bg-clip-text text-transparent"
      >
        The Archive
      </h1>

      <p class="text-theme-text text-lg leading-relaxed">
        Deep dives into the technology and philosophy behind Codex Cryptica.
        Learn how to secure your lore and master the spatial brain.
      </p>
      <a
        href="{basePath()}/blog/feed.xml"
        class="mt-4 inline-flex items-center gap-2 text-sm text-theme-text hover:underline"
      >
        <span class="icon-[lucide--rss] h-4 w-4" aria-hidden="true"></span>
        Subscribe to the blog
      </a>

      <!-- Responsible AI Pillar Link Banner -->
      <div
        class="mt-8 p-5 rounded-2xl border border-theme-primary/20 bg-theme-surface/30 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-theme-primary/40 transition-colors"
      >
        <div class="space-y-1">
          <h2
            class="text-xs font-mono font-bold text-theme-text flex items-center gap-2"
          >
            <span aria-hidden="true" class="icon-[lucide--shield-alert] h-4 w-4"
            ></span>
            Responsible AI Positioning
          </h2>
          <p class="text-sm text-theme-text">
            Read our 7-part devlog series and guidelines on keeping
            human-centric narrative control at the core of AI worldbuilding
            tools.
          </p>
        </div>
        <a
          href="{basePath()}/responsible-ai-worldbuilding"
          class="inline-flex items-center gap-2 self-start sm:self-center px-4 py-2 text-xs font-bold font-header bg-theme-primary text-theme-on-primary rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-md shrink-0"
        >
          Read the Pillar
          <span
            aria-hidden="true"
            class="icon-[lucide--arrow-right] h-3.5 w-3.5"
          ></span>
        </a>
      </div>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
      {#each standaloneArticles as article (article.slug)}
        <article
          class="group relative flex flex-col justify-between rounded-2xl border border-theme-border/60 bg-theme-surface/25 p-6 hover:border-theme-primary/40 hover:bg-theme-surface/40 transition-all shadow-sm"
        >
          <div class="space-y-4">
            <div
              class="flex flex-wrap items-center gap-2 text-xs font-mono text-theme-text uppercase tracking-widest"
            >
              <time datetime={article.publishedAt}>
                {new Date(article.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })}
              </time>
              <span aria-hidden="true" class="text-theme-border">·</span>
              <span data-testid="blog-index-byline"
                >By {article.author?.trim() || SITE_AUTHOR.name}</span
              >
            </div>

            <h2
              class="text-xl md:text-2xl font-header font-bold group-hover:text-theme-primary transition-colors leading-snug"
            >
              <a
                href="{basePath()}/blog/{article.slug}"
                class="after:absolute after:inset-0"
              >
                {article.title}
              </a>
            </h2>

            <p class="text-theme-text line-clamp-3 text-base leading-relaxed">
              {article.description}
            </p>
          </div>

          <div
            class="mt-6 pt-4 border-t border-theme-border/40 flex items-center justify-between text-theme-text font-bold uppercase text-xs tracking-[0.16em] group-hover:text-theme-primary transition-colors"
          >
            <span>{themeStore.resolveJargon("blog_action")}</span>
            <span
              aria-hidden="true"
              class="icon-[lucide--arrow-right] w-4 h-4 text-theme-primary group-hover:translate-x-1 transition-transform"
            ></span>
          </div>
        </article>
      {/each}

      {#if seriesArticles.length > 0}
        <section
          class="md:col-span-2 lg:col-span-3 rounded-2xl border border-theme-border/60 bg-theme-surface/30 p-6 md:p-8 mt-6"
          aria-labelledby="ra-series-heading"
          data-testid="blog-series-collection"
        >
          <div
            class="flex items-center gap-4 text-xs font-mono text-theme-text uppercase tracking-widest mb-3"
          >
            <span aria-hidden="true" class="icon-[lucide--shield-alert] h-4 w-4"
            ></span>
            <span>{seriesArticles.length}-part series</span>
          </div>

          <h2
            id="ra-series-heading"
            class="text-2xl md:text-3xl font-header font-bold mb-3"
          >
            <a
              href="{basePath()}/responsible-ai-worldbuilding"
              class="hover:text-theme-primary transition-colors"
            >
              Responsible AI worldbuilding
            </a>
          </h2>
          <p class="text-theme-text text-lg leading-relaxed mb-6 max-w-3xl">
            One argument across seven posts: what an AI worldbuilding tool owes
            the person using it, and where the author's control has to stay.
          </p>

          <ol class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each seriesArticles as article, i (article.slug)}
              <li
                class="flex items-start gap-3 p-3 rounded-lg bg-theme-surface/40 border border-theme-border/40"
              >
                <span class="font-mono text-theme-text shrink-0 text-xs mt-0.5"
                  >{String(i + 1).padStart(2, "0")}</span
                >
                <a
                  href="{basePath()}/blog/{article.slug}"
                  class="text-theme-text hover:text-theme-primary transition-colors text-sm font-medium leading-snug"
                >
                  {article.title}
                </a>
              </li>
            {/each}
          </ol>
        </section>
      {/if}
    </div>

    {#if data.articles.length === 0}
      <div
        class="py-20 text-center border border-dashed border-theme-border rounded-lg bg-theme-surface/5"
      >
        <p class="text-theme-text font-mono">
          No transmissions found in the archive.
        </p>
      </div>
    {/if}
  </PublicPageContainer>
</div>

<style>
  @reference "../../../app.css";
</style>
