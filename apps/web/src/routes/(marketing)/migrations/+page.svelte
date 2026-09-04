<script lang="ts">
  import { base } from "$app/paths";
  const cleanBase = base === "/" ? "" : base;
  import { importsConfig } from "$lib/config/seo-pages";
  import { safeJsonLd } from "$lib/utils/json-ld";

  const importers = Object.values(importsConfig);

  const pageUrl = "https://codexcryptica.com/migrations";

  const breadcrumbSchema = safeJsonLd({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://codexcryptica.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Migration Hub",
        item: pageUrl,
      },
    ],
  });
</script>

<svelte:head>
  <title>Migration Hub | Import Your Campaign into Codex Cryptica</title>
  <meta
    name="description"
    content="Every way to bring your campaign into Codex Cryptica — Obsidian, World Anvil, Kanka, LegendKeeper, Scabard, and Thread Weaver Engine exports, all converted and previewed offline in your browser."
  />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href={pageUrl} />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html `<scr` +
    `ipt type="application/ld+json">${breadcrumbSchema}</scr` +
    `ipt>`}
</svelte:head>

<div
  class="min-h-screen bg-theme-bg text-theme-text font-body flex flex-col"
  style:background-image="var(--bg-texture-overlay)"
>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-16 flex-grow w-full">
    <div class="text-center mb-14">
      <div
        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-medium bg-theme-primary/10 border border-theme-primary/20 text-theme-primary mb-4"
      >
        <span class="icon-[lucide--folder-input] w-3.5 h-3.5" aria-hidden="true"
        ></span>
        Migration Hub
      </div>
      <h1
        class="font-header font-extrabold text-3xl md:text-5xl tracking-wide text-theme-primary mb-4"
      >
        Bring Your Campaign Into Codex Cryptica
      </h1>
      <p
        class="text-base md:text-lg text-theme-text/80 leading-relaxed max-w-2xl mx-auto"
      >
        Every export below is parsed and previewed entirely in your browser —
        nothing is uploaded anywhere. Pick the tool you're migrating from.
      </p>
    </div>

    <ul class="grid grid-cols-1 md:grid-cols-2 gap-5">
      {#each importers as importer (importer.slug)}
        <li>
          <a
            href="{cleanBase}/import/{importer.slug}"
            class="group block h-full rounded-2xl border border-theme-border/60 bg-theme-surface/35 p-6 hover:border-theme-primary/60 hover:bg-theme-surface/55 transition-colors"
          >
            <span
              class="block font-header text-lg font-bold mb-2 group-hover:text-theme-primary transition-colors"
            >
              {importer.h1}
            </span>
            <span class="block text-base text-theme-muted leading-relaxed mb-4">
              {importer.subheading}
            </span>
            <span
              class="inline-flex items-center gap-1.5 text-xs font-bold text-theme-primary"
            >
              {importer.ctaText}
              <span
                class="icon-[lucide--arrow-right] w-3.5 h-3.5 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              ></span>
            </span>
          </a>
        </li>
      {/each}
    </ul>
  </div>
</div>
