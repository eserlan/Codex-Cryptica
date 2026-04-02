<script lang="ts">
  import { onDestroy } from "svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { campaignStore } from "$lib/stores/campaign.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import ArticleRenderer from "$lib/components/blog/ArticleRenderer.svelte";
  import CoverImage from "./CoverImage.svelte";
  import EntityCard from "./EntityCard.svelte";
  import ZenImageLightbox from "$lib/components/zen/ZenImageLightbox.svelte";

  const stripMarkdown = (value: string) =>
    value
      .replace(/[`*_~>#-]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const createCampaignTagline = (
    summary: string,
    campaignTitle: string,
    themeName: string,
  ) => {
    const cleanSummary = stripMarkdown(summary);
    if (cleanSummary) {
      const sentences = cleanSummary.split(/(?<=[.!?])\s+/);
      const firstSentence = sentences[0] || cleanSummary;
      const words = firstSentence.split(/\s+/).filter(Boolean);
      const truncated =
        words.length > 14 ? words.slice(0, 14).join(" ") + "…" : firstSentence;
      return truncated.replace(/[.!?…]+$/, "");
    }

    const title = campaignTitle.trim() || "this vault";
    const themeLabel = themeName.trim();
    return themeLabel
      ? `${themeLabel} world waiting for its first story`
      : `${title} is waiting for its first story`;
  };

  const createCampaignCoverPrompt = (
    campaignTitle: string,
    themeName: string,
    themeDescription: string,
    summary: string,
    tagline: string,
  ) => {
    const safeSummary = summary.trim() || "An unexplored campaign setting.";
    const safeTagline = tagline.trim() || "A world waiting to be entered.";

    return `Create atmospheric portrait cover art for the campaign "${campaignTitle}".

Theme:
- Name: ${themeName}
- Thematic scope: ${themeDescription}

World cues:
- Tagline: ${safeTagline}
- Summary: ${safeSummary}

Art direction:
- Portrait composition, vertical framing, approximately 2:3 aspect ratio.
- Focus on the tone, mood, and symbolic atmosphere of the setting.
- Depict the world itself more than a single action scene.
- Emphasize place, tension, and identity through lighting, silhouette, color, and environment.
- Make it feel like the frontispiece to a living campaign world.
- No text, no title lettering, no UI, no borders.`;
  };

  let lastLoadedVaultId: string | null = null;
  let draftDescription = $state("");
  let draftTitle = $state("");
  let draftTagline = $state("");
  let isDraftDirty = $state(false);
  let isTitleDirty = $state(false);
  let isEditingTagline = $state(false);
  let isTaglineDirty = $state(false);

  const activeVaultId = $derived(vault.activeVaultId);
  const metadata = $derived(campaignStore.metadata);
  const summarySource = $derived(
    metadata?.description?.trim() ||
      campaignStore.frontPageEntity?.chronicle?.trim() ||
      campaignStore.frontPageEntity?.content?.trim() ||
      "",
  );
  const recentActivity = $derived(campaignStore.recentActivity);
  const displayedRecentActivity = $derived.by(() => {
    const isPinned = (
      tags: string[] | undefined,
      labels: string[] | undefined,
    ) =>
      [...(tags || []), ...(labels || [])].some(
        (tag) => tag?.trim().toLowerCase() === "frontpage",
      );

    const pinned = recentActivity
      .filter((activity) => isPinned(activity.tags, activity.labels))
      .sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
    const unpinned = recentActivity
      .filter((activity) => !isPinned(activity.tags, activity.labels))
      .sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));

    return [...pinned, ...unpinned].slice(0, recentLimit);
  });
  const coverImage = $derived(metadata?.coverImage || "");
  const title = $derived(metadata?.name || vault.vaultName || "Vault");
  const hasSummary = $derived(!!draftDescription.trim());
  const summaryPreview = $derived(draftDescription.trim());
  const hasTitle = $derived(!!draftTitle.trim());
  const taglinePreview = $derived(
    metadata?.tagline?.trim() ||
      createCampaignTagline(summaryPreview, title, themeStore.activeTheme.name),
  );

  let isEditingSummary = $state(false);
  let isEditingTitle = $state(false);
  let showCoverEditor = $state(false);
  let coverImageUrl = $state("");
  let lastCoverImage = "";
  let isCampaignReady = $state(false);
  let summaryTextarea = $state<HTMLTextAreaElement | null>(null);
  let recentLimit = $state(6);
  let isEditingRecentLimit = $state(false);
  let recentLimitInput = $state("6");
  let lastLoadedRecentLimit = 6;
  let isSummaryExpanded = $state(false);
  let summaryHoverTimer: ReturnType<typeof setTimeout> | null = null;
  let showCoverLightbox = $state(false);

  const getRecentLimitStorageKey = (vaultId: string) =>
    `codex_front_page_recent_limit:${vaultId}`;

  const readRecentLimit = (vaultId: string) => {
    if (typeof window === "undefined") return 6;
    const raw = window.localStorage.getItem(getRecentLimitStorageKey(vaultId));
    const parsed = raw ? Number.parseInt(raw, 10) : 6;
    return Number.isFinite(parsed) ? Math.min(24, Math.max(1, parsed)) : 6;
  };

  const persistRecentLimit = (vaultId: string, limit: number) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      getRecentLimitStorageKey(vaultId),
      String(limit),
    );
  };

  $effect(() => {
    if (!activeVaultId || typeof window === "undefined") return;
    const storedLimit = readRecentLimit(activeVaultId);
    if (storedLimit !== recentLimit) {
      recentLimit = storedLimit;
      recentLimitInput = String(storedLimit);
    }
  });

  $effect(() => {
    if (!activeVaultId) {
      isCampaignReady = false;
      return;
    }

    if (
      lastLoadedVaultId === activeVaultId &&
      lastLoadedRecentLimit === recentLimit &&
      isCampaignReady
    )
      return;

    let stale = false;
    isCampaignReady = false;
    lastLoadedVaultId = activeVaultId;
    lastLoadedRecentLimit = recentLimit;

    Promise.resolve(campaignStore.load(activeVaultId, recentLimit)).finally(
      () => {
        if (!stale) isCampaignReady = true;
      },
    );

    return () => {
      stale = true;
    };
  });

  $effect(() => {
    if (!isEditingSummary && !isDraftDirty) {
      draftDescription = summarySource;
    }
    draftTitle = metadata?.name || vault.vaultName || "";
    isTitleDirty = false;
    isEditingTitle = !metadata?.name?.trim();
    if (!isEditingTagline) {
      draftTagline =
        metadata?.tagline?.trim() ||
        createCampaignTagline(
          summarySource,
          title,
          themeStore.activeTheme.name,
        );
    }
    if (!isEditingSummary && summarySource) isDraftDirty = false;
    if (coverImage !== lastCoverImage) {
      lastCoverImage = coverImage;
      showCoverEditor = !coverImage;
    }
  });

  $effect(() => {
    if (!coverImage) {
      coverImageUrl = "";
      return;
    }

    let stale = false;
    void vault.resolveImageUrl(coverImage).then((url) => {
      if (!stale) coverImageUrl = url || "";
    });

    return () => {
      stale = true;
    };
  });

  $effect(() => {
    if (!summaryTextarea || (!isEditingSummary && hasSummary)) return;

    summaryTextarea.style.height = "auto";
    summaryTextarea.style.height = `${summaryTextarea.scrollHeight}px`;
  });

  const handleSaveDescription = async () => {
    await campaignStore.saveDescription(draftDescription);
    isDraftDirty = false;
    isEditingSummary = false;
  };

  const handleSaveTitle = async () => {
    await campaignStore.saveTitle(draftTitle.trim());
    isTitleDirty = false;
    isEditingTitle = false;
  };

  const handleSaveTagline = async () => {
    await campaignStore.saveTagline(draftTagline.trim());
    isTaglineDirty = false;
    isEditingTagline = false;
  };

  const handleGenerateSummary = async () => {
    const existingTagline = metadata?.tagline?.trim() || "";
    if (hasSummary) {
      const confirmed = window.confirm(
        "Generate a new summary and replace the existing one?",
      );
      if (!confirmed) return;
    }

    const activeTheme = themeStore.activeTheme;
    const themeDescription = activeTheme.description.trim();
    const generated = await campaignStore.generateDescription(
      `Write a front-page campaign summary for "${title}".

Theme:
- Name: ${activeTheme.name}
- Description: ${themeDescription}
- Mood colors: primary ${activeTheme.tokens.primary}, accent ${activeTheme.tokens.accent}, background ${activeTheme.tokens.background}

Requirements:
- 2 to 4 short paragraphs or a compact single paragraph.
- Clearly explain the setting, mood, and immediate premise.
- Use specific details from the campaign instead of generic fantasy language.
- Keep it readable, welcoming, and easy to scan.
- Avoid headings, bullet points, and meta commentary.
- Do not mention that you are an AI.

Match the summary to the theme's atmosphere and visual identity, and focus on what a new player or returning GM needs to know at a glance.`,
    );
    draftDescription = generated;
    isDraftDirty = false;
    isEditingSummary = false;
    if (!existingTagline) {
      draftTagline = createCampaignTagline(generated, title, activeTheme.name);
      await campaignStore.saveTagline(draftTagline);
    }
  };

  const startEditingSummary = async () => {
    isEditingSummary = true;
  };

  const startEditingTitle = async () => {
    isEditingTitle = true;
  };

  const startEditingTagline = () => {
    draftTagline = taglinePreview;
    isTaglineDirty = false;
    isEditingTagline = true;
  };

  const openCoverEditor = () => {
    showCoverEditor = true;
  };

  const openCoverLightbox = () => {
    showCoverLightbox = true;
  };

  const cancelEditingSummary = () => {
    draftDescription = summarySource;
    isDraftDirty = false;
    isEditingSummary = false;
  };

  const cancelEditingTitle = () => {
    draftTitle = metadata?.name || vault.vaultName || "";
    isTitleDirty = false;
    isEditingTitle = false;
  };

  const cancelEditingTagline = () => {
    draftTagline = metadata?.tagline?.trim() || taglinePreview;
    isTaglineDirty = false;
    isEditingTagline = false;
  };

  const closeCoverEditor = () => {
    showCoverEditor = false;
  };

  const handleUploadCover = async (file: File) => {
    if (!activeVaultId) return;
    const saved = await vault.saveImageToVault(
      file,
      `campaign-${activeVaultId}`,
      file.name,
    );
    await campaignStore.setCoverImage(saved.image);
  };

  const handleGenerateCover = async () => {
    const themeName = themeStore.activeTheme.name;
    const themeDescription = themeStore.activeTheme.description.trim();
    const summaryText = summaryPreview || "No campaign summary provided yet.";
    const taglineText = taglinePreview;
    try {
      await campaignStore.generateCoverImage(
        createCampaignCoverPrompt(
          title,
          themeName,
          themeDescription,
          summaryText,
          taglineText,
        ),
      );
    } catch {
      // The store should absorb errors, but keep the click handler safe.
    }
  };

  const beginEditingRecentLimit = () => {
    recentLimitInput = String(recentLimit);
    isEditingRecentLimit = true;
  };

  const commitRecentLimit = async () => {
    const parsed = Number.parseInt(recentLimitInput, 10);
    const nextLimit = Number.isFinite(parsed)
      ? Math.min(24, Math.max(1, parsed))
      : recentLimit;

    recentLimitInput = String(nextLimit);
    isEditingRecentLimit = false;
    recentLimit = nextLimit;
    if (activeVaultId) persistRecentLimit(activeVaultId, nextLimit);
  };

  const cancelRecentLimitEdit = () => {
    recentLimitInput = String(recentLimit);
    isEditingRecentLimit = false;
  };

  const clearSummaryHoverTimer = () => {
    if (summaryHoverTimer) {
      clearTimeout(summaryHoverTimer);
      summaryHoverTimer = null;
    }
  };

  const beginSummaryPreviewHover = () => {
    if (!hasSummary || isEditingSummary) return;
    clearSummaryHoverTimer();
    summaryHoverTimer = setTimeout(() => {
      isSummaryExpanded = true;
      summaryHoverTimer = null;
    }, 800);
  };

  const endSummaryPreviewHover = () => {
    clearSummaryHoverTimer();
    isSummaryExpanded = false;
  };

  onDestroy(() => {
    clearSummaryHoverTimer();
  });

  $effect(() => {
    if (!hasSummary || isEditingSummary) {
      isSummaryExpanded = false;
    }
  });
</script>

<section
  data-testid="front-page-shell"
  class="relative isolate min-h-[calc(100vh-var(--header-height,65px)-2rem)] overflow-hidden rounded-[2rem] border border-theme-border bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_48%),linear-gradient(180deg,rgba(10,10,10,0.92),rgba(5,5,8,0.98))] p-4 sm:p-5 md:p-8 xl:p-10 shadow-[0_30px_120px_rgba(0,0,0,0.35)]"
>
  {#if !isCampaignReady}
    <div
      class="relative z-10 flex min-h-[inherit] items-center justify-center py-20"
    >
      <div class="flex flex-col items-center gap-4 text-center">
        <div
          class="h-10 w-10 animate-spin rounded-full border-2 border-theme-primary/30 border-t-theme-primary"
        ></div>
        <div>
          <p
            class="text-sm font-bold uppercase tracking-[0.22em] text-theme-primary"
          >
            Loading front page
          </p>
          <p class="mt-2 text-sm text-theme-muted">Preparing campaign data…</p>
        </div>
      </div>
    </div>
  {:else}
    {#if coverImageUrl && !showCoverEditor}
      <div
        data-testid="front-page-hero-background"
        class="absolute inset-0 bg-cover bg-center opacity-35 mix-blend-screen"
        style={`background-image: url("${coverImageUrl}")`}
      ></div>
    {/if}

    <div
      class="absolute inset-0 pointer-events-none opacity-65 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.05),rgba(0,0,0,0.7)),linear-gradient(180deg,rgba(0,0,0,0.15),rgba(0,0,0,0.65))]"
    ></div>
    <div
      class="absolute inset-0 pointer-events-none opacity-40 bg-[linear-gradient(transparent_0,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,transparent_0,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]"
    ></div>

    <div
      class="relative z-10 flex min-h-[inherit] flex-col gap-6 md:gap-8 xl:gap-10"
    >
      <header
        class="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"
      >
        <div class="w-full space-y-4 xl:pr-56">
          <div
            class="inline-flex items-center gap-2 rounded-full border border-theme-primary/30 bg-theme-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-theme-primary"
          >
            <span class="w-2 h-2 rounded-full bg-theme-primary animate-pulse"
            ></span>
            Front Page
          </div>

          <div class="space-y-2">
            {#if isEditingTitle}
              <div class="flex flex-col gap-3">
                <input
                  bind:value={draftTitle}
                  class="w-full rounded-2xl border border-theme-border bg-theme-bg/80 px-4 py-3 font-header text-2xl md:text-4xl uppercase tracking-[0.08em] text-theme-text leading-none placeholder:text-theme-muted/60 focus:border-theme-primary focus:outline-none"
                  placeholder="Campaign title"
                  oninput={() => (isTitleDirty = true)}
                />
                <div class="flex flex-wrap gap-2">
                  <button
                    class="rounded-lg bg-theme-primary px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-theme-bg disabled:opacity-50"
                    onclick={handleSaveTitle}
                    disabled={campaignStore.isSaving ||
                      !hasTitle ||
                      !isTitleDirty}
                  >
                    Save Title
                  </button>
                  <button
                    class="rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-theme-muted hover:text-theme-text disabled:opacity-50"
                    onclick={cancelEditingTitle}
                    disabled={campaignStore.isSaving}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            {:else}
              <div class="flex items-start gap-3">
                <h1
                  class="font-header text-4xl sm:text-5xl lg:text-6xl 2xl:text-7xl uppercase tracking-[0.08em] text-theme-text leading-none"
                >
                  {title}
                </h1>
              </div>
              <ZenImageLightbox
                bind:show={showCoverLightbox}
                imageUrl={coverImageUrl}
                {title}
              />
            {/if}
            {#if isEditingTagline}
              <div class="flex flex-col gap-3">
                <input
                  bind:value={draftTagline}
                  class="w-full rounded-2xl border border-theme-border bg-theme-bg/80 px-4 py-3 text-sm md:text-base italic text-theme-text/75 leading-relaxed placeholder:text-theme-muted/60 focus:border-theme-primary focus:outline-none"
                  placeholder="Campaign tagline"
                  oninput={() => (isTaglineDirty = true)}
                />
                <div class="flex flex-wrap gap-2">
                  <button
                    class="rounded-lg bg-theme-primary px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-theme-bg disabled:opacity-50"
                    onclick={handleSaveTagline}
                    disabled={campaignStore.isSaving ||
                      !draftTagline.trim() ||
                      !isTaglineDirty}
                  >
                    Save Tagline
                  </button>
                  <button
                    class="rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-theme-muted hover:text-theme-text disabled:opacity-50"
                    onclick={cancelEditingTagline}
                    disabled={campaignStore.isSaving}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            {:else}
              <div class="flex items-start gap-2">
                <p
                  class="max-w-none text-sm md:text-base italic text-theme-text/75 leading-relaxed"
                >
                  {taglinePreview}
                </p>
                <button
                  type="button"
                  class="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-theme-border text-theme-muted transition-colors hover:border-theme-primary/50 hover:text-theme-primary"
                  onclick={startEditingTagline}
                  disabled={campaignStore.isSaving}
                  title="Edit tagline"
                  aria-label="Edit tagline"
                >
                  <span class="icon-[lucide--pencil] h-3.5 w-3.5"></span>
                </button>
              </div>
            {/if}
          </div>
        </div>

        <div
          class="flex flex-wrap justify-end gap-2 xl:absolute xl:right-0 xl:top-0 xl:gap-3"
        >
          <button
            class="rounded-full border border-theme-border px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-theme-muted hover:border-theme-primary/50 hover:text-theme-primary"
            onclick={startEditingTitle}
            disabled={campaignStore.isSaving}
          >
            Edit Title
          </button>
          {#if coverImage}
            <button
              class="rounded-full border border-theme-primary/40 bg-theme-primary/10 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-theme-primary hover:bg-theme-primary/20"
              onclick={openCoverEditor}
              disabled={campaignStore.isSaving}
            >
              Change Image
            </button>
          {/if}
          {#if coverImageUrl}
            <button
              class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-theme-border bg-theme-bg/70 text-theme-muted backdrop-blur-sm transition-colors hover:border-theme-primary/50 hover:text-theme-primary"
              onclick={openCoverLightbox}
              aria-label="Open cover image lightbox"
              title="Open cover image"
              disabled={!coverImageUrl}
            >
              <span class="icon-[lucide--maximize-2] h-4 w-4"></span>
            </button>
          {/if}
        </div>

        <div class="flex flex-wrap gap-2"></div>
      </header>

      <div class="flex flex-1 flex-col gap-5 lg:gap-6">
        {#if showCoverEditor || !coverImage}
          <CoverImage
            hasImage={!!coverImage}
            isSaving={campaignStore.isSaving}
            onDrop={handleUploadCover}
            onGenerate={handleGenerateCover}
            onCancel={coverImage ? closeCoverEditor : undefined}
          />
        {/if}

        {#if campaignStore.error}
          <p
            class="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {campaignStore.error}
          </p>
        {/if}

        <section
          class="flex flex-col rounded-3xl border border-theme-border bg-theme-surface/80 p-4 sm:p-5 md:p-6"
        >
          <div class="relative overflow-hidden rounded-2xl bg-theme-bg/80">
            {#if isEditingSummary}
              <textarea
                bind:this={summaryTextarea}
                bind:value={draftDescription}
                oninput={() => (isDraftDirty = true)}
                rows="1"
                class="min-h-[12rem] w-full resize-none border-0 bg-transparent px-4 py-4 pr-32 pb-16 text-sm leading-relaxed text-theme-text placeholder:text-theme-muted/60 focus:outline-none sm:text-base overflow-hidden"
                placeholder="Write a short campaign summary..."
              ></textarea>
            {:else}
              <div class="relative w-full px-4 py-4 pr-16 sm:pr-20">
                <div
                  data-testid="summary-preview"
                  role="region"
                  aria-label="Campaign summary preview"
                  class={`relative flex-1 overflow-hidden prose prose-invert max-w-none prose-p:my-0 prose-strong:text-theme-primary prose-a:text-theme-primary transition-[max-height] duration-300 ease-out ${isSummaryExpanded ? "max-h-[48rem]" : "max-h-[11rem]"}`}
                  onmouseenter={beginSummaryPreviewHover}
                  onmouseleave={endSummaryPreviewHover}
                  onfocusin={beginSummaryPreviewHover}
                  onfocusout={endSummaryPreviewHover}
                >
                  {#if hasSummary}
                    <ArticleRenderer content={summaryPreview} />
                    {#if !isSummaryExpanded}
                      <div
                        class="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-theme-bg/95"
                      ></div>
                    {/if}
                  {:else}
                    <div
                      class="flex min-h-[12rem] items-center justify-center px-4 py-8 text-center text-sm text-theme-muted/70"
                    >
                      No campaign summary yet. Use the edit or generate button
                      to add one.
                    </div>
                  {/if}
                </div>
                <div
                  class="absolute right-3 top-3 z-20 flex flex-wrap justify-end gap-1"
                >
                  <button
                    class="group inline-flex h-8 w-8 items-center justify-center rounded-full border border-theme-border text-theme-muted transition-colors hover:border-theme-primary/50 hover:text-theme-primary"
                    onclick={startEditingSummary}
                    disabled={campaignStore.isSaving}
                    title="Edit summary"
                    aria-label="Edit summary"
                  >
                    <span class="icon-[lucide--pencil] h-4 w-4"></span>
                  </button>
                  <button
                    class="group inline-flex h-8 w-8 items-center justify-center rounded-full border border-theme-primary/30 bg-theme-primary/10 text-theme-primary transition-colors hover:bg-theme-primary/20 disabled:opacity-50"
                    onclick={handleGenerateSummary}
                    disabled={campaignStore.isSaving}
                    title="Generate summary"
                    aria-label="Generate summary"
                  >
                    <span class="icon-[lucide--sparkles] h-4 w-4"></span>
                  </button>
                </div>
              </div>
            {/if}
          </div>

          {#if hasSummary && isEditingSummary}
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                class="rounded-lg bg-theme-primary px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-theme-bg disabled:opacity-50"
                onclick={handleSaveDescription}
                disabled={campaignStore.isSaving || !isDraftDirty}
              >
                Save Summary
              </button>
              <button
                class="rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-theme-muted hover:text-theme-text disabled:opacity-50"
                onclick={cancelEditingSummary}
                disabled={campaignStore.isSaving}
              >
                Cancel
              </button>
            </div>
          {/if}
        </section>

        <section
          class="flex flex-1 flex-col rounded-3xl border border-theme-border bg-theme-surface/80 p-4 sm:p-5 md:p-6"
        >
          <div class="mb-4 flex items-center justify-between">
            <h2
              class="font-header text-xs uppercase tracking-[0.22em] text-theme-muted"
            >
              Relevant Entities
            </h2>
            <div class="flex items-center gap-2">
              {#if isEditingRecentLimit}
                <input
                  bind:value={recentLimitInput}
                  type="number"
                  min="1"
                  max="24"
                  inputmode="numeric"
                  class="h-10 w-16 rounded-full border border-theme-primary/40 bg-theme-bg/90 px-3 text-center text-sm font-bold text-theme-text outline-none focus:border-theme-primary"
                  aria-label="Set recent entities limit"
                  onblur={commitRecentLimit}
                  onkeydown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitRecentLimit();
                    } else if (event.key === "Escape") {
                      event.preventDefault();
                      cancelRecentLimitEdit();
                    }
                  }}
                />
              {:else}
                <button
                  type="button"
                  class="flex h-10 w-10 items-center justify-center rounded-full border border-theme-primary/40 bg-theme-primary/10 text-sm font-bold text-theme-primary hover:bg-theme-primary/20"
                  aria-label={`Show ${recentLimit} recent entities`}
                  title="Set how many recent entities to show"
                  onclick={beginEditingRecentLimit}
                >
                  {recentLimit}
                </button>
              {/if}
            </div>
          </div>

          {#if campaignStore.isLoading}
            <div class="py-10 text-center text-sm text-theme-muted">
              Loading front page…
            </div>
          {:else if displayedRecentActivity.length > 0}
            <div class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {#each displayedRecentActivity as activity (activity.id)}
                <EntityCard {activity} />
              {/each}
            </div>
          {:else}
            <div
              class="rounded-2xl border border-dashed border-theme-border px-4 py-10 text-center text-sm text-theme-muted"
            >
              No recent entities yet. Create or import a note to see it here.
            </div>
          {/if}
        </section>
      </div>
    </div>
  {/if}
</section>
