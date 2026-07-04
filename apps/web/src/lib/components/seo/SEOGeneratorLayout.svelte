<script lang="ts">
  import { base } from "$app/paths";
  const cleanBase = base === "/" ? "" : base;
  import { fade } from "svelte/transition";
  import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
  import { tick } from "svelte";
  import type { Snippet } from "svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { onlineStatus } from "$lib/stores/online.svelte";
  import { browser } from "$app/environment";
  import { getGeneratorDocumentLayout } from "$lib/components/seo/generator-document-layout";
  import { splitMarkdownForCopy } from "$lib/components/seo/markdown-sections";
  import { renderGeneratorLore } from "$lib/components/seo/markdown-renderers";
  import { sessionHubStore } from "$lib/stores/session-hub.svelte";
  import ProvenanceBadge from "./ProvenanceBadge.svelte";
  import GeneratorSwitcherMenu from "./GeneratorSwitcherMenu.svelte";
  import FaqSection from "./FaqSection.svelte";
  import RelatedLinksSection from "./RelatedLinksSection.svelte";
  import SaveToCodexModal from "./SaveToCodexModal.svelte";
  import EntityDetailModal from "./EntityDetailModal.svelte";
  import GeneratorOutputCard from "./GeneratorOutputCard.svelte";
  import {
    getContextSelection,
    computeProvenance,
    type SessionEntity,
  } from "generator-engine";
  import {
    buildFaqJsonLd,
    buildSoftwareApplicationJsonLd,
    buildBreadcrumbJsonLd,
    buildResultJsonLd,
  } from "./generator-json-ld";

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
    backHref = undefined,
    backLabel = undefined,
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
    backHref?: string;
    backLabel?: string;
  } = $props();

  let isGenerating = $state(false);
  // Separate flag for the on-mount seed draft so it never blocks (or is blocked
  // by) an explicit user Generate (#1494 review follow-up).
  let isAutoDrafting = $state(false);
  // Once the user explicitly generates, the in-flight seed draft must not clobber
  // their result if it resolves later.
  let userGenerated = $state(false);
  const isBusy = $derived(isGenerating || isAutoDrafting);
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

  // Offline awareness (#1494): generator pages still work offline using local
  // tables, but AI Lore Co-Author mode requires the network. Network status
  // comes from the shared `onlineStatus` store (seeded at module load, so no
  // post-mount "assumed online" flash).
  const isOnline = $derived(onlineStatus.current);
  // Dismissal flag for the "AI was unavailable, used local" notice; reset on
  // each new generation so a later failure shows it again.
  let aiFallbackDismissed = $state(false);

  const themeMap: Record<string, string> = {
    "Classic Fantasy": "fantasy",
    "Cyberpunk / Corporate": "cyberpunk",
    "Vampire / Gothic Noir": "horror",
    "Sci-Fi / Space Opera": "scifi",
    "Modern Conspiracy": "modern",
    "Post-Apocalyptic": "apocalyptic",
    "Western / Frontier": "western",
    Steampunk: "steampunk",
    Lancer: "lancer",
    "Optimistic Exploration Sci-Fi": "startrek",
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
    if (isAutoDrafting || generatedData) return;
    isAutoDrafting = true;
    errorMessage = null;
    try {
      const draft = await generate({ useAI: false });
      // The user may have triggered (or finished) an explicit generation while
      // this seed draft was in flight; don't overwrite their result.
      if (!userGenerated) generatedData = draft;
    } catch (err: any) {
      console.warn("Failed to generate initial draft:", err);
    } finally {
      isAutoDrafting = false;
    }
  }

  function confirmSaveRedirect() {
    window.location.href = redirectUrl;
  }

  const faqJsonLd = $derived(buildFaqJsonLd(faqs));

  const softwareApplicationJsonLd = $derived(
    buildSoftwareApplicationJsonLd({ canonicalPath, metaDescription, faqs }),
  );

  const breadcrumbJsonLd = $derived(
    buildBreadcrumbJsonLd({ canonicalPath, introTitle }),
  );

  const resultJsonLd = $derived(buildResultJsonLd(generatedData));

  async function handleGenerate() {
    if (isGenerating) return;
    isExampleDraft = false;
    userGenerated = true;
    isGenerating = true;
    errorMessage = null;
    aiFallbackDismissed = false;
    // Use AI only when the user opted in *and* we're online. Read the live
    // status at click time so a generation triggered before status settles
    // still routes correctly (#1494).
    const useAINow =
      useAI && (browser ? navigator.onLine : onlineStatus.current);
    try {
      generatedData = await generate({ useAI: useAINow });

      if (generatedData) {
        const content = generatedData.summary
          ? `*${generatedData.summary}*\n\n${documentLayout.content}`
          : documentLayout.content;

        const currentContext = $state.snapshot(contextSelection);

        currentEntityId = sessionHubStore.addEntity({
          type: generatedData.type,
          title: generatedData.title,
          summary: generatedData.summary,
          content,
          lore: documentLayout.lore,
          labels: generatedData.labels,
          status: generatedData.status,
          reuseEnabled: true,
          pinned: false,
        });

        const record = computeProvenance(
          currentEntityId,
          content + "\n" + (documentLayout.lore || ""),
          currentContext.entities,
          currentContext.trimmed,
        );
        sessionHubStore.addProvenance(record);
      }

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

  let selectedHubEntity = $state<SessionEntity | null>(null);
  let currentEntityId = $state<string | null>(null);
  const contextSelection = $derived(
    getContextSelection(sessionHubStore.entities),
  );

  function handleSaveHubToCodex(entitiesToSave: SessionEntity[]) {
    if (entitiesToSave.length === 0) return;
    try {
      const draftsToSave = entitiesToSave.map((e) => {
        const prov = sessionHubStore.provenance[e.id];
        let references: string[] | undefined;
        if (prov && prov.usedEntityIds.length > 0) {
          references = prov.usedEntityIds
            .map(
              (uid) =>
                sessionHubStore.entities.find((en) => en.id === uid)?.title,
            )
            .filter((title): title is string => !!title);
        }

        return {
          type: e.type,
          title: e.title,
          content: e.content,
          lore: e.lore,
          labels: e.labels,
          status: e.status,
          references,
        };
      });
      localStorage.setItem(
        "__codex_pending_import",
        JSON.stringify(draftsToSave),
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
      <GeneratorOutputCard
        {generatedData}
        {aiFallbackDismissed}
        {isBusy}
        {isExampleDraft}
        {generatedSingular}
        {variant}
        {worldTheme}
        documentContent={documentLayout.content}
        {documentSections}
        {copied}
        {copiedSectionId}
        contextTrimmed={contextSelection.trimmed}
        onDismissAiFallback={() => (aiFallbackDismissed = true)}
        onSaveToCodex={handleSaveToCodex}
        onCopyMarkdown={handleCopyMarkdown}
        onCopySection={(sectionId, markdown) =>
          void handleCopySection(sectionId, markdown)}
        onContainerClick={handleContainerClick}
        onContainerKeydown={handleContainerKeydown}
        onSelectHubEntity={(entity) => (selectedHubEntity = entity)}
        onSaveHubToCodex={handleSaveHubToCodex}
      />
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
              class="seo-rail seo-md text-sm leading-relaxed text-theme-text/85 {variant ===
              'names'
                ? 'max-w-xl mx-auto columns-2 sm:columns-3 gap-8 py-4'
                : ''}"
            >
              {@html renderGeneratorLore(documentLayout.lore, variant)}
              {#if currentEntityId && sessionHubStore.provenance[currentEntityId]}
                <ProvenanceBadge
                  record={sessionHubStore.provenance[currentEntityId]}
                  onSelect={(e) => (selectedHubEntity = e)}
                />
              {/if}
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
      </div>
    </div>

    <!-- Parameters Column: rendered last in DOM, positioned on the left on desktop -->
    <div class="lg:col-span-3 space-y-6 order-1 lg:order-1">
      <div
        class="p-6 bg-theme-surface/40 border border-theme-border/60 rounded-2xl shadow-sm"
      >
        <a
          href="{cleanBase}{backHref ?? '/generators'}"
          class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest font-header text-theme-muted hover:text-theme-primary transition-colors mb-3"
        >
          <span class="icon-[lucide--arrow-left] w-3 h-3" aria-hidden="true"
          ></span>
          {backLabel ?? "All generators"}
        </a>
        <GeneratorSwitcherMenu {canonicalPath} {eyebrow} />
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

        {#if !isOnline}
          <div
            transition:fade={{ duration: 150 }}
            class="mb-5 p-3 border border-theme-primary/30 bg-theme-primary/10 rounded-xl flex gap-2.5"
            role="status"
            aria-live="polite"
          >
            <span
              class="icon-[lucide--wifi-off] w-4 h-4 text-theme-primary shrink-0 mt-0.5"
              aria-hidden="true"
            ></span>
            <div class="flex flex-col gap-1">
              <p
                class="text-[10px] font-bold uppercase tracking-wider font-header text-theme-primary"
              >
                Local Mode
              </p>
              <p class="text-[10px] text-theme-text/70 leading-snug">
                You're offline. Codex will generate from built-in tables and
                save drafts locally. Reconnect to use AI Lore Co-Author mode
                again.
              </p>
            </div>
          </div>
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
            disabled={isBusy}
            aria-busy={isBusy}
            class="w-full py-3 mt-4 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-widest text-xs rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            id="generate-button"
            title="Generate a new draft using your current form inputs"
          >
            {#if isBusy}
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
                disabled={!isOnline}
                aria-describedby="ai-toggle-hint"
                class="w-4 h-4 rounded border-theme-border/60 bg-theme-bg/60 text-theme-primary focus:ring-theme-primary/40 focus:outline-none flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <label
                for="ai-toggle"
                class="text-[10px] font-bold uppercase tracking-wider text-theme-muted flex items-center gap-1 {isOnline
                  ? 'cursor-pointer'
                  : 'opacity-50 cursor-not-allowed'}"
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
              {#if !isOnline}
                Offline: using fast local tables. Reconnect to enable AI Lore
                Co-Author mode.
              {:else if useAI}
                AI writes unique, rich lore on each generate.
              {:else}
                Fast offline mode — local tables only, no AI.
              {/if}
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

  <FaqSection {introTitle} {faqs} />

  <RelatedLinksSection {relatedLinks} />

  <SaveToCodexModal
    open={showSaveModal}
    onConfirm={confirmSaveRedirect}
    onCancel={() => (showSaveModal = false)}
  />

  <EntityDetailModal
    entity={selectedHubEntity}
    onClose={() => (selectedHubEntity = null)}
  />

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
