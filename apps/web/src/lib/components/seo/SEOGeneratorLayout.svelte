<script lang="ts">
  import { base } from "$app/paths";
  const cleanBase = base === "/" ? "" : base;
  import { fade } from "svelte/transition";
  import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
  import { tick, onMount } from "svelte";
  import type { Snippet } from "svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { browser } from "$app/environment";
  import { safeJsonLd } from "$lib/utils/json-ld";
  import { SESSION_DRAFTS_KEY } from "$lib/services/seo/generators/session-context";
  import { getGeneratorDocumentLayout } from "$lib/components/seo/generator-document-layout";
  import { splitMarkdownForCopy } from "$lib/components/seo/markdown-sections";
  import {
    renderGeneratorMarkdown,
    renderGeneratorLore,
  } from "$lib/components/seo/markdown-renderers";

  let {
    canonicalPath,
    pageTitle = "Free RPG Generator | Codex Cryptica",
    metaDescription = "Generate high-quality detailed campaign drafts using our interactive local-first generators.",
    eyebrow = "Free RPG Tool",
    introTitle = "RPG Generator",
    introText = "Customize options and instantly generate structured drafts to populate your campaign lore database.",
    relatedLinks = [],
    faqs = [],
    theme = $bindable("Classic Fantasy"),
    isThemeCustomizable = false,
    generate,
    formFields,
    worldTheme = "workspace",
    initialDraft = null,
    variant = "default",
    generateLabel = undefined,
    inputHint = "Set your inputs — your draft updates to the right",
    onLinkToHub = undefined,
  }: {
    canonicalPath?: string;
    pageTitle?: string;
    metaDescription?: string;
    eyebrow?: string;
    introTitle?: string;
    introText?: string;
    relatedLinks?: { href: string; label: string }[];
    faqs?: { question: string; answer: string }[];
    theme?: string;
    isThemeCustomizable?: boolean;
    generate: (opts: { useAI: boolean }) => Promise<GeneratorOutput>;
    formFields: Snippet<[() => void]>;
    worldTheme?: string;
    initialDraft?: GeneratorOutput | null;
    variant?: "default" | "names";
    generateLabel?: string;
    inputHint?: string;
    onLinkToHub?: () => void;
  } = $props();

  const HIDDEN_TAGS = new Set([
    "imported-draft",
    "faction-generator",
    "rpg-faction",
    "rpg-npc",
    "npc-generator",
    "rpg-settlement",
    "settlement-generator",
    "rpg-item",
    "item-generator",
    "rpg-quest",
    "quest-generator",
    "rpg-names",
    "fantasy-name",
    "name-generator",
  ]);

  let isGenerating = $state(false);
  let generatedData = $state<GeneratorOutput | null>(null);
  let isExampleDraft = $state(false);

  $effect(() => {
    generatedData = initialDraft;
    isExampleDraft = true;
  });

  let outputCard = $state<HTMLElement | null>(null);
  let errorMessage = $state<string | null>(null);
  let copied = $state(false);
  let copiedSectionId = $state<string | null>(null);
  let useAI = $state(true);
  let showSaveModal = $state(false);
  let redirectUrl = $state(`${cleanBase}/`);

  const themeMap: Record<string, string> = {
    "Classic Fantasy": "fantasy",
    "Cyberpunk / Corporate": "cyberpunk",
    "Vampire / Gothic Noir": "horror",
    "Sci-Fi / Space Opera": "scifi",
    "Modern Conspiracy": "modern",
    "Post-Apocalyptic": "apocalyptic",
  };

  const activeThemeId = $derived(themeMap[theme] || "workspace");

  const generatedNoun = $derived(
    eyebrow.toLowerCase().includes("name")
      ? "fantasy names"
      : eyebrow.toLowerCase().includes("rpg npc")
        ? "RPG NPCs"
        : eyebrow.toLowerCase().includes("npc")
          ? "D&D NPCs"
          : eyebrow.toLowerCase().includes("faction")
            ? "RPG factions"
            : eyebrow.toLowerCase().includes("quest")
              ? "quest hooks"
              : eyebrow.toLowerCase().includes("settlement")
                ? "settlements"
                : eyebrow.toLowerCase().includes("item")
                  ? "magic items"
                  : eyebrow.toLowerCase().includes("pantheon")
                    ? "pantheons"
                    : eyebrow.toLowerCase().includes("deity") ||
                        eyebrow.toLowerCase().includes("god")
                      ? "deities"
                      : "RPG elements",
  );

  const generatedSingular = $derived(
    eyebrow.replace(/\s*Generator\s*/i, "").trim() || "Draft",
  );

  const documentLayout = $derived(getGeneratorDocumentLayout(generatedData));
  const documentSections = $derived(
    variant === "names" ? [] : splitMarkdownForCopy(documentLayout.content),
  );

  $effect(() => {
    if (isThemeCustomizable && browser) {
      if (themeStore.worldThemeId !== activeThemeId) {
        void themeStore.setTheme(activeThemeId);
      }
    }
  });

  $effect(() => {
    if (browser && !generatedData) {
      void handleGenerateOnMount();
    }
  });

  async function handleGenerateOnMount() {
    if (isGenerating || generatedData) return;
    isGenerating = true;
    errorMessage = null;
    try {
      generatedData = await generate({ useAI: false });
    } catch (err: any) {
      console.warn("Failed to generate initial draft:", err);
    } finally {
      isGenerating = false;
    }
  }

  function confirmSaveRedirect() {
    window.location.href = redirectUrl;
  }

  const faqJsonLd = $derived(
    faqs.length > 0
      ? safeJsonLd({
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

  const softwareApplicationJsonLd = $derived(
    safeJsonLd({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Codex Cryptica",
      applicationCategory: "GameApplication",
      operatingSystem: "Web",
      url: canonicalPath
        ? `https://codexcryptica.com${canonicalPath}`
        : "https://codexcryptica.com/tools",
      description: metaDescription,
      mainEntity:
        faqs.length > 0
          ? {
              "@type": "FAQPage",
              mainEntity: faqs.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: faq.answer,
                },
              })),
            }
          : undefined,
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
          name: "Home",
          item: "https://codexcryptica.com",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Generators",
          item: "https://codexcryptica.com/tools",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: introTitle,
          item: canonicalPath
            ? `https://codexcryptica.com${canonicalPath}`
            : "https://codexcryptica.com/tools",
        },
      ],
    }),
  );

  const resultJsonLd = $derived(
    generatedData
      ? generatedData.type === "character"
        ? safeJsonLd({
            "@context": "https://schema.org",
            "@type": "Person",
            name: generatedData.title,
            description:
              generatedData.summary ||
              generatedData.content?.slice(0, 150) ||
              "",
            jobTitle: "Fictional Character",
          })
        : generatedData.type === "location"
          ? safeJsonLd({
              "@context": "https://schema.org",
              "@type": "Place",
              name: generatedData.title,
              description:
                generatedData.summary ||
                generatedData.content?.slice(0, 150) ||
                "",
            })
          : safeJsonLd({
              "@context": "https://schema.org",
              "@type": "CreativeWork",
              name: generatedData.title,
              description:
                generatedData.summary ||
                generatedData.content?.slice(0, 150) ||
                "",
              genre: "Fantasy / RPG Campaign Lore",
            })
      : null,
  );

  async function handleGenerate() {
    isExampleDraft = false;
    isGenerating = true;
    errorMessage = null;
    try {
      generatedData = await generate({ useAI });
      if (browser && window.innerWidth < 1024 && outputCard) {
        await tick();
        outputCard.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (err: any) {
      errorMessage = "Failed to generate: " + (err.message || err);
    } finally {
      isGenerating = false;
    }
  }

  interface SessionDraft {
    type: string;
    title: string;
    content: string;
    lore?: string;
    labels: string[];
    status: string;
  }

  let sessionDrafts = $state<SessionDraft[]>([]);

  onMount(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_DRAFTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          sessionDrafts = parsed;
        }
      }
    } catch {
      // sessionStorage may be blocked (privacy mode) or hold invalid JSON
    }
  });

  function saveSessionDrafts(newDrafts: SessionDraft[]) {
    sessionDrafts = newDrafts;
    try {
      sessionStorage.setItem(SESSION_DRAFTS_KEY, JSON.stringify(newDrafts));
    } catch {
      // sessionStorage may be blocked; hub still works in-memory for this page
    }
  }

  function addToSessionHub() {
    if (!generatedData) return;
    const content = generatedData.summary
      ? `*${generatedData.summary}*\n\n${documentLayout.content}`
      : documentLayout.content;
    const newDraft: SessionDraft = {
      type: generatedData.type,
      title: generatedData.title,
      content,
      lore: documentLayout.lore,
      labels: generatedData.labels,
      status: generatedData.status,
    };

    const exists = sessionDrafts.some(
      (d) => d.title.toLowerCase() === newDraft.title.toLowerCase(),
    );
    if (!exists) {
      saveSessionDrafts([...sessionDrafts, newDraft]);
    }
    onLinkToHub?.();
  }

  function removeFromSessionHub(title: string) {
    saveSessionDrafts(sessionDrafts.filter((d) => d.title !== title));
  }

  function clearSessionHub() {
    saveSessionDrafts([]);
  }

  function handleSaveAllToCodex() {
    if (sessionDrafts.length === 0) return;
    try {
      localStorage.setItem(
        "__codex_pending_import",
        JSON.stringify(sessionDrafts),
      );
      redirectUrl = `${cleanBase}/?utm_source=generator-session-hub&utm_medium=save-all&utm_campaign=seo-funnel`;
      showSaveModal = true;
    } catch {
      errorMessage = "Storage access is blocked. Please copy drafts manually.";
    }
  }

  function handleSaveToCodex() {
    if (!generatedData) return;

    try {
      const content = generatedData.summary
        ? `*${generatedData.summary}*\n\n${documentLayout.content}`
        : documentLayout.content;
      const payload = {
        type: generatedData.type,
        title: generatedData.title,
        content,
        lore: documentLayout.lore,
        labels: generatedData.labels,
        status: generatedData.status,
      };

      localStorage.setItem("__codex_pending_import", JSON.stringify(payload));
      redirectUrl = `${cleanBase}/?utm_source=generator-${generatedData.type}&utm_medium=save-to-vault&utm_campaign=seo-funnel`;
      showSaveModal = true;
    } catch {
      errorMessage =
        "Storage access is blocked. Please copy the Markdown below instead.";
    }
  }

  async function handleCopyMarkdown() {
    if (!generatedData) return;

    const markdownText = [
      `# ${generatedData.title}`,
      generatedData.summary ? `*${generatedData.summary}*` : "",
      `Labels: ${generatedData.labels.join(", ")}`,
      "",
      documentLayout.content,
      "",
      documentLayout.lore,
    ]
      .filter((line) => line !== undefined)
      .join("\n")
      .trim();

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

  async function handleCopySection(sectionId: string, markdown: string) {
    try {
      await navigator.clipboard.writeText(markdown.trim());
      copiedSectionId = sectionId;
      setTimeout(() => {
        if (copiedSectionId === sectionId) copiedSectionId = null;
      }, 1600);
    } catch (err) {
      console.error("Failed to copy section markdown:", err);
    }
  }

  function handleContainerKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      handleContainerClick(event as unknown as MouseEvent);
    }
  }

  function handleContainerClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const copyBtn = target.closest("[data-copy-text]");
    if (copyBtn) {
      const textToCopy = copyBtn.getAttribute("data-copy-text");
      if (textToCopy) {
        navigator.clipboard
          .writeText(textToCopy)
          .then(() => {
            const iconEl = copyBtn.querySelector("span");
            if (iconEl) {
              iconEl.className =
                "icon-[lucide--check] w-3.5 h-3.5 text-green-500 animate-pulse";
              setTimeout(() => {
                if (iconEl) {
                  iconEl.className = "icon-[lucide--copy] w-3.5 h-3.5";
                }
              }, 1500);
            }
          })
          .catch((err) => {
            console.error("Failed to copy text:", err);
          });
      }
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
  <link rel="help" href="{cleanBase}/llms.txt" />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html `<scr` +
    `ipt type="application/ld+json">${softwareApplicationJsonLd}</scr` +
    `ipt>`}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html `<scr` +
    `ipt type="application/ld+json">${breadcrumbJsonLd}</scr` +
    `ipt>`}
  {#if faqJsonLd}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html `<scr` + `ipt type="application/ld+json">${faqJsonLd}</scr` + `ipt>`}
  {/if}
  {#if resultJsonLd}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html `<scr` +
      `ipt type="application/ld+json">${resultJsonLd}</scr` +
      `ipt>`}
  {/if}
</svelte:head>

<div
  class="min-h-screen bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg flex flex-col"
  style:background-image="var(--bg-texture-overlay)"
  data-world-theme={activeThemeId}
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
          href="{cleanBase}/generators"
          class="hover:text-theme-primary transition-colors">Generators</a
        >
      </nav>
      <div class="shrink-0">
        <a
          href="{cleanBase}/"
          class="px-5 py-2.5 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-wider text-[10px] rounded-lg hover:brightness-110 shadow-sm transition-all whitespace-nowrap"
          id="nav-cta-btn"
        >
          Open Codex
        </a>
      </div>
    </div>
  </header>

  <!-- Compact Explainer Strip — no duplicate generate CTA (#1274) -->
  <div class="w-full border-b border-theme-border/30 bg-theme-surface/10 px-6">
    <div class="max-w-6xl mx-auto py-4 flex items-center justify-between gap-4">
      <p
        class="text-xs font-bold text-theme-text/75 uppercase tracking-widest font-header"
      >
        Generate campaign-ready {generatedNoun} in seconds — no account required.
      </p>
      <span
        class="hidden md:inline-flex h-px flex-1 bg-gradient-to-r from-theme-primary/35 via-theme-border/30 to-transparent"
        aria-hidden="true"
      ></span>
    </div>
  </div>

  <div
    class="max-w-6xl mx-auto px-6 py-12 w-full flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8"
  >
    <!-- Output Card Column: controls first on mobile, middle column on desktop -->
    <div
      class="lg:col-span-6 flex flex-col order-2 lg:order-2 scroll-mt-20"
      bind:this={outputCard}
    >
      <div
        class="relative flex-grow p-6 md:p-8 bg-theme-surface/30 border border-theme-border/60 rounded-2xl shadow-sm flex flex-col min-h-[400px]"
      >
        {#if isGenerating}
          <div
            in:fade={{ duration: 150 }}
            class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-theme-bg/70 backdrop-blur-[2px] rounded-2xl"
            role="status"
            aria-live="polite"
          >
            <span
              class="icon-[lucide--loader-2] animate-spin w-10 h-10 text-theme-primary"
              aria-hidden="true"
            ></span>
            <p
              class="font-header font-bold uppercase tracking-widest text-xs text-theme-primary animate-pulse"
            >
              Forging {generatedSingular}...
            </p>
          </div>
        {/if}
        {#if generatedData}
          <div
            in:fade={{ duration: 250 }}
            class="flex flex-col flex-grow transition-opacity duration-300 {isGenerating
              ? 'opacity-40'
              : ''}"
          >
            <div class="border-b border-theme-border/60 pb-4 mb-6">
              <div class="flex items-start gap-3 flex-wrap">
                <h2
                  class="font-header font-bold text-xl md:text-2xl tracking-wide text-theme-text/95"
                >
                  {generatedData.title}
                </h2>
                {#if isExampleDraft}
                  <span
                    class="mt-1.5 px-2 py-0.5 rounded-full border border-theme-border/70 text-theme-text/60 text-[9px] font-mono uppercase tracking-wider flex-shrink-0"
                  >
                    Example
                  </span>
                {/if}
              </div>
              {#if generatedData.summary}
                <p
                  class="text-base text-theme-text/80 leading-relaxed mt-2 italic"
                >
                  {generatedData.summary}
                </p>
              {/if}
              <div
                class="flex flex-wrap items-center justify-between gap-2 mt-3"
              >
                <div class="flex flex-wrap gap-1.5">
                  {#each (generatedData.labels ?? []).filter((l) => !HIDDEN_TAGS.has(l)) as label (label)}
                    <span
                      class="rounded-full border border-theme-border/60 bg-theme-surface/20 px-2 py-0.5 text-[8px] uppercase tracking-wider font-mono font-bold text-theme-text/55"
                    >
                      {label}
                    </span>
                  {/each}
                </div>
                <div
                  class="flex flex-wrap items-center overflow-hidden rounded-lg border border-theme-primary/25 bg-theme-bg/35 shadow-sm"
                  aria-label="Draft actions"
                >
                  {#if variant !== "names"}
                    <button
                      type="button"
                      onclick={handleSaveToCodex}
                      class="px-4 py-2 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-wider text-[10px] hover:brightness-110 transition-all"
                      id="save-to-codex-btn"
                      title="Import this draft into your local Codex Cryptica vault"
                    >
                      Save to Codex
                    </button>
                    <button
                      type="button"
                      onclick={addToSessionHub}
                      class="px-4 py-2 border-l border-theme-primary/25 bg-theme-surface/45 text-theme-primary font-bold uppercase font-header tracking-wider text-[10px] hover:bg-theme-primary/10 transition-all flex items-center gap-1.5"
                      id="add-to-hub-btn"
                      title="Add this draft to the Session Hub to bundle several drafts before exporting"
                    >
                      <span
                        class="icon-[lucide--link] w-3.5 h-3.5"
                        aria-hidden="true"
                      ></span>
                      Link to Hub
                    </button>
                  {/if}
                  <button
                    type="button"
                    onclick={handleCopyMarkdown}
                    class="px-4 py-2 border-l border-theme-primary/25 bg-theme-surface/35 text-theme-text/85 font-bold uppercase font-header tracking-wider text-[10px] hover:bg-theme-surface/70 hover:text-theme-primary transition-all flex items-center gap-1.5"
                    id="copy-markdown-btn"
                    title="Copy this draft as markdown to your clipboard"
                  >
                    <span
                      class="icon-[lucide--copy] w-3.5 h-3.5"
                      aria-hidden="true"
                    ></span>
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            </div>

            <div
              role="none"
              class="seo-md text-sm leading-relaxed text-theme-text/90 flex-grow {variant ===
              'names'
                ? 'md:columns-2 md:gap-x-8 [&_div]:break-inside-avoid [&_div]:mb-4'
                : 'space-y-4'}"
              data-theme={worldTheme}
              onclick={handleContainerClick}
              onkeydown={handleContainerKeydown}
            >
              {#if variant === "names"}
                {@html renderGeneratorMarkdown(documentLayout.content, variant)}
              {:else}
                {#each documentSections as section (section.id)}
                  <article
                    class="group/section rounded-xl border border-transparent transition-colors hover:border-theme-border/35 hover:bg-theme-surface/10"
                  >
                    {#if section.heading}
                      <div
                        class="mb-2 flex items-center justify-between gap-3 border-b border-theme-border/35 pb-2"
                      >
                        <h3
                          class="font-header text-base font-bold text-[color:color-mix(in_srgb,var(--color-primary)_65%,var(--color-text))]"
                        >
                          {section.heading}
                        </h3>
                        <button
                          type="button"
                          onclick={() =>
                            void handleCopySection(
                              section.id,
                              section.markdown,
                            )}
                          class="inline-flex items-center gap-1.5 rounded-full border border-theme-border/60 bg-theme-surface/45 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-theme-text/65 opacity-100 transition-all hover:border-theme-primary/60 hover:text-theme-primary md:opacity-0 md:group-hover/section:opacity-100 md:focus-visible:opacity-100"
                          aria-label="Copy {section.heading} as Markdown"
                          title="Copy this section as Markdown"
                        >
                          <span
                            class={copiedSectionId === section.id
                              ? "icon-[lucide--check] h-3.5 w-3.5"
                              : "icon-[lucide--copy] h-3.5 w-3.5"}
                            aria-hidden="true"
                          ></span>
                          {copiedSectionId === section.id
                            ? "Copied"
                            : "Copy MD"}
                        </button>
                      </div>
                    {/if}
                    <div>
                      {@html renderGeneratorMarkdown(section.body, variant)}
                    </div>
                  </article>
                {/each}
              {/if}
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

    <!-- At the Table Column: rendered third in DOM, positioned on the right on desktop -->
    <div class="lg:col-span-3 order-3 lg:order-3">
      <!-- Mobile label — hidden on lg where the sticky card makes the context clear -->
      <p
        class="lg:hidden text-[10px] font-bold uppercase tracking-widest font-header text-theme-muted mb-2"
      >
        GM Reference
      </p>
      <div class="sticky top-24 flex flex-col gap-6">
        <div
          class="p-5 bg-theme-surface/50 border border-theme-border/50 rounded-2xl shadow-sm backdrop-blur-sm"
        >
          {#if generatedData}
            <div
              in:fade={{ duration: 250 }}
              class="seo-rail seo-md text-sm leading-relaxed text-theme-text/85"
            >
              {@html renderGeneratorLore(documentLayout.lore, variant)}
            </div>
          {:else}
            <div
              class="flex flex-col items-center text-center text-theme-muted/40 py-8"
            >
              <span class="icon-[lucide--scroll] w-8 h-8 mb-3"></span>
              <p class="text-[10px] uppercase tracking-widest font-header">
                At the Table
              </p>
              <p class="text-sm mt-2 leading-relaxed">
                GM utility details appear here after generation.
              </p>
            </div>
          {/if}
        </div>

        <!-- Session Hub Widget -->
        <div
          class="p-5 bg-theme-surface/30 border border-theme-border/60 rounded-2xl shadow-sm flex-col gap-3 {variant ===
          'names'
            ? 'hidden'
            : 'flex'}"
        >
          <div
            class="flex items-center justify-between border-b border-theme-border/60 pb-2"
          >
            <h3
              class="font-header font-bold text-xs uppercase tracking-wider text-theme-text/70"
            >
              Session Hub
            </h3>
            {#if sessionDrafts.length > 0}
              <button
                type="button"
                onclick={clearSessionHub}
                class="text-[9px] uppercase font-bold text-rose-400 hover:text-rose-300"
              >
                Clear
              </button>
            {/if}
          </div>
          {#if sessionDrafts.length === 0}
            <p class="text-[10px] text-theme-muted leading-relaxed">
              Generate drafts and click "Link to Hub" to build a connected
              campaign vault before exporting.
            </p>
          {:else}
            <ul class="space-y-2 max-h-[200px] overflow-y-auto">
              {#each sessionDrafts as draft (draft.title)}
                <li
                  class="flex items-center justify-between gap-2 p-2 bg-theme-surface/45 border border-theme-border/30 rounded-lg text-xs"
                >
                  <span
                    class="truncate font-medium text-theme-text/90 flex items-center gap-1.5"
                  >
                    {#if draft.type === "character"}
                      <span
                        class="icon-[lucide--user] w-3.5 h-3.5 text-theme-primary"
                      ></span>
                    {:else if draft.type === "faction"}
                      <span
                        class="icon-[lucide--flag] w-3.5 h-3.5 text-theme-primary"
                      ></span>
                    {:else if draft.type === "settlement" || draft.type === "location"}
                      <span
                        class="icon-[lucide--map-pin] w-3.5 h-3.5 text-theme-primary"
                      ></span>
                    {:else if draft.type === "item"}
                      <span
                        class="icon-[lucide--sparkles] w-3.5 h-3.5 text-theme-primary"
                      ></span>
                    {:else}
                      <span
                        class="icon-[lucide--file-text] w-3.5 h-3.5 text-theme-primary"
                      ></span>
                    {/if}
                    {draft.title}
                  </span>
                  <button
                    type="button"
                    onclick={() => removeFromSessionHub(draft.title)}
                    class="text-theme-muted hover:text-rose-400 transition-colors flex-shrink-0"
                    aria-label="Remove draft"
                  >
                    <span class="icon-[lucide--trash-2] w-3.5 h-3.5"></span>
                  </button>
                </li>
              {/each}
            </ul>
            <button
              type="button"
              onclick={handleSaveAllToCodex}
              class="w-full py-2 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-wider text-[10px] rounded-lg hover:brightness-110 shadow-sm transition-all text-center mt-1"
            >
              Save Hub to Codex ({sessionDrafts.length})
            </button>
          {/if}
        </div>
      </div>
    </div>

    <!-- Parameters Column: rendered last in DOM, positioned on the left on desktop -->
    <div class="lg:col-span-3 space-y-6 order-1 lg:order-1">
      <div
        class="p-6 bg-theme-surface/40 border border-theme-border/60 rounded-2xl shadow-sm"
      >
        <a
          href="{cleanBase}/generators"
          class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest font-header text-theme-muted hover:text-theme-primary transition-colors mb-3"
        >
          <span class="icon-[lucide--arrow-left] w-3 h-3" aria-hidden="true"
          ></span>
          All generators
        </a>
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
        <p class="text-sm text-theme-text/70 leading-relaxed mb-4">
          {introText}
        </p>
        {#if inputHint}
          <p
            class="text-[9px] text-theme-text/45 uppercase tracking-widest font-header mb-5 flex items-center gap-1.5"
          >
            <span class="icon-[lucide--arrow-right] w-3 h-3"></span>
            {inputHint}
          </p>
        {/if}

        <form
          class="space-y-4"
          action={canonicalPath ? `${cleanBase}${canonicalPath}` : undefined}
          method={canonicalPath ? "GET" : undefined}
          onsubmit={(event) => {
            event.preventDefault();
            void handleGenerate();
          }}
        >
          {@render formFields(() => void handleGenerate())}

          <button
            type="submit"
            disabled={isGenerating}
            aria-busy={isGenerating}
            class="w-full py-3 mt-4 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-widest text-xs rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            id="generate-button"
            title="Generate a new draft using your current form inputs"
          >
            {#if isGenerating}
              <span
                class="icon-[lucide--loader-2] animate-spin w-4 h-4"
                aria-hidden="true"
              ></span>
              Forging...
            {:else}
              {generateLabel ?? `Generate ${generatedSingular}`}
            {/if}
          </button>

          <div class="flex flex-col gap-1 pt-1">
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                id="ai-toggle"
                bind:checked={useAI}
                aria-describedby="ai-toggle-hint"
                class="w-4 h-4 rounded border-theme-border/60 bg-theme-bg/60 text-theme-primary focus:ring-theme-primary/40 focus:outline-none flex-shrink-0"
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
            <p
              id="ai-toggle-hint"
              class="text-[9px] text-theme-muted/70 leading-snug pl-6"
            >
              {useAI
                ? "AI writes unique, rich lore on each generate."
                : "Fast offline mode — local tables only, no AI."}
            </p>
          </div>
        </form>

        {#if errorMessage}
          <div
            class="mt-4 p-3 border border-red-500/30 bg-red-500/10 rounded-xl text-red-400 text-xs"
          >
            {errorMessage}
          </div>
        {/if}

        <!-- Related links moved to bottom discover section -->
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

  {#if relatedLinks.length > 0}
    <section
      class="border-t border-theme-border/40 px-6 py-12 text-center bg-theme-surface/5"
    >
      <div class="max-w-4xl mx-auto">
        <h2
          class="font-header font-bold text-xs uppercase tracking-widest text-theme-muted mb-6"
        >
          More RPG Worldbuilding Tools
        </h2>
        <div class="flex flex-wrap justify-center gap-3">
          {#each relatedLinks as link (link.href)}
            <a
              href="{cleanBase}{link.href}"
              class="px-4 py-2 bg-theme-surface/30 border border-theme-border/40 hover:border-theme-primary/60 text-xs font-bold uppercase tracking-wider text-theme-text rounded-full shadow-sm hover:bg-theme-surface/50 transition-all flex items-center gap-1.5"
            >
              <span>{link.label}</span>
              <span
                class="icon-[lucide--arrow-right] w-3.5 h-3.5"
                aria-hidden="true"
              ></span>
            </a>
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- Save to Codex Transition Modal -->
  {#if showSaveModal}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      transition:fade={{ duration: 150 }}
    >
      <div
        class="bg-theme-surface border border-theme-border max-w-md w-full p-6 rounded-2xl shadow-xl flex flex-col gap-4 text-center animate-in fade-in zoom-in-95 duration-200"
      >
        <div
          class="mx-auto w-12 h-12 rounded-full bg-theme-primary/10 border border-theme-primary/30 flex items-center justify-center text-theme-primary mb-2"
        >
          <span class="icon-[lucide--check-circle-2] w-6 h-6"></span>
        </div>

        <h3
          class="font-header font-bold text-xl uppercase tracking-wider text-theme-primary"
        >
          Saved to your local Codex vault.
        </h3>

        <p class="text-sm text-theme-text/70 leading-relaxed">
          Open Codex to link this faction to NPCs, locations, maps, and campaign
          notes. Your vault lives in the browser — no account, no sync, no
          cloud.
        </p>

        <div class="flex flex-col gap-2 mt-4">
          <button
            type="button"
            onclick={confirmSaveRedirect}
            class="w-full py-3 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-widest text-xs rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <span class="icon-[lucide--external-link] w-4 h-4"></span>
            Open Codex
          </button>

          <button
            type="button"
            onclick={() => {
              showSaveModal = false;
            }}
            class="w-full py-3 bg-theme-surface/50 border border-theme-border/60 text-theme-text font-bold uppercase font-header tracking-widest text-xs rounded-xl hover:bg-theme-surface transition-all"
          >
            Back to Generator
          </button>
        </div>
      </div>
    </div>
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

<style>
  .seo-md :global(h2) {
    font-family: var(--font-header);
    font-weight: 700;
    font-size: 1.125rem;
    margin: 1.5rem 0 0.75rem;
    border-bottom: 1px solid
      color-mix(in srgb, var(--color-border) 40%, transparent);
    padding-bottom: 0.25rem;
  }
  /* Desaturated heading — primary actions keep saturated red (#1272) */
  .seo-md :global(h3) {
    font-family: var(--font-header);
    font-weight: 700;
    font-size: 1rem;
    margin: 1rem 0 0.5rem;
    color: color-mix(in srgb, var(--color-primary) 65%, var(--color-text));
  }
  .seo-md :global(ul) {
    list-style: disc;
    margin-left: 1rem;
  }
  .seo-md :global(p) {
    margin-bottom: 0.75rem;
  }
  .seo-md :global(.seo-label) {
    text-shadow: 0 0 10px
      color-mix(in srgb, var(--color-primary) 70%, transparent);
    filter: brightness(1.2);
  }
  /* Rail stat block — compact heading scale, muted palette (#1276) */
  .seo-rail.seo-md :global(.seo-label) {
    color: color-mix(in srgb, var(--color-primary) 42%, var(--color-text));
    text-shadow: none;
    filter: none;
  }
  .seo-rail.seo-md :global(h3) {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: color-mix(in srgb, var(--color-text) 82%, transparent);
    margin: 0.875rem 0 0.375rem;
    border-bottom: none;
  }
  .seo-rail.seo-md :global(h2) {
    font-size: 0.8125rem;
    border-bottom: 1px solid
      color-mix(in srgb, var(--color-border) 30%, transparent);
    margin: 1rem 0 0.5rem;
    color: color-mix(in srgb, var(--color-text) 88%, transparent);
  }
  .seo-rail.seo-md :global(strong) {
    color: color-mix(in srgb, var(--color-text) 92%, transparent);
  }
</style>
