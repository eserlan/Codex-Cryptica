<script lang="ts">
  import { base } from "$app/paths";
  const cleanBase = base === "/" ? "" : base;
  import { safeJsonLd } from "$lib/utils/json-ld";
  import type {
    SEOPageData,
    SEOComparisonPageData,
  } from "$lib/config/seo-pages";

  let {
    data,
    type = "solution",
    canonicalUrl,
  }: {
    data: SEOPageData | SEOComparisonPageData;
    type?: "solution" | "comparison";
    /** Override the computed canonical URL (e.g. for standalone routes outside /solutions). */
    canonicalUrl?: string;
  } = $props();

  // FAQ state
  let openFaqIndex = $state<number | null>(null);

  const comparisonData = $derived(
    type === "comparison" ? (data as SEOComparisonPageData) : null,
  );

  // Generate JSON-LD Structured Data
  const jsonLd = $derived({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Codex Cryptica",
    applicationCategory: "GameApplication",
    operatingSystem: "Web, Windows, macOS, Linux",
    description: data.description,
    offers: {
      "@type": "Offer",
      price: "0.00",
      priceCurrency: "USD",
    },
    mainEntity: {
      "@type": "FAQPage",
      mainEntity: data.faq.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: f.answer,
        },
      })),
    },
  });

  const jsonLdString = $derived(safeJsonLd(jsonLd));

  const pageUrl = $derived(
    canonicalUrl
      ? `https://codexcryptica.com${canonicalUrl}`
      : `https://codexcryptica.com/${type === "comparison" ? "vs" : "solutions"}/${data.slug}`,
  );

  const breadcrumb = $derived({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: (() => {
      const items = [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://codexcryptica.com",
        },
      ];

      if (canonicalUrl) {
        const parts = canonicalUrl.split("/").filter(Boolean);
        if (parts.length > 1) {
          let currentPath = "";
          parts.forEach((part, index) => {
            currentPath += `/${part}`;
            const isLast = index === parts.length - 1;
            const name = isLast
              ? data.h1
              : (part.charAt(0).toUpperCase() + part.slice(1)).replace(
                  /-/g,
                  " ",
                );
            items.push({
              "@type": "ListItem",
              position: index + 2,
              name,
              item: `https://codexcryptica.com${currentPath}`,
            });
          });
        } else {
          items.push({
            "@type": "ListItem",
            position: 2,
            name: data.h1,
            item: pageUrl,
          });
        }
      } else {
        items.push({
          "@type": "ListItem",
          position: 2,
          name: type === "comparison" ? "Comparisons" : "Solutions",
          item: `https://codexcryptica.com/${type === "comparison" ? "vs" : "solutions"}`,
        });
        items.push({
          "@type": "ListItem",
          position: 3,
          name: data.h1,
          item: pageUrl,
        });
      }
      return items;
    })(),
  });

  const breadcrumbString = $derived(safeJsonLd(breadcrumb));

  function toggleFaq(index: number) {
    openFaqIndex = openFaqIndex === index ? null : index;
  }
</script>

<svelte:head>
  <title>{data.title}</title>
  <meta name="description" content={data.description} />
  <meta name="keywords" content={data.keywords.join(", ")} />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href={pageUrl} />
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Codex Cryptica" />
  <meta property="og:title" content={data.title} />
  <meta property="og:description" content={data.description} />
  <meta property="og:url" content={pageUrl} />
  <meta property="og:image" content="https://codexcryptica.com/logo.png" />
  <meta property="og:image:width" content="1024" />
  <meta property="og:image:height" content="1024" />
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content={data.title} />
  <meta name="twitter:description" content={data.description} />
  <meta name="twitter:image" content="https://codexcryptica.com/logo.png" />
  <link rel="help" href="{cleanBase}/llms.txt" />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html `<scr` +
    `ipt type="application/ld+json">${jsonLdString}</scr` +
    `ipt>`}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html `<scr` +
    `ipt type="application/ld+json">${breadcrumbString}</scr` +
    `ipt>`}
</svelte:head>

<div
  class="min-h-screen bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg flex flex-col"
  style:background-image="var(--bg-texture-overlay)"
>
  <!-- Marketing Header -->
  <header
    class="w-full border-b border-theme-border/60 bg-theme-surface/40 backdrop-blur-md px-6 py-4 sticky top-0 z-50"
  >
    <div class="max-w-6xl mx-auto flex items-center justify-between gap-4">
      <a
        href="{cleanBase}/"
        class="flex items-center gap-2 group min-w-0"
        id="logo-link"
      >
        <span
          class="icon-[lucide--castle] text-theme-primary w-6 h-6 shrink-0 transition-transform group-hover:rotate-12"
        ></span>
        <span
          class="font-header font-bold text-sm uppercase tracking-[0.2em] text-theme-text group-hover:text-theme-primary transition-colors whitespace-nowrap truncate"
        >
          Codex<span class="hidden sm:inline"> Cryptica</span>
        </span>
      </a>
      <nav
        class="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-widest font-header text-theme-muted"
      >
        <a
          href="{cleanBase}/free-rpg-campaign-manager"
          class="hover:text-theme-primary transition-colors"
          >Free RPG campaign manager</a
        >
        <a
          href="{cleanBase}/worldbuilding-tool"
          class="hover:text-theme-primary transition-colors"
          >worldbuilding tool</a
        >
        <a
          href="{cleanBase}/features"
          class="hover:text-theme-primary transition-colors">Features</a
        >
        <a
          href="{cleanBase}/blog"
          class="hover:text-theme-primary transition-colors">Devlog</a
        >
        <a
          href="{cleanBase}/tools/dnd-npc-generator"
          class="hover:text-theme-primary transition-colors">Generators</a
        >
      </nav>
      <div class="shrink-0">
        <a
          href="{cleanBase}/?ref={type === 'comparison'
            ? 'vs-nav'
            : 'solution-nav'}"
          class="px-5 py-2.5 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-wider text-[10px] rounded-lg hover:brightness-110 shadow-sm transition-all whitespace-nowrap"
          id="nav-cta-btn"
        >
          Open Codex
        </a>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center flex-grow">
    <div
      class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-theme-primary/10 border border-theme-primary/20 text-theme-primary mb-10 uppercase tracking-wider"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-theme-primary"></span>
      {data.eyebrow ??
        (comparisonData
          ? `Free ${comparisonData.competitorName} Alternative`
          : "100% Local-First Campaign Wiki")}
    </div>
    <h1
      class="text-4xl md:text-5xl font-extrabold font-header leading-tight mb-4 tracking-wide"
      id="hero-h1"
    >
      {data.h1}
    </h1>
    {#if data.tagline}
      <p
        class="text-3xl md:text-4xl font-extrabold font-header leading-tight mb-6 tracking-wide"
      >
        {#each data.tagline.split("\n") as line}
          <span class="block">{line}</span>
        {/each}
      </p>
    {/if}
    <p
      class="text-lg md:text-xl text-theme-primary/80 font-header italic mb-8 max-w-2xl mx-auto"
    >
      {data.subheading}
    </p>
    {#each data.introText.split("\n\n") as paragraph}
      <p
        class="text-theme-text/75 text-sm md:text-base leading-relaxed mb-4 last:mb-10 max-w-3xl mx-auto"
      >
        {paragraph}
      </p>
    {/each}
    <div class="flex flex-col sm:flex-row flex-wrap justify-center gap-4">
      <a
        href="{cleanBase}/?ref={type === 'comparison'
          ? 'vs-hero'
          : 'solution-hero'}"
        class="px-8 py-3.5 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-widest text-xs rounded-xl shadow-lg hover:brightness-110 hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap"
        id="hero-primary-cta"
      >
        {data.ctaText}
      </a>
      {#if data.secondaryCtaText}
        <a
          href="{cleanBase}{data.secondaryCtaHref ?? '/tools'}"
          class="px-8 py-3.5 border border-theme-primary/60 text-theme-primary font-bold uppercase font-header tracking-widest text-xs rounded-xl hover:bg-theme-primary/10 transition-all duration-200 whitespace-nowrap"
          id="hero-secondary-cta"
        >
          {data.secondaryCtaText}
        </a>
      {/if}
    </div>

    {#if comparisonData?.migrationStrip}
      <div
        class="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 mt-10"
      >
        {#each comparisonData.migrationStrip as step, idx}
          {#if idx > 0}
            <span
              class="icon-[lucide--arrow-down] md:hidden text-theme-primary/65 w-4 h-4"
              aria-hidden="true"
            ></span>
            <span
              class="icon-[lucide--arrow-right] hidden md:block self-center text-theme-primary/65 w-4 h-4"
              aria-hidden="true"
            ></span>
          {/if}
          <div
            class="flex flex-row md:flex-col items-center gap-2 md:gap-1.5 px-5 py-3 bg-theme-surface/30 border border-theme-border/40 rounded-xl min-w-[160px] md:min-w-0"
          >
            <span
              class="{step.icon} text-theme-primary w-5 h-5 shrink-0"
              aria-hidden="true"
            ></span>
            <span
              class="text-xs font-bold uppercase tracking-wider font-header text-theme-text text-center"
              >{step.label}</span
            >
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <!-- Features Grid -->
  <section class="border-t border-theme-border/30 bg-theme-surface/10 py-16">
    <div class="max-w-5xl mx-auto px-6">
      <h2
        class="text-center font-header text-xl uppercase tracking-[0.2em] text-theme-primary mb-12"
      >
        Core Capabilities
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        {#each data.features as feat}
          <div
            class="p-6 bg-theme-surface/30 border border-theme-border/60 rounded-2xl shadow-sm hover:border-theme-primary/40 hover:-translate-y-1 transition-all duration-300"
          >
            <span
              class="{feat.icon} text-theme-primary w-8 h-8 mb-4 block"
              aria-hidden="true"
            ></span>
            <h3
              class="font-header font-bold text-base mb-2 uppercase tracking-wider"
            >
              {feat.title}
            </h3>
            <p class="text-theme-text/70 text-sm leading-relaxed">
              {feat.description}
            </p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Comparison Section (If comparison type) -->
  {#if type === "comparison" && comparisonData}
    <section class="border-t border-theme-border/30 py-16">
      <div class="max-w-4xl mx-auto px-6">
        <h2
          class="text-center font-header text-2xl uppercase tracking-widest text-theme-primary mb-10"
        >
          Feature Matrix: Codex vs {comparisonData.competitorName}
        </h2>
        <!-- Mobile: stacked cards -->
        <div class="md:hidden space-y-3" id="comparison-table">
          {#each comparisonData.comparisonTable as row, idx}
            <div
              class="border border-theme-border/60 rounded-xl bg-theme-surface/20 overflow-hidden"
              id="feat-mobile-{idx}"
            >
              <div
                class="px-4 py-2.5 bg-theme-surface/60 border-b border-theme-border/40 font-header font-bold text-xs uppercase tracking-wider"
              >
                {row.feature}
              </div>
              <div
                class="grid grid-cols-2 divide-x divide-theme-border/30 text-xs"
              >
                <div class="p-3">
                  <span
                    class="block font-header font-bold text-[9px] uppercase tracking-wider text-theme-muted mb-1"
                    >{comparisonData.competitorName}</span
                  >
                  {#if typeof row.competitorHas === "boolean"}
                    {#if row.competitorHas}
                      <span
                        class="icon-[lucide--check] text-emerald-500 w-4 h-4"
                        role="img"
                        aria-label="Yes"
                      ></span>
                    {:else}
                      <span
                        class="icon-[lucide--x] text-rose-500 w-4 h-4"
                        role="img"
                        aria-label="No"
                      ></span>
                    {/if}
                  {:else}
                    <span class="text-theme-text/70 leading-snug"
                      >{row.competitorHas}</span
                    >
                  {/if}
                </div>
                <div class="p-3">
                  <span
                    class="block font-header font-bold text-[9px] uppercase tracking-wider text-theme-primary mb-1"
                    >Codex Cryptica</span
                  >
                  {#if typeof row.codexHas === "boolean"}
                    {#if row.codexHas}
                      <span
                        class="icon-[lucide--check] text-emerald-400 w-4 h-4"
                        role="img"
                        aria-label="Yes"
                      ></span>
                    {:else}
                      <span
                        class="icon-[lucide--x] text-rose-500 w-4 h-4"
                        role="img"
                        aria-label="No"
                      ></span>
                    {/if}
                  {:else}
                    <span class="font-semibold text-theme-primary leading-snug"
                      >{row.codexHas}</span
                    >
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>

        <!-- Desktop: table -->
        <div
          class="hidden md:block overflow-x-auto border border-theme-border/60 rounded-2xl shadow-sm"
        >
          <table class="w-full text-left border-collapse bg-theme-surface/20">
            <thead>
              <tr
                class="border-b border-theme-border/60 bg-theme-surface/60 font-header text-xs uppercase tracking-wider"
              >
                <th class="px-4 py-4 pl-5 font-bold">Feature</th>
                <th class="px-4 py-4 pl-5 font-bold text-theme-muted"
                  >{comparisonData.competitorName}</th
                >
                <th class="px-4 py-4 pl-5 font-bold text-theme-primary"
                  >Codex Cryptica</th
                >
              </tr>
            </thead>
            <tbody class="text-xs">
              {#each comparisonData.comparisonTable as row, idx}
                <tr
                  class="border-b border-theme-border/30 hover:bg-theme-surface/30 transition-colors"
                >
                  <td class="p-4 font-medium" id="feat-{idx}">{row.feature}</td>
                  <td class="p-4">
                    {#if typeof row.competitorHas === "boolean"}
                      {#if row.competitorHas}
                        <span
                          class="icon-[lucide--check] text-emerald-500 w-4 h-4"
                          aria-label="Yes"
                        ></span>
                      {:else}
                        <span
                          class="icon-[lucide--x] text-rose-500 w-4 h-4"
                          aria-label="No"
                        ></span>
                      {/if}
                    {:else}
                      {row.competitorHas}
                    {/if}
                  </td>
                  <td class="p-4 font-semibold text-theme-primary">
                    {#if typeof row.codexHas === "boolean"}
                      {#if row.codexHas}
                        <span
                          class="icon-[lucide--check] text-emerald-400 w-4 h-4"
                          aria-label="Yes"
                        ></span>
                      {:else}
                        <span
                          class="icon-[lucide--x] text-rose-500 w-4 h-4"
                          aria-label="No"
                        ></span>
                      {/if}
                    {:else}
                      {row.codexHas}
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <div
          class="mt-8 p-8 md:p-10 bg-theme-surface/40 border border-theme-border/60 rounded-2xl shadow-sm text-center"
        >
          <h3
            class="font-header font-bold text-sm uppercase tracking-wider text-theme-primary mb-4"
          >
            The Verdict
          </h3>
          <div class="space-y-3">
            {#each comparisonData.verdict.split("\n\n") as para, idx}
              <p
                class="leading-relaxed text-theme-text/80"
                class:text-base={idx === 0}
                class:font-semibold={idx === 0}
                class:text-sm={idx > 0}
                class:text-theme-muted={idx > 0}
              >
                {para}
              </p>
            {/each}
          </div>
        </div>
      </div>
    </section>
  {/if}

  <!-- Related Links Section -->
  {#if data.relatedLinks && data.relatedLinks.length > 0}
    <section class="border-t border-theme-border/30 py-10">
      <div class="max-w-4xl mx-auto px-6">
        <h2
          class="font-header text-sm uppercase tracking-[0.2em] text-theme-muted mb-6 text-center"
        >
          Related Pages
        </h2>
        <div class="flex flex-wrap justify-center gap-3">
          {#each data.relatedLinks as link (link.href)}
            <a
              href="{cleanBase}{link.href}"
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-theme-border/60 bg-theme-surface/30 text-xs font-bold uppercase tracking-wider text-theme-muted hover:text-theme-primary hover:border-theme-primary/40 transition-colors whitespace-nowrap"
            >
              <span
                class="icon-[lucide--arrow-right] w-3 h-3"
                aria-hidden="true"
              ></span>
              {link.label}
            </a>
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- Responsible AI Trust Banner -->
  {#if data.aiTrustSection}
    <section class="border-t border-theme-border/30 py-10">
      <div class="max-w-3xl mx-auto px-6 text-center">
        <p class="text-sm text-theme-muted leading-relaxed mb-3">
          Responsible AI, not replacement authorship. The Lore Oracle is
          optional, vault-aware, and draft-based. Your vault remains the source
          of truth.
        </p>
        <a
          href="{cleanBase}/responsible-ai-worldbuilding"
          class="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-theme-primary hover:underline"
        >
          <span
            class="icon-[lucide--shield-check] w-3.5 h-3.5"
            aria-hidden="true"
          ></span>
          Read our responsible AI principles
        </a>
      </div>
    </section>
  {/if}

  <!-- FAQ Accordion Section -->
  <section class="border-t border-theme-border/30 bg-theme-surface/10 py-16">
    <div class="max-w-3xl mx-auto px-6">
      <h2
        class="text-center font-header text-xl uppercase tracking-[0.2em] text-theme-primary mb-10"
      >
        Frequently Asked Questions
      </h2>
      <div class="space-y-4">
        {#each data.faq as item, idx}
          <div
            class="border border-theme-border/60 rounded-xl bg-theme-surface/30 overflow-hidden"
          >
            <button
              type="button"
              class="w-full px-6 py-4 flex items-center justify-between text-left font-header font-bold text-sm tracking-wide hover:bg-theme-surface/50 transition-colors"
              onclick={() => toggleFaq(idx)}
              aria-expanded={openFaqIndex === idx}
              aria-controls="faq-answer-{idx}"
              id="faq-btn-{idx}"
            >
              <span>{item.question}</span>
              <span
                class="icon-[lucide--chevron-down] text-theme-muted w-4 h-4 transition-transform duration-200"
                class:rotate-180={openFaqIndex === idx}
              ></span>
            </button>
            {#if openFaqIndex === idx}
              <div
                id="faq-answer-{idx}"
                class="px-6 pb-4 pt-1 text-xs text-theme-muted leading-relaxed"
                role="region"
                aria-labelledby="faq-btn-{idx}"
              >
                <p>{item.answer}</p>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Final CTA Panel -->
  <section
    class="border-t border-theme-border/30 bg-gradient-to-b from-theme-bg to-theme-surface/30 py-16 text-center"
  >
    <div class="max-w-2xl mx-auto px-6">
      <h2 class="text-2xl font-bold font-header mb-4 uppercase tracking-wider">
        {type === "comparison"
          ? "Try Codex Cryptica Free"
          : "Ready to Build Your World?"}
      </h2>
      <p class="text-theme-muted text-xs leading-relaxed mb-8">
        {type === "comparison"
          ? "No account required. No subscription. All your campaign notes stay on your own device."
          : "No account. No server database leaks. Just quick, private, local-first worldbuilding."}
      </p>
      <a
        href="{cleanBase}/?ref={type === 'comparison'
          ? 'vs-footer'
          : 'solution-footer'}"
        class="px-8 py-3.5 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-widest text-xs rounded-xl shadow-lg hover:brightness-110 transition-all whitespace-nowrap"
        id="footer-cta-btn"
      >
        {type === "comparison" ? "Try Free Now" : "Launch Codex Cryptica"}
      </a>
    </div>
  </section>

  <!-- Marketing Footer -->
  <footer
    class="border-t border-theme-border/60 bg-theme-surface/20 px-6 py-8 mt-auto text-center text-[10px] text-theme-muted tracking-wider uppercase font-header"
  >
    <div
      class="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4"
    >
      <div>© 2026 Codex Cryptica. All rights reserved.</div>
      <div class="flex gap-6">
        <a
          href="{cleanBase}/free-rpg-campaign-manager"
          class="hover:text-theme-primary transition-colors"
          >Free RPG campaign manager</a
        >
        <a
          href="{cleanBase}/worldbuilding-tool"
          class="hover:text-theme-primary transition-colors"
          >worldbuilding tool</a
        >
        <a
          href="{cleanBase}/terms"
          class="hover:text-theme-primary transition-colors">Terms</a
        >
        <a
          href="{cleanBase}/privacy"
          class="hover:text-theme-primary transition-colors">Privacy</a
        >
        <a
          href="{cleanBase}/tools"
          class="hover:text-theme-primary transition-colors">Tools</a
        >
        <a
          href="{cleanBase}/sitemap.xml"
          class="hover:text-theme-primary transition-colors">Sitemap</a
        >
        <a
          href="{cleanBase}/llms.txt"
          class="hover:text-theme-primary transition-colors">LLM Docs</a
        >
      </div>
    </div>
  </footer>
</div>
