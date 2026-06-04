<script lang="ts">
  import { base } from "$app/paths";
  import { fade } from "svelte/transition";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  const pageData = $derived(data.importPage);

  let isDragging = $state(false);
  let filesParsed = $state<
    Array<{ type: string; title: string; content: string; labels: string[] }>
  >([]);
  let parseStats = $derived({
    total: filesParsed.length,
    characters: filesParsed.filter((f) => f.type === "character").length,
    locations: filesParsed.filter(
      (f) => f.type === "location" || f.type === "creature",
    ).length,
    factions: filesParsed.filter((f) => f.type === "faction").length,
    items: filesParsed.filter((f) => f.type === "item").length,
    others: filesParsed.filter(
      (f) =>
        !["character", "location", "creature", "faction", "item"].includes(
          f.type,
        ),
    ).length,
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
        await parseObsidianFiles(list);
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
        await parseJsonExport(jsonFile, pageData.slug);
      }
    } catch (err: any) {
      errorMessage = err.message || "Failed to parse files.";
    }
  }

  // HTML to markdown converter
  function cleanHtml(html: string): string {
    if (!html) return "";
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<p>/gi, "")
      .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
      .replace(/<em>(.*?)<\/em>/gi, "*$1*")
      .replace(
        /<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi,
        "[$2]($1)",
      )
      .replace(/<[^>]*>/g, ""); // strip remaining tags
  }

  // Parses Obsidian vault files (.md)
  async function parseObsidianFiles(files: File[]) {
    const mdFiles = files.filter((f) => f.name.endsWith(".md"));
    if (mdFiles.length === 0) {
      throw new Error(
        "No Markdown (.md) files found. Please select or drop markdown files.",
      );
    }

    const parsed: typeof filesParsed = [];
    for (const file of mdFiles) {
      const text = await file.text();
      let title = file.name.replace(/\.md$/, "");
      let content = text;
      let type = "note";
      let labels = ["obsidian-import"];

      // Simple Frontmatter Extraction
      const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (fmMatch) {
        content = text.slice(fmMatch[0].length).trim();
        const lines = fmMatch[1].split("\n");
        for (const line of lines) {
          const colonIdx = line.indexOf(":");
          if (colonIdx !== -1) {
            const key = line.slice(0, colonIdx).trim().toLowerCase();
            const val = line
              .slice(colonIdx + 1)
              .trim()
              .replace(/^['"]|['"]$/g, "");
            if (key === "title") title = val;
            if (key === "type") {
              const cleanType = val.toLowerCase();
              if (
                [
                  "character",
                  "creature",
                  "location",
                  "item",
                  "event",
                  "faction",
                  "note",
                ].includes(cleanType)
              ) {
                type = cleanType;
              }
            }
            if (key === "tags" || key === "labels") {
              const tags = val
                .replaceAll("[", "")
                .replaceAll("]", "")
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);
              labels.push(...tags);
            }
          }
        }
      }

      parsed.push({ type, title, content, labels });
    }
    filesParsed = parsed;
  }

  // Parses JSON formats client-side
  async function parseJsonExport(file: File, slug: string) {
    const text = await file.text();
    const data = JSON.parse(text);
    const parsed: typeof filesParsed = [];

    if (slug === "world-anvil-export") {
      // WA backup JSON structure is often an array or { articles: [...] }
      const articles = Array.isArray(data)
        ? data
        : data.articles || Object.values(data);
      for (const item of articles) {
        if (!item || typeof item !== "object") continue;
        const title = item.title || item.name || "Untitled Article";
        const body = cleanHtml(
          item.body || item.content || item.content_parsed || "",
        );
        let type = "note";
        const template = String(item.template || "").toLowerCase();
        if (template.includes("character") || template.includes("person"))
          type = "character";
        else if (
          template.includes("location") ||
          template.includes("settlement")
        )
          type = "location";
        else if (template.includes("item") || template.includes("weapon"))
          type = "item";
        else if (
          template.includes("organization") ||
          template.includes("faction")
        )
          type = "faction";

        parsed.push({
          type,
          title,
          content: body,
          labels: ["world-anvil-import", template].filter(Boolean),
        });
      }
    } else if (slug === "kanka-json") {
      // Kanka campaign exports
      const entities =
        data.entities || (Array.isArray(data) ? data : Object.values(data));
      for (const item of entities) {
        if (!item || typeof item !== "object") continue;
        const title = item.name || "Untitled Entity";
        const body = cleanHtml(
          item.entry || item.entry_parsed || item.history || "",
        );
        let type = "note";
        const kankaType = String(item.type || "").toLowerCase();
        if (kankaType === "character") type = "character";
        else if (kankaType === "location") type = "location";
        else if (kankaType === "item") type = "item";
        else if (kankaType === "organisation" || kankaType === "faction")
          type = "faction";

        parsed.push({
          type,
          title,
          content: body,
          labels: ["kanka-import", kankaType].filter(Boolean),
        });
      }
    } else if (slug === "legendkeeper-json") {
      // LegendKeeper JSON schema
      const pages =
        data.pages ||
        data.documents ||
        (Array.isArray(data) ? data : Object.values(data));
      for (const item of pages) {
        if (!item || typeof item !== "object") continue;
        const title = item.name || item.title || "Untitled Page";
        const rawContent = item.content || item.blocks || "";
        const body =
          typeof rawContent === "string"
            ? rawContent
            : JSON.stringify(rawContent);

        parsed.push({
          type: "note",
          title,
          content: body,
          labels: ["legendkeeper-import"],
        });
      }
    }

    if (parsed.length === 0) {
      throw new Error(
        "No importable articles or pages found in the JSON backup.",
      );
    }
    filesParsed = parsed;
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

  // Helper to recursively fetch files from entries
  async function traverseEntry(entry: any): Promise<File[]> {
    return new Promise((resolve) => {
      if (entry.isFile) {
        entry.file((file: File) => resolve([file]));
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const read = () => {
          reader.readEntries(async (entries: any[]) => {
            if (entries.length === 0) {
              resolve([]);
            } else {
              const promises = entries.map((e) => traverseEntry(e));
              const res = await Promise.all(promises);
              resolve(res.flat());
            }
          });
        };
        read();
      } else {
        resolve([]);
      }
    });
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
      window.location.href = `${base}/?utm_source=importer-${pageData.slug}&utm_medium=landing-page&utm_campaign=seo-funnel`;
    } catch {
      errorMessage =
        "Failed to store import data. Please check localStorage permissions.";
    }
  }

  // Generate JSON-LD Structured Data
  const jsonLd = $derived({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Codex Cryptica",
    applicationCategory: "GameApplication",
    operatingSystem: "Web, Windows, macOS, Linux",
    description: pageData.description,
    offers: {
      "@type": "Offer",
      price: "0.00",
      priceCurrency: "USD",
    },
    mainEntity: {
      "@type": "FAQPage",
      mainEntity: pageData.faq.map((f) => ({
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

  const breadcrumb = $derived({
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
        item: `https://codexcryptica.com/import/${pageData.slug}`,
      },
    ],
  });

  const breadcrumbScript = $derived(
    `<script type="application/ld+json">${JSON.stringify(breadcrumb)}</scr` +
      `ipt>`,
  );
</script>

<svelte:head>
  <title>{pageData.title}</title>
  <meta name="description" content={pageData.description} />
  <meta name="robots" content="index, follow" />
  <link
    rel="canonical"
    href="https://codexcryptica.com/import/{pageData.slug}"
  />
  {@html jsonLdScript}
  {@html breadcrumbScript}
</svelte:head>

<div
  class="min-h-screen bg-theme-bg text-theme-text font-body flex flex-col"
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

        <!-- Preview Tree List -->
        <div
          class="max-h-[300px] overflow-y-auto border border-theme-border/40 bg-theme-bg/60 rounded-2xl p-4"
        >
          <ul class="space-y-2">
            {#each filesParsed.slice(0, 50) as parsedFile}
              <li
                class="flex items-center justify-between p-2 bg-theme-surface/35 border border-theme-border/30 rounded-lg text-xs"
              >
                <span
                  class="font-medium text-theme-text/90 flex items-center gap-2 truncate"
                >
                  {#if parsedFile.type === "character"}
                    <span class="icon-[lucide--user] w-4 h-4 text-theme-primary"
                    ></span>
                  {:else if parsedFile.type === "location"}
                    <span
                      class="icon-[lucide--map-pin] w-4 h-4 text-theme-primary"
                    ></span>
                  {:else if parsedFile.type === "faction"}
                    <span class="icon-[lucide--flag] w-4 h-4 text-theme-primary"
                    ></span>
                  {:else if parsedFile.type === "item"}
                    <span
                      class="icon-[lucide--sparkles] w-4 h-4 text-theme-primary"
                    ></span>
                  {:else}
                    <span
                      class="icon-[lucide--file-text] w-4 h-4 text-theme-primary"
                    ></span>
                  {/if}
                  {parsedFile.title}
                </span>
                <span
                  class="text-[8px] font-mono uppercase bg-theme-primary/10 border border-theme-primary/20 text-theme-primary px-1.5 py-0.5 rounded-full flex-shrink-0"
                >
                  {parsedFile.type}
                </span>
              </li>
            {/each}
            {#if filesParsed.length > 50}
              <li
                class="text-center text-[10px] text-theme-muted py-2 border-t border-theme-border/20"
              >
                And {filesParsed.length - 50} more entries...
              </li>
            {/if}
          </ul>
        </div>
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
          href="{base}/terms"
          class="hover:text-theme-primary transition-colors">Terms</a
        >
        <a
          href="{base}/privacy"
          class="hover:text-theme-primary transition-colors">Privacy</a
        >
        <a
          href="{base}/tools"
          class="hover:text-theme-primary transition-colors">Tools</a
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
