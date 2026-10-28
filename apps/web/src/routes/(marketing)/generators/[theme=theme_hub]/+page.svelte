<script lang="ts">
  import { onMount } from "svelte";
  import { basePath } from "#lib/utils/base-path.js";
  const cleanBase = basePath();
  import { safeJsonLd } from "#lib/utils/json-ld.js";
  import { themeStore } from "#lib/stores/theme.svelte.js";
  import { hubContext } from "#lib/stores/hub-context.svelte.js";
  import { getLandingPagesForHub } from "#lib/content/for/registry.js";

  const { data } = $props();

  // The /for guides — system, genre or campaign style — that belong to this hub.
  const landingPages = $derived(getLandingPagesForHub(data.theme));

  const origin = "https://codexcryptica.com";

  import { themeConfig } from "./theme-config";

  const config = $derived(themeConfig[data.theme]);
  const canonicalUrl = $derived(`${origin}/generators/${data.theme}`);

  const collectionPageJsonLd = $derived(
    safeJsonLd({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: config.metaTitle,
      description: config.metaDescription,
      url: canonicalUrl,
      inLanguage: "en",
    }),
  );

  const itemListJsonLd = $derived(
    safeJsonLd({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${config.label} RPG Generators`,
      description: config.metaDescription,
      url: canonicalUrl,
      numberOfItems: config.cards.length,
      itemListElement: config.cards.map((card, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: card.label,
        description: card.summary,
        url: `${origin}/generators/${card.slug === "random" ? card.slug : `${data.theme}/${card.slug}`}`,
      })),
    }),
  );

  const breadcrumbJsonLd = $derived(
    safeJsonLd({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Codex Cryptica",
          item: origin,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "RPG Generators",
          item: `${origin}/generators`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: `${config.label} Generators`,
          item: canonicalUrl,
        },
      ],
    }),
  );

  onMount(() => {
    themeStore.setTheme(config.localStorageId);
  });
</script>

<svelte:head>
  <title>{config.metaTitle}</title>
  <meta name="description" content={config.metaDescription} />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href={canonicalUrl} />
  <link rel="help" href="{cleanBase}/llms.txt" />
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Codex Cryptica" />
  <meta property="og:title" content={config.metaTitle} />
  <meta property="og:description" content={config.metaDescription} />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:image" content="{origin}/logo.png" />
  <meta property="og:image:width" content="1024" />
  <meta property="og:image:height" content="1024" />
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content={config.metaTitle} />
  <meta name="twitter:description" content={config.metaDescription} />
  <meta name="twitter:image" content="{origin}/logo.png" />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html `<scr` +
    `ipt type="application/ld+json">${collectionPageJsonLd}</scr` +
    `ipt>`}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html `<scr` +
    `ipt type="application/ld+json">${itemListJsonLd}</scr` +
    `ipt>`}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html `<scr` +
    `ipt type="application/ld+json">${breadcrumbJsonLd}</scr` +
    `ipt>`}
</svelte:head>

<div
  class="min-h-screen bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg"
  style:background-image="var(--bg-texture-overlay)"
>
  <section class="border-b border-theme-border/60 px-6 py-14 md:py-18">
    <div class="max-w-7xl mx-auto">
      <div class="flex items-center justify-between gap-4 mb-8">
        <a
          href="{cleanBase}/generators"
          class="inline-flex items-center gap-2 text-xs font-bold text-theme-muted hover:text-theme-primary transition-colors"
        >
          <span aria-hidden="true" class="icon-[lucide--arrow-left] h-4 w-4"
          ></span>
          All Generators
        </a>

        <div
          class="flex items-center gap-1 rounded-lg border border-theme-border/60 bg-theme-surface/50 p-1 shadow-sm"
          role="group"
          aria-label="App Appearance"
        >
          <button
            type="button"
            title="Switch to Light Mode"
            aria-label="Light mode"
            aria-pressed={themeStore.resolvedAppAppearanceId ===
              "neutral-light"}
            class="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-all {themeStore.resolvedAppAppearanceId ===
            'neutral-light'
              ? 'bg-theme-primary text-theme-bg shadow-sm'
              : 'text-theme-muted hover:text-theme-text'}"
            onclick={() => themeStore.setAppAppearance("neutral-light")}
          >
            <span class="icon-[lucide--sun] h-3.5 w-3.5" aria-hidden="true"
            ></span>
            <span class="hidden sm:inline">Light</span>
          </button>
          <button
            type="button"
            title="Switch to Dark Mode"
            aria-label="Dark mode"
            aria-pressed={themeStore.resolvedAppAppearanceId === "neutral-dark"}
            class="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-all {themeStore.resolvedAppAppearanceId ===
            'neutral-dark'
              ? 'bg-theme-primary text-theme-bg shadow-sm'
              : 'text-theme-muted hover:text-theme-text'}"
            onclick={() => themeStore.setAppAppearance("neutral-dark")}
          >
            <span class="icon-[lucide--moon] h-3.5 w-3.5" aria-hidden="true"
            ></span>
            <span class="hidden sm:inline">Dark</span>
          </button>
        </div>
      </div>
      <div class="max-w-3xl">
        <p
          class="text-xs font-mono uppercase tracking-[0.24em] text-theme-primary mb-4"
        >
          {config.eyebrow}
        </p>
        <h1
          class="font-display text-4xl md:text-5xl font-extrabold tracking-wide mb-5"
        >
          {config.label} RPG Generators
        </h1>
        <p class="text-base md:text-lg text-theme-muted leading-relaxed">
          {config.intro}
        </p>
      </div>
    </div>
  </section>

  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
    <ul class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {#each config.cards as card (card.slug)}
        <li>
          <a
            href="{cleanBase}/generators/{card.slug === 'random'
              ? card.slug
              : `${data.theme}/${card.slug}`}"
            onclick={() => {
              themeStore.setTheme(config.localStorageId);
              hubContext.set(data.theme);
            }}
            class="group block h-full rounded-xl border border-theme-border/60 bg-theme-surface/35 p-5 hover:border-theme-primary/60 hover:bg-theme-surface/55 transition-colors"
          >
            <span class="{card.icon} h-5 w-5 text-theme-primary mb-4 block"
            ></span>
            <span
              class="block font-header text-base font-bold text-theme-text mb-2 group-hover:text-theme-primary transition-colors"
            >
              {card.label}
            </span>
            <span class="block text-sm text-theme-muted leading-relaxed">
              {card.summary}
            </span>
          </a>
        </li>
      {/each}
    </ul>

    {#if landingPages.length > 0}
      <section class="mt-14 border-t border-theme-border/60 pt-10">
        <h2 class="font-header text-xl font-bold mb-2">
          Campaign guides for these worlds
        </h2>
        <p class="text-base text-theme-muted leading-relaxed mb-6">
          How Codex Cryptica handles the systems, genres and campaign styles
          these generators are built for.
        </p>
        <ul class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#each landingPages as page (page.slug)}
            <li>
              <a
                href="{cleanBase}/for/{page.slug}"
                class="group flex h-full items-start justify-between gap-4 rounded-xl border border-theme-border/60 bg-theme-surface/35 p-5 hover:border-theme-primary/60 hover:bg-theme-surface/55 transition-colors"
              >
                <span>
                  <span
                    class="block font-header text-base font-bold text-theme-text mb-2 group-hover:text-theme-primary transition-colors"
                  >
                    {page.hero.title}
                  </span>
                  <span class="block text-sm text-theme-muted leading-relaxed">
                    {page.hero.tagline}
                  </span>
                </span>
                <span
                  class="icon-[lucide--arrow-right] h-4 w-4 shrink-0 mt-0.5 text-theme-primary transition-transform group-hover:translate-x-1"
                ></span>
              </a>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
</div>
