<script lang="ts">
  import { base } from "$app/paths";
  const cleanBase = base === "/" ? "" : base;
  import { fade } from "svelte/transition";
  import { safeJsonLd } from "$lib/utils/json-ld";
  import {
    parseObsidianFiles,
    parseJsonExport,
    traverseEntry,
  } from "$lib/services/seo/import-parser";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  const pageData = $derived(data.importPage);

  let isDragging = $state(false);
  const ENTITY_TYPES = [
    "character",
    "creature",
    "location",
    "item",
    "event",
    "faction",
    "note",
  ] as const;

  let filesParsed = $state<
    Array<{ type: string; title: string; content: string; labels: string[] }>
  >([]);
  // ⚡ Bolt Optimization: Calculate stats in a single pass to avoid multiple .filter() array allocations.
  let parseStats = $derived.by(() => {
    let characters = 0;
    let locations = 0;
    let factions = 0;
    let items = 0;
    let others = 0;

    for (const f of filesParsed) {
      if (f.type === "character") characters++;
      else if (f.type === "location" || f.type === "creature") locations++;
      else if (f.type === "faction") factions++;
      else if (f.type === "item") items++;
      else others++;
    }

    return {
      total: filesParsed.length,
      characters,
      locations,
      factions,
      items,
      others,
    };
  });

  let errorMessage = $state<string | null>(null);

  // Drag over handler
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }

  // Handle files select/drop
  async function handleFiles(files: FileList | File[]) {
    errorMessage = null;
    filesParsed = [];
    const list = Array.from(files);

    if (list.length === 0) return;

    try {
      if (pageData.slug === "obsidian-vault") {
        filesParsed = await parseObsidianFiles(list);
      } else {
        // JSON based imports (World Anvil, Kanka, LegendKeeper)
        const jsonFile = list.find((f) => f.name.endsWith(".json"));
        if (!jsonFile) {
          throw new Error(
            "Please upload a valid JSON file for " +
              pageData.competitorName +
              " export.",
          );
        }
        filesParsed = await parseJsonExport(jsonFile, pageData.slug);
      }
    } catch (err: any) {
      errorMessage = err.message || "Failed to parse files.";
    }
  }

  // Handle Drag & Drop Drop
  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    if (!e.dataTransfer) return;

    // Check for directories
    const items = Array.from(e.dataTransfer.items);
    if (items.some((item) => item.webkitGetAsEntry?.()?.isDirectory)) {
      const entryPromises = items.map((item) => {
        const entry = item.webkitGetAsEntry?.();
        return entry ? traverseEntry(entry) : Promise.resolve([]);
      });
      const results = await Promise.all(entryPromises);
      await handleFiles(results.flat());
    } else {
      await handleFiles(e.dataTransfer.files);
    }
  }

  // Saves parsed import package to localStorage and redirects to import handler
  function executeImport() {
    if (filesParsed.length === 0) return;
    try {
      localStorage.setItem(
        "__codex_pending_import",
        JSON.stringify(filesParsed),
      );
      // Redirect to Codex base route with UTM tracking
      window.location.href = `${cleanBase}/?utm_source=importer-${pageData.slug}&utm_medium=landing-page&utm_campaign=seo-funnel`;
    } catch {
      errorMessage =
        "Failed to store import data. Please check localStorage permissions.";
    }
  }

  const pageUrl = $derived(`https://codexcryptica.com/import/${pageData.slug}`);

  // FAQ Schema

  const faqSchema = $derived(
    pageData.faq && pageData.faq.length > 0
      ? safeJsonLd({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: pageData.faq.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: f.answer,
            },
          })),
        })
      : null,
  );

  const softwareApplicationSchema = $derived(
    safeJsonLd({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Codex Cryptica",
      applicationCategory: "GameApplication",
      operatingSystem: "Web",
      url: pageUrl,
      description: pageData.description,
      mainEntity:
        pageData.faq && pageData.faq.length > 0
          ? {
              "@type": "FAQPage",
              mainEntity: pageData.faq.map((f) => ({
                "@type": "Question",
                name: f.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: f.answer,
                },
              })),
            }
          : undefined,
    }),
  );

  // Breadcrumb Schema
  const breadcrumbSchema = $derived(
    safeJsonLd({
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
          name: "Import",
          item: "https://codexcryptica.com/import",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: pageData.h1,
          item: pageUrl,
        },
      ],
    }),
  );
</script>

<svelte:head>
  <title>{pageData.title}</title>
  <meta name="description" content={pageData.description} />
  <meta name="keywords" content={pageData.keywords?.join(", ")} />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href={pageUrl} />
  {#if faqSchema}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html `<scr` + `ipt type="application/ld+json">${faqSchema}</scr` + `ipt>`}
  {/if}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html `<scr` +
    `ipt type="application/ld+json">${softwareApplicationSchema}</scr` +
    `ipt>`}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html `<scr` +
    `ipt type="application/ld+json">${breadcrumbSchema}</scr` +
    `ipt>`}
</svelte:head>

<div
  class="min-h-screen bg-theme-bg text-theme-text font-body flex flex-col"
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
          href="{cleanBase}/?ref=import-nav"
          class="px-5 py-2.5 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-wider text-[10px] rounded-lg hover:brightness-110 shadow-sm transition-all whitespace-nowrap"
          id="nav-cta-btn"
        >
          Open Codex
        </a>
      </div>
    </div>
  </header>

  <main
    class="max-w-4xl mx-auto px-6 py-16 flex-grow w-full flex flex-col justify-center"
  >
    <div class="text-center mb-12">
      <div
        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-medium bg-theme-primary/10 border border-theme-primary/20 text-theme-primary mb-4"
      >
        <span class="icon-[lucide--folder-input] w-3.5 h-3.5" aria-hidden="true"
        ></span>
        Migration Hub
      </div>
      <h1
        class="font-header font-extrabold text-3xl md:text-5xl tracking-wide uppercase text-theme-primary mb-4"
      >
        {pageData.h1}
      </h1>
      <p
        class="text-base md:text-lg text-theme-text/80 leading-relaxed max-w-2xl mx-auto"
      >
        {pageData.subheading}
      </p>
    </div>

    <!-- Features Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      {#each pageData.features as feat}
        <article
          class="p-5 border border-theme-border/60 bg-theme-surface/30 rounded-2xl flex flex-col gap-3"
        >
          <div
            class="w-8 h-8 rounded-lg bg-theme-primary/15 flex items-center justify-center text-theme-primary"
          >
            <span class="{feat.icon} w-4 h-4"></span>
          </div>
          <h3
            class="font-header font-bold text-xs uppercase tracking-wider text-theme-text"
          >
            {feat.title}
          </h3>
          <p class="text-xs text-theme-muted leading-relaxed">
            {feat.description}
          </p>
        </article>
      {/each}
    </div>

    <!-- Drag & Drop Zone -->
    <div
      class="border-2 border-dashed rounded-3xl p-12 text-center transition-all bg-theme-surface/10 flex flex-col items-center justify-center gap-6 min-h-[300px] {isDragging
        ? 'border-theme-primary bg-theme-primary/5'
        : 'border-theme-border'}"
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
      role="region"
      aria-label="File Upload Dropzone"
    >
      <span
        class="icon-[lucide--upload-cloud] text-theme-primary w-16 h-16 opacity-80"
      ></span>

      <div>
        <h3 class="font-header font-bold text-sm uppercase tracking-wider mb-2">
          Drag & Drop {pageData.slug === "obsidian-vault"
            ? "markdown files or vault folders"
            : "your export JSON"} here
        </h3>
        <p
          class="text-[11px] text-theme-muted leading-relaxed max-w-md mx-auto"
        >
          All files are processed client-side in your browser. Your creative
          work never leaves your computer.
        </p>
      </div>

      <div class="flex items-center gap-4">
        <label
          for="file-upload"
          class="px-5 py-2.5 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-wider text-[10px] rounded-lg hover:brightness-110 cursor-pointer shadow-sm transition-all"
        >
          Select File
        </label>
        <input
          type="file"
          id="file-upload"
          class="hidden"
          multiple={pageData.slug === "obsidian-vault"}
          accept={pageData.slug === "obsidian-vault" ? ".md" : ".json"}
          onchange={(e) =>
            e.target && handleFiles((e.target as HTMLInputElement).files || [])}
        />
      </div>

      {#if errorMessage}
        <p class="text-rose-400 text-xs mt-2 font-medium" transition:fade>
          {errorMessage}
        </p>
      {/if}
    </div>

    <!-- Parsed Preview Panel -->
    {#if filesParsed.length > 0}
      <section
        class="mt-8 p-6 bg-theme-surface/35 border border-theme-border/60 rounded-3xl flex flex-col gap-6"
        in:fade
      >
        <div
          class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-theme-border/60 pb-4 gap-4"
        >
          <div>
            <h3
              class="font-header font-bold text-base uppercase tracking-wider text-theme-primary"
            >
              Parsed Preview
            </h3>
            <p
              class="text-[10px] uppercase font-mono tracking-widest text-theme-muted mt-1"
            >
              Review extracted campaign data
            </p>
          </div>
          <button
            type="button"
            onclick={executeImport}
            class="px-5 py-2.5 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-wider text-[10px] rounded-lg hover:brightness-110 shadow-sm transition-all"
          >
            Import {parseStats.total} Entries into Codex
          </button>
        </div>

        <!-- Parse Statistics -->
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div
            class="p-3 bg-theme-surface/20 border border-theme-border/40 rounded-xl"
          >
            <span class="block text-lg font-extrabold text-theme-primary"
              >{parseStats.total}</span
            >
            <span
              class="text-[8px] uppercase tracking-widest text-theme-muted font-header"
              >Total</span
            >
          </div>
          <div
            class="p-3 bg-theme-surface/20 border border-theme-border/40 rounded-xl"
          >
            <span class="block text-lg font-extrabold text-theme-primary"
              >{parseStats.characters}</span
            >
            <span
              class="text-[8px] uppercase tracking-widest text-theme-muted font-header"
              >Characters</span
            >
          </div>
          <div
            class="p-3 bg-theme-surface/20 border border-theme-border/40 rounded-xl"
          >
            <span class="block text-lg font-extrabold text-theme-primary"
              >{parseStats.locations}</span
            >
            <span
              class="text-[8px] uppercase tracking-widest text-theme-muted font-header"
              >Locations</span
            >
          </div>
          <div
            class="p-3 bg-theme-surface/20 border border-theme-border/40 rounded-xl"
          >
            <span class="block text-lg font-extrabold text-theme-primary"
              >{parseStats.factions}</span
            >
            <span
              class="text-[8px] uppercase tracking-widest text-theme-muted font-header"
              >Factions</span
            >
          </div>
          <div
            class="p-3 bg-theme-surface/20 border border-theme-border/40 rounded-xl"
          >
            <span class="block text-lg font-extrabold text-theme-primary"
              >{parseStats.items}</span
            >
            <span
              class="text-[8px] uppercase tracking-widest text-theme-muted font-header"
              >Items</span
            >
          </div>
        </div>

        <!-- Expectation warning -->
        {#if pageData.slug === "world-anvil-export"}
          <div
            class="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300"
          >
            <span
              class="icon-[lucide--triangle-alert] w-4 h-4 shrink-0 mt-0.5"
              aria-hidden="true"
            ></span>
            <span
              >Complex World Anvil formatting — columns, sidebars, and tooltips
              — has been simplified to clean Markdown. Review entries below and
              correct any misdetected types before importing.</span
            >
          </div>
        {/if}

        <!-- Review List -->
        <div
          class="max-h-[400px] overflow-y-auto border border-theme-border/40 bg-theme-bg/60 rounded-2xl p-3 space-y-1.5"
        >
          {#each filesParsed as parsedFile, idx}
            <div
              class="flex items-center gap-2 px-3 py-2 bg-theme-surface/35 border border-theme-border/30 rounded-lg text-xs"
            >
              <!-- Type icon -->
              <span
                class="{parsedFile.type === 'character'
                  ? 'icon-[lucide--user]'
                  : parsedFile.type === 'creature'
                    ? 'icon-[lucide--skull]'
                    : parsedFile.type === 'location'
                      ? 'icon-[lucide--map-pin]'
                      : parsedFile.type === 'faction'
                        ? 'icon-[lucide--flag]'
                        : parsedFile.type === 'item'
                          ? 'icon-[lucide--sparkles]'
                          : parsedFile.type === 'event'
                            ? 'icon-[lucide--calendar]'
                            : 'icon-[lucide--file-text]'} w-4 h-4 text-theme-primary shrink-0"
                aria-hidden="true"
              ></span>

              <!-- Editable title -->
              <input
                type="text"
                class="flex-1 min-w-0 bg-transparent text-theme-text/90 font-medium placeholder-theme-muted focus:outline-none focus:ring-1 focus:ring-theme-primary/40 rounded px-1 py-0.5 truncate"
                bind:value={filesParsed[idx].title}
                aria-label="Entity title"
              />

              <!-- Type select -->
              <select
                class="bg-theme-surface border border-theme-border/40 text-theme-primary text-[10px] font-mono uppercase rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-theme-primary/40 shrink-0"
                bind:value={filesParsed[idx].type}
                aria-label="Entity type"
              >
                {#each ENTITY_TYPES as t}
                  <option value={t}>{t}</option>
                {/each}
              </select>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    {#if pageData.relatedLinks && pageData.relatedLinks.length > 0}
      <section class="border-t border-theme-border/30 py-10">
        <div class="max-w-4xl mx-auto px-6">
          <h2
            class="font-header text-sm uppercase tracking-[0.2em] text-theme-muted mb-6 text-center"
          >
            Related Pages
          </h2>
          <div class="flex flex-wrap justify-center gap-3">
            {#each pageData.relatedLinks as link (link.href)}
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
    {#if pageData.aiTrustSection}
      <section class="border-t border-theme-border/60 mt-16 pt-10 text-center">
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
      </section>
    {/if}

    <!-- FAQ Section -->
    <section class="border-t border-theme-border/60 mt-16 pt-16">
      <h2
        class="font-header font-bold text-xl uppercase tracking-wider text-theme-primary mb-8 text-center"
      >
        Frequently Asked Questions
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {#each pageData.faq as faqItem}
          <article
            class="border border-theme-border/60 bg-theme-surface/30 rounded-2xl p-5"
          >
            <h3
              class="font-header font-bold text-sm uppercase tracking-wider mb-2"
            >
              {faqItem.question}
            </h3>
            <p class="text-sm text-theme-muted leading-relaxed">
              {faqItem.answer}
            </p>
          </article>
        {/each}
      </div>
    </section>
  </main>

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
