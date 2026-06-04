<script lang="ts">
  import { base } from "$app/paths";
  import { fade } from "svelte/transition";
  import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
  import { tick, onMount } from "svelte";
  import type { Snippet } from "svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { browser } from "$app/environment";

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
    "name-generator",
  ]);

  let isGenerating = $state(false);
  let generatedData = $state<GeneratorOutput | null>(null);
  let isExampleDraft = $state(true);
  let outputCard = $state<HTMLElement | null>(null);
  let errorMessage = $state<string | null>(null);
  let copied = $state(false);
  let useAI = $state(true);
  let showSaveModal = $state(false);
  let redirectUrl = $state(`${base}/`);

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
                  : "RPG elements",
  );

  const generatedSingular = $derived(
    eyebrow.replace(/\s*Generator\s*/i, "").trim() || "Draft",
  );

  $effect(() => {
    if (browser && isThemeCustomizable && activeThemeId) {
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

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const LABEL_VALUE_HTML =
    '<div class="flex flex-col mb-1"><span class="font-bold text-theme-muted uppercase tracking-wider text-[9px]">$1</span><span>$2</span></div>';

  const renderMarkdown = (value: string) =>
    escapeHtml(value)
      .replace(
        /^#{3} (.*)$/gm,
        '<h3 class="font-header font-bold text-base mt-4 mb-2 text-theme-primary">$1</h3>',
      )
      .replace(
        /^#{2} (.*)$/gm,
        '<h2 class="font-header font-bold text-lg mt-6 mb-3 border-b border-theme-border/40 pb-1">$1</h2>',
      )
      // bold-key variant: "- **Key**: value" or "* **Key**: value"
      .replace(/^[*-] \*\*(.*?)\*\*: (.*)$/gm, LABEL_VALUE_HTML)
      // plain-key variant: "* Key: value" or "- Key: value" (key ≤ 60 chars, no colon in key)
      .replace(/^[*-] ([A-Za-z][^:\n]{0,58}): (.+)$/gm, LABEL_VALUE_HTML)
      // remaining bullets
      .replace(/^[*-] (.*)$/gm, '<li class="list-disc ml-4">$1</li>')
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n\n/g, "<br/><br/>");

  const renderLore = (value: string) =>
    renderMarkdown(value).replace(
      /class="flex flex-col mb-1"/g,
      'class="flex flex-col mb-5"',
    );

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
    if (typeof sessionStorage !== "undefined") {
      const stored = sessionStorage.getItem("__codex_session_drafts");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            sessionDrafts = parsed;
          }
        } catch {
          // ignore
        }
      }
    }
  });

  function saveSessionDrafts(newDrafts: SessionDraft[]) {
    sessionDrafts = newDrafts;
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(
        "__codex_session_drafts",
        JSON.stringify(newDrafts),
      );
    }
  }

  function addToSessionHub() {
    if (!generatedData) return;
    const content = generatedData.summary
      ? `*${generatedData.summary}*\n\n${generatedData.content}`
      : generatedData.content;
    const newDraft: SessionDraft = {
      type: generatedData.type,
      title: generatedData.title,
      content,
      lore: generatedData.lore,
      labels: generatedData.labels,
      status: generatedData.status,
    };

    const exists = sessionDrafts.some(
      (d) => d.title.toLowerCase() === newDraft.title.toLowerCase(),
    );
    if (!exists) {
      saveSessionDrafts([...sessionDrafts, newDraft]);
    }
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
      redirectUrl = `${base}/?utm_source=generator-session-hub&utm_medium=save-all&utm_campaign=seo-funnel`;
      showSaveModal = true;
    } catch {
      errorMessage = "Storage access is blocked. Please copy drafts manually.";
    }
  }

  function handleSaveToCodex() {
    if (!generatedData) return;

    try {
      const content = generatedData.summary
        ? `*${generatedData.summary}*\n\n${generatedData.content}`
        : generatedData.content;
      const payload = {
        type: generatedData.type,
        title: generatedData.title,
        content,
        lore: generatedData.lore,
        labels: generatedData.labels,
        status: generatedData.status,
      };

      localStorage.setItem("__codex_pending_import", JSON.stringify(payload));
      redirectUrl = `${base}/?utm_source=generator-${generatedData.type}&utm_medium=save-to-vault&utm_campaign=seo-funnel`;
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
      generatedData.content,
      "",
      generatedData.lore,
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
  data-world-theme={activeThemeId}
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

  <!-- Compact Explainer / CTA Strip -->
  <div
    class="w-full border-b border-theme-border/30 bg-theme-surface/10 py-5 px-6"
  >
    <div
      class="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div>
        <p
          class="text-xs font-bold text-theme-primary uppercase tracking-widest font-header"
        >
          Generate campaign-ready {generatedNoun} in seconds.
        </p>
        <p
          class="text-[10px] text-theme-text/85 tracking-wider uppercase font-header mt-1"
        >
          No account required. Results save directly to your local Codex vault.
        </p>
      </div>
      <button
        type="button"
        onclick={() => void handleGenerate()}
        disabled={isGenerating}
        aria-busy={isGenerating}
        class="px-4 py-2 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-wider text-[10px] rounded-lg hover:brightness-110 shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
        id="strip-generate-btn"
      >
        {#if isGenerating}
          <span
            class="icon-[lucide--loader-2] animate-spin w-3.5 h-3.5"
            aria-hidden="true"
          ></span>
          Forging...
        {:else}
          <span class="icon-[lucide--dice-5] w-3.5 h-3.5" aria-hidden="true"
          ></span>
          Generate {generatedSingular}
        {/if}
      </button>
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
        class="flex-grow p-6 md:p-8 bg-theme-surface/30 border border-theme-border/60 rounded-2xl shadow-sm flex flex-col min-h-[400px]"
      >
        {#if generatedData}
          <div in:fade={{ duration: 250 }} class="flex flex-col flex-grow">
            <div class="border-b border-theme-border/60 pb-4 mb-6">
              <div class="flex items-start gap-3 flex-wrap">
                <h2
                  class="font-header font-extrabold text-2xl md:text-3xl tracking-wide uppercase text-theme-primary"
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
                <div class="flex gap-2 flex-wrap items-center flex-shrink-0">
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
                    onclick={addToSessionHub}
                    class="px-4 py-2 bg-theme-surface border border-theme-primary/40 text-theme-primary font-bold uppercase font-header tracking-wider text-[10px] rounded-lg hover:bg-theme-primary/10 transition-all flex items-center gap-1.5"
                    id="add-to-hub-btn"
                  >
                    <span class="icon-[lucide--link] w-3.5 h-3.5"></span>
                    Link to Hub
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
            </div>

            <div
              class="space-y-4 text-sm leading-relaxed text-theme-text/90 flex-grow"
              data-theme={worldTheme}
            >
              {@html renderMarkdown(generatedData.content || "")}
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
      <div
        class="p-5 bg-theme-surface/20 border border-theme-border/40 rounded-2xl shadow-sm sticky top-24"
      >
        {#if generatedData}
          <div
            in:fade={{ duration: 250 }}
            class="text-sm leading-relaxed text-theme-text/80"
          >
            {@html renderLore(generatedData.lore || "")}
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
        class="p-5 bg-theme-surface/30 border border-theme-border/60 rounded-2xl shadow-sm mt-6 flex flex-col gap-3 sticky top-[28rem]"
      >
        <div
          class="flex items-center justify-between border-b border-theme-border/60 pb-2"
        >
          <h3
            class="font-header font-bold text-xs uppercase tracking-wider text-theme-primary"
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

    <!-- Parameters Column: rendered last in DOM, positioned on the left on desktop -->
    <div class="lg:col-span-3 space-y-6 order-1 lg:order-1">
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
        <p class="text-sm text-theme-text/70 leading-relaxed mb-4">
          {introText}
        </p>
        <p
          class="text-[9px] text-theme-text/45 uppercase tracking-widest font-header mb-4 flex items-center gap-1.5"
        >
          <span class="icon-[lucide--arrow-right] w-3 h-3"></span>
          Set your inputs — your draft updates to the right
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
          {@render formFields(() => void handleGenerate())}

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
            aria-busy={isGenerating}
            class="w-full py-3 mt-4 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-widest text-xs rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            id="generate-button"
          >
            {#if isGenerating}
              <span
                class="icon-[lucide--loader-2] animate-spin w-4 h-4"
                aria-hidden="true"
              ></span>
              Forging...
            {:else}
              <span class="icon-[lucide--dice-5] w-4 h-4" aria-hidden="true"
              ></span>
              ✦ Generate {generatedSingular} ✦
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
              href="{base}{link.href}"
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
            class="w-full py-3 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-widest text-xs rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
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
