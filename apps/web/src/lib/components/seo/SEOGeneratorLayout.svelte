<script lang="ts">
  import { base } from "$app/paths";
  import { fade } from "svelte/transition";
  import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
  import type { Snippet } from "svelte";

  let {
    canonicalPath,
    pageTitle = "Free RPG Generator | Codex Cryptica",
    metaDescription = "Generate high-quality detailed campaign drafts using our interactive local-first generators.",
    eyebrow = "Free RPG Tool",
    introTitle = "RPG Generator",
    introText = "Customize options and instantly generate structured drafts to populate your campaign lore database.",
    relatedLinks = [],
    faqs = [],
    generate,
    formFields,
    worldTheme = "workspace",
  }: {
    canonicalPath?: string;
    pageTitle?: string;
    metaDescription?: string;
    eyebrow?: string;
    introTitle?: string;
    introText?: string;
    relatedLinks?: { href: string; label: string }[];
    faqs?: { question: string; answer: string }[];
    generate: (opts: { useAI: boolean }) => Promise<GeneratorOutput>;
    formFields: Snippet;
    worldTheme?: string;
  } = $props();

  let isGenerating = $state(false);
  let generatedData = $state<GeneratorOutput | null>(null);
  let errorMessage = $state<string | null>(null);
  let copied = $state(false);
  let useAI = $state(true);

  const faqJsonLd = $derived(
    faqs.length > 0
      ? JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        })
      : "",
  );

  async function handleGenerate() {
    isGenerating = true;
    errorMessage = null;
    try {
      generatedData = await generate({ useAI });
    } catch (err: any) {
      errorMessage = "Failed to generate: " + (err.message || err);
    } finally {
      isGenerating = false;
    }
  }

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const renderMarkdown = (value: string) =>
    escapeHtml(value)
      .replace(
        /^### (.*)$/gm,
        '<h3 class="font-header font-bold text-base mt-4 mb-2 text-theme-primary">$1</h3>',
      )
      .replace(
        /^## (.*)$/gm,
        '<h2 class="font-header font-bold text-lg mt-6 mb-3 border-b border-theme-border/40 pb-1">$1</h2>',
      )
      .replace(
        /^- \*\*(.*?)\*\*: (.*)$/gm,
        '<div class="flex flex-col mb-1"><span class="font-bold text-theme-muted uppercase tracking-wider text-[9px]">$1</span><span>$2</span></div>',
      )
      .replace(/^- (.*)$/gm, '<li class="list-disc ml-4">$1</li>')
      .replace(/\n\n/g, "<br/><br/>");

  function handleSaveToCodex() {
    if (!generatedData) return;

    try {
      const payload = {
        type: generatedData.type,
        title: generatedData.title,
        content: generatedData.content,
        lore: generatedData.lore,
        labels: generatedData.labels,
        status: generatedData.status,
      };

      localStorage.setItem("__codex_pending_import", JSON.stringify(payload));
      window.location.href = `${base}/`;
    } catch {
      errorMessage =
        "Storage access is blocked. Please copy the Markdown below instead.";
    }
  }

  async function handleCopyMarkdown() {
    if (!generatedData) return;

    const markdownText = `# ${generatedData.title}
Labels: ${generatedData.labels.join(", ")}

${generatedData.content}

${generatedData.lore}`;

    try {
      await navigator.clipboard.writeText(markdownText);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy markdown:", err);
    }
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={metaDescription} />
  <meta name="robots" content="index, follow" />
  {#if canonicalPath}
    <link rel="canonical" href="https://codexcryptica.com{canonicalPath}" />
  {/if}
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Codex Cryptica" />
  <meta property="og:title" content={pageTitle} />
  <meta property="og:description" content={metaDescription} />
  {#if canonicalPath}
    <meta
      property="og:url"
      content="https://codexcryptica.com{canonicalPath}"
    />
  {/if}
  <meta property="og:image" content="https://codexcryptica.com/logo.png" />
  <meta property="og:image:width" content="1024" />
  <meta property="og:image:height" content="1024" />
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content={pageTitle} />
  <meta name="twitter:description" content={metaDescription} />
  <meta name="twitter:image" content="https://codexcryptica.com/logo.png" />
  <link rel="help" href="{base}/llms.txt" />
  {#if faqJsonLd}
    {@html `<script type="application/ld+json">${faqJsonLd}</` + "script>"}
  {/if}
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

  <div
    class="max-w-6xl mx-auto px-6 py-12 w-full flex-grow grid grid-cols-1 lg:grid-cols-12 gap-10"
  >
    <!-- Output Card Column: rendered first in DOM for correct mobile reading/focus order, positioned on the right on desktop -->
    <div class="lg:col-span-8 flex flex-col lg:order-2">
      <div
        class="flex-grow p-6 md:p-8 bg-theme-surface/30 border border-theme-border/60 rounded-2xl shadow-sm flex flex-col min-h-[400px]"
      >
        {#if generatedData}
          <div in:fade={{ duration: 250 }} class="flex flex-col flex-grow">
            <div
              class="border-b border-theme-border/60 pb-4 mb-6 flex flex-wrap items-center justify-between gap-4"
            >
              <div>
                <h2
                  class="font-header font-extrabold text-2xl md:text-3xl tracking-wide uppercase text-theme-primary"
                >
                  {generatedData.title}
                </h2>
                <div class="flex gap-2 mt-2">
                  {#each generatedData.labels as label (label)}
                    <span
                      class="rounded-full border border-theme-primary/20 bg-theme-primary/10 px-2.5 py-0.5 text-[9px] uppercase tracking-wider font-mono font-bold text-theme-primary"
                    >
                      {label}
                    </span>
                  {/each}
                </div>
              </div>
              <div class="flex gap-2">
                <button
                  type="button"
                  onclick={handleSaveToCodex}
                  class="px-4 py-2 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-wider text-[10px] rounded-lg hover:brightness-110 shadow-sm transition-all"
                  id="save-to-codex-btn"
                >
                  Save to Codex
                </button>
                <button
                  type="button"
                  onclick={handleCopyMarkdown}
                  class="px-4 py-2 bg-theme-surface border border-theme-border/80 text-theme-text font-bold uppercase font-header tracking-wider text-[10px] rounded-lg hover:border-theme-primary/60 transition-all flex items-center gap-1.5"
                  id="copy-markdown-btn"
                >
                  <span class="icon-[lucide--copy] w-3.5 h-3.5"></span>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div
              class="grid grid-cols-1 md:grid-cols-12 gap-8 flex-grow"
              data-theme={worldTheme}
            >
              <div
                class="md:col-span-7 space-y-4 text-xs md:text-sm leading-relaxed text-theme-text/90"
              >
                {@html renderMarkdown(generatedData.content)}
              </div>

              <div
                class="md:col-span-5 p-4 border border-theme-border/60 bg-theme-bg/40 rounded-xl space-y-4"
              >
                <h4
                  class="font-header font-bold text-xs uppercase tracking-widest text-theme-primary"
                >
                  GM Stats & Info
                </h4>
                <div class="text-xs space-y-3 leading-relaxed">
                  {@html renderMarkdown(generatedData.lore)}
                </div>
              </div>
            </div>
          </div>
        {:else}
          <div
            in:fade={{ duration: 150 }}
            class="flex flex-col items-center justify-center flex-grow text-center text-theme-muted max-w-sm mx-auto"
          >
            <span
              class="icon-[lucide--swords] text-theme-muted/30 w-16 h-16 mb-4"
            ></span>
            <h3
              class="font-header font-bold text-sm uppercase tracking-widest mb-2"
            >
              No Draft Generated
            </h3>
            <p class="text-[11px] leading-relaxed">
              Use the sidebar generator control panel to customize parameters,
              then trigger the generation engine to forge details.
            </p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Parameters Column: rendered second in DOM, positioned on the left on desktop -->
    <div class="lg:col-span-4 space-y-6 lg:order-1">
      <div
        class="p-6 bg-theme-surface/40 border border-theme-border/60 rounded-2xl shadow-sm"
      >
        <div
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-medium bg-theme-primary/10 border border-theme-primary/20 text-theme-primary mb-4"
        >
          <span
            class="icon-[lucide--wand-sparkles] w-3.5 h-3.5"
            aria-hidden="true"
          ></span>
          {eyebrow}
        </div>
        <h1
          class="font-header font-bold text-lg uppercase tracking-wider text-theme-primary mb-4"
          id="generator-title"
        >
          {introTitle}
        </h1>
        <p class="text-xs text-theme-muted leading-relaxed mb-6">
          {introText}
        </p>

        <form
          class="space-y-4"
          action={canonicalPath ? `${base}${canonicalPath}` : undefined}
          method={canonicalPath ? "GET" : undefined}
          onsubmit={(event) => {
            event.preventDefault();
            void handleGenerate();
          }}
        >
          {@render formFields()}

          <div class="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="ai-toggle"
              bind:checked={useAI}
              class="w-4 h-4 rounded border-theme-border/60 bg-theme-bg/60 text-theme-primary focus:ring-theme-primary/40 focus:outline-none"
            />
            <label
              for="ai-toggle"
              class="text-[10px] font-bold uppercase tracking-wider text-theme-muted cursor-pointer flex items-center gap-1"
            >
              <span
                class="icon-[lucide--sparkles] text-theme-primary w-3.5 h-3.5"
              ></span>
              AI Lore Co-Author Mode
            </label>
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            class="w-full py-3 mt-4 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-widest text-xs rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            id="generate-button"
          >
            {#if isGenerating}
              <span class="icon-[lucide--loader-2] animate-spin w-4 h-4"></span>
              Forging Lore...
            {:else}
              <span class="icon-[lucide--dice-5] w-4 h-4"></span>
              ✦ Generate RPG Draft ✦
            {/if}
          </button>
        </form>

        {#if errorMessage}
          <div
            class="mt-4 p-3 border border-red-500/30 bg-red-500/10 rounded-xl text-red-400 text-xs"
          >
            {errorMessage}
          </div>
        {/if}

        {#if relatedLinks.length > 0}
          <div
            class="mt-5 border-t border-theme-border/60 pt-4 flex flex-col gap-2"
            aria-label="Related pages"
          >
            {#each relatedLinks as link (link.href)}
              <a
                href="{base}{link.href}"
                class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-theme-muted hover:text-theme-primary transition-colors"
              >
                <span
                  class="icon-[lucide--arrow-right] w-3.5 h-3.5"
                  aria-hidden="true"
                ></span>
                {link.label}
              </a>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>

  {#if faqs.length > 0}
    <section class="border-t border-theme-border/60 px-6 py-12">
      <div class="max-w-4xl mx-auto">
        <h2
          class="font-header font-bold text-xl uppercase tracking-wider text-theme-primary mb-6"
        >
          {introTitle} FAQ
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          {#each faqs as faq (faq.question)}
            <article
              class="border border-theme-border/60 bg-theme-surface/30 rounded-xl p-5"
            >
              <h3
                class="font-header font-bold text-sm uppercase tracking-wider mb-2"
              >
                {faq.question}
              </h3>
              <p class="text-sm text-theme-muted leading-relaxed">
                {faq.answer}
              </p>
            </article>
          {/each}
        </div>
      </div>
    </section>
  {/if}

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
