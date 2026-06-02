<script lang="ts">
  import { base } from "$app/paths";
  import type {
    SEOPageData,
    SEOComparisonPageData,
  } from "$lib/config/seo-pages";

  let {
    data,
    type = "solution",
  }: {
    data: SEOPageData | SEOComparisonPageData;
    type?: "solution" | "comparison";
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

  const jsonLdScript = $derived(
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</scr` +
      `ipt>`,
  );

  function toggleFaq(index: number) {
    openFaqIndex = openFaqIndex === index ? null : index;
  }
</script>

<svelte:head>
  <title>{data.title}</title>
  <meta name="description" content={data.description} />
  <meta name="keywords" content={data.keywords.join(", ")} />
  <link
    rel="canonical"
    href="https://codexcryptica.com/{type === 'comparison'
      ? 'vs'
      : 'solutions'}/{data.slug}"
  />
  <link rel="help" href="{base}/llms.txt" />
  {@html jsonLdScript}
</svelte:head>

<div
  class="min-h-screen bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg flex flex-col"
  style:background-image="var(--bg-texture-overlay)"
>
  <!-- Marketing Header -->
  <header
    class="w-full border-b border-theme-border/60 bg-theme-surface/40 backdrop-blur-md px-6 py-4 sticky top-0 z-50"
  >
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <a href="{base}/" class="flex items-center gap-2 group" id="logo-link">
        <span
          class="icon-[lucide--castle] text-theme-primary w-6 h-6 transition-transform group-hover:rotate-12"
        ></span>
        <span
          class="font-header font-bold text-sm uppercase tracking-[0.2em] text-theme-text group-hover:text-theme-primary transition-colors"
        >
          Codex Cryptica
        </span>
      </a>
      <nav
        class="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-widest font-header text-theme-muted"
      >
        <a
          href="{base}/features"
          class="hover:text-theme-primary transition-colors">Features</a
        >
        <a href="{base}/blog" class="hover:text-theme-primary transition-colors"
          >Devlog</a
        >
        <a
          href="{base}/tools/dnd-npc-generator"
          class="hover:text-theme-primary transition-colors">Generators</a
        >
      </nav>
      <div>
        <a
          href="{base}/"
          class="px-5 py-2.5 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-wider text-[10px] rounded-lg hover:brightness-110 shadow-sm transition-all"
          id="nav-cta-btn"
        >
          Open App
        </a>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center flex-grow">
    <div
      class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-theme-primary/10 border border-theme-primary/20 text-theme-primary mb-6 uppercase tracking-wider"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-theme-primary"></span>
      100% Local-First Campaign Wiki
    </div>
    <h1
      class="text-4xl md:text-5xl font-extrabold font-header leading-tight mb-4 tracking-wide"
      id="hero-h1"
    >
      {data.h1}
    </h1>
    <p
      class="text-lg md:text-xl text-theme-primary/80 font-header italic mb-8 max-w-2xl mx-auto"
    >
      {data.subheading}
    </p>
    <p
      class="text-theme-muted text-sm md:text-base leading-relaxed mb-10 max-w-3xl mx-auto"
    >
      {data.introText}
    </p>
    <div class="flex justify-center gap-4">
      <a
        href="{base}/"
        class="px-8 py-3.5 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-widest text-xs rounded-xl shadow-lg hover:brightness-110 hover:-translate-y-0.5 transition-all duration-200"
        id="hero-primary-cta"
      >
        {data.ctaText}
      </a>
    </div>
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
            <p class="text-theme-muted text-xs leading-relaxed">
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
        <div
          class="overflow-x-auto border border-theme-border/60 rounded-2xl shadow-sm"
        >
          <table
            class="w-full text-left border-collapse bg-theme-surface/20"
            id="comparison-table"
          >
            <thead>
              <tr
                class="border-b border-theme-border/60 bg-theme-surface/60 font-header text-xs uppercase tracking-wider"
              >
                <th class="p-4 font-bold">Feature</th>
                <th class="p-4 font-bold text-theme-muted"
                  >{comparisonData.competitorName}</th
                >
                <th class="p-4 font-bold text-theme-primary">Codex Cryptica</th>
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
          class="mt-8 p-6 bg-theme-surface/40 border border-theme-border/60 rounded-2xl shadow-sm text-center"
        >
          <h3
            class="font-header font-bold text-sm uppercase tracking-wider text-theme-primary mb-2"
          >
            The Verdict
          </h3>
          <p class="text-xs leading-relaxed text-theme-muted">
            {comparisonData.verdict}
          </p>
        </div>
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
        Ready to Build Your World?
      </h2>
      <p class="text-theme-muted text-xs leading-relaxed mb-8">
        No account. No server database leaks. Just quick, private, local-first
        worldbuilding.
      </p>
      <a
        href="{base}/"
        class="px-8 py-3.5 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-widest text-xs rounded-xl shadow-lg hover:brightness-110 transition-all"
        id="footer-cta-btn"
      >
        Launch Codex Cryptica
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
          href="{base}/terms"
          class="hover:text-theme-primary transition-colors">Terms</a
        >
        <a
          href="{base}/privacy"
          class="hover:text-theme-primary transition-colors">Privacy</a
        >
        <a
          href="{base}/sitemap.xml"
          class="hover:text-theme-primary transition-colors">Sitemap</a
        >
        <a
          href="{base}/llms.txt"
          class="hover:text-theme-primary transition-colors">LLM Docs</a
        >
      </div>
    </div>
  </footer>
</div>
