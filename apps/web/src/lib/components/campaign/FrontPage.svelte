<script lang="ts">
  import { onDestroy } from "svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { campaignStore } from "$lib/stores/campaign.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import ArticleRenderer from "$lib/components/blog/ArticleRenderer.svelte";
  import { contextRetrievalService } from "$lib/services/ai/context-retrieval.service";
  import CoverImage from "./CoverImage.svelte";
  import EntityCard from "./EntityCard.svelte";
  import ZenImageLightbox from "$lib/components/zen/ZenImageLightbox.svelte";

  let { onClose }: { onClose?: () => void } = $props();

  const createCampaignCoverPrompt = (
    campaignName: string,
    themeName: string,
    themeDescription: string,
    summary: string,
    worldContext: string,
  ) => {
    const safeSummary = summary.trim() || "An unexplored campaign setting.";
    const safeName = campaignName.trim() || "this campaign world";
    const safeWorldContext =
      worldContext.trim() || "No additional world context was retrieved.";

    return `Create atmospheric portrait cover art for "${safeName}".

Theme:
- Name: ${themeName}
- Thematic scope: ${themeDescription}

World cues:
- Summary: ${safeSummary}
- Retrieved world context:
${safeWorldContext}

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
  let isDraftDirty = $state(false);

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
  const campaignName = $derived(
    metadata?.name?.trim() || vault.vaultName || "",
  );
  const hasSummary = $derived(!!draftDescription.trim());
  const summaryPreview = $derived(draftDescription.trim());

  let isEditingSummary = $state(false);
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
    if (!campaignStore.error) {
      isDraftDirty = false;
      isEditingSummary = false;
    }
  };

  const buildRetrievedWorldContext = async (isImage = false) => {
    const campaignRef = campaignName.trim();
    const themeRef = themeStore.activeTheme.name.trim();
    const baseTerms = [campaignRef, themeRef].filter(Boolean).join(" ").trim();
    const queries = [
      `${baseTerms} setting world campaign overview premise tone central conflict`,
      `${baseTerms} major players factions antagonists allies plot hooks current threats`,
    ];

    try {
      const retrievedParts = await Promise.all(
        queries.map(async (query) => {
          const retrieved = await contextRetrievalService.retrieveContext(
            query,
            new Set<string>(),
            vault,
            campaignStore.frontPageEntity?.id,
            isImage,
          );
          return retrieved.content.trim();
        }),
      );

      const uniqueParts = [...new Set(retrievedParts.filter(Boolean))];
      return uniqueParts.join("\n\n");
    } catch {
      return "";
    }
  };

  const handleGenerateSummary = async () => {
    if (hasSummary) {
      const confirmed = window.confirm(
        "Generate a new summary and replace the existing one?",
      );
      if (!confirmed) return;
    }

    const activeTheme = themeStore.activeTheme;
    const themeDescription = activeTheme.description.trim();
    const retrievedWorldContext = await buildRetrievedWorldContext();
    const generated = await campaignStore.generateDescription(
      `Write a front-page campaign summary for "${
        campaignName.trim() || "this campaign world"
      }".

Theme:
- Name: ${activeTheme.name}
- Description: ${themeDescription}
- Mood colors: primary ${activeTheme.tokens.primary}, accent ${activeTheme.tokens.accent}, background ${activeTheme.tokens.background}

Requirements:
- Start with 1 short atmospheric intro paragraph.
- Follow with 3 to 5 markdown bullet points using bold labels such as **Current Conflict:**, **Key Players:**, **Immediate Hook:**, or **Threat Level:** when they fit the setting.
- Clearly explain the setting, mood, and immediate premise.
- Use specific details from the campaign instead of generic fantasy language.
- Keep it readable, welcoming, and easy to scan.
- Keep each bullet to one compact sentence.
- Avoid headings and meta commentary.
- Do not mention that you are an AI.

Retrieved world context:
${retrievedWorldContext || "No additional world context was retrieved."}

Match the summary to the theme's atmosphere and visual identity, and focus on what a new player or returning GM needs to know at a glance.`,
    );
    if (generated.trim() && !campaignStore.error) {
      draftDescription = generated;
      isDraftDirty = false;
      isEditingSummary = false;
    }
  };

  const startEditingSummary = async () => {
    isEditingSummary = true;
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
    const retrievedWorldContext = await buildRetrievedWorldContext(true);
    try {
      await campaignStore.generateCoverImage(
        createCampaignCoverPrompt(
          campaignName,
          themeName,
          themeDescription,
          summaryText,
          retrievedWorldContext,
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
            class="inline-flex items-center gap-2 rounded-full border border-theme-primary/45 bg-theme-surface/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-theme-primary shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-theme-primary)_12%,transparent)] backdrop-blur-sm"
          >
            <span class="w-2 h-2 rounded-full bg-theme-primary animate-pulse"
            ></span>
            Front Page
          </div>

          <ZenImageLightbox
            bind:show={showCoverLightbox}
            imageUrl={coverImageUrl}
            title="Campaign cover"
          />
        </div>

        <div
          class="flex flex-wrap justify-end gap-2 xl:absolute xl:right-0 xl:top-0 xl:gap-3"
        >
          {#if coverImage}
            <button
              class="rounded-full border border-theme-primary/45 bg-theme-surface/80 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-theme-primary shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-theme-primary)_12%,transparent)] transition-colors hover:bg-theme-primary/12 hover:border-theme-primary/60"
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
          {#if onClose}
            <button
              class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-theme-border bg-theme-bg/70 text-theme-muted backdrop-blur-sm transition-colors hover:border-theme-primary/50 hover:text-theme-primary"
              onclick={onClose}
              aria-label="Close front page"
              title="Close front page"
            >
              <span class="icon-[lucide--x] h-4 w-4"></span>
            </button>
          {/if}
        </div>
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
          data-testid="entities-section"
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

        <section
          data-testid="summary-section"
          class="flex flex-col overflow-hidden rounded-3xl border border-theme-border bg-theme-surface/80"
        >
          <div class="relative overflow-hidden bg-theme-bg/80">
            {#if isEditingSummary}
              <textarea
                bind:this={summaryTextarea}
                bind:value={draftDescription}
                oninput={() => (isDraftDirty = true)}
                rows="1"
                class="min-h-[12rem] w-full resize-none border-0 bg-transparent px-5 py-5 pb-16 text-sm leading-relaxed text-theme-text placeholder:text-theme-muted/60 focus:outline-none sm:px-6 sm:py-6 sm:text-base overflow-hidden"
                placeholder="Write a short campaign summary..."
              ></textarea>
            {:else}
              <div class="relative w-full px-5 py-5 sm:px-6 sm:py-6">
                <div
                  data-testid="summary-preview"
                  role="region"
                  aria-label="Campaign summary preview"
                  class={`relative flex-1 overflow-hidden prose prose-invert max-w-none prose-p:my-0 prose-p:leading-relaxed prose-ul:my-4 prose-ul:list-disc prose-ul:pl-5 prose-li:my-1 prose-li:marker:text-theme-primary prose-strong:text-theme-primary prose-a:text-theme-primary transition-[max-height] duration-300 ease-out ${isSummaryExpanded ? "max-h-[48rem]" : "max-h-[14rem]"}`}
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
                      No world brief yet. Use the edit or generate button to add
                      one.
                    </div>
                  {/if}
                </div>
                <div
                  class="absolute right-3 top-3 z-20 flex flex-wrap justify-end gap-1"
                >
                  <button
                    class="group inline-flex h-8 w-8 items-center justify-center rounded-full border border-theme-border/80 bg-theme-bg/75 text-theme-muted backdrop-blur-sm transition-colors hover:border-theme-primary/50 hover:text-theme-primary"
                    onclick={startEditingSummary}
                    disabled={campaignStore.isSaving}
                    title="Edit summary"
                    aria-label="Edit summary"
                  >
                    <span class="icon-[lucide--pencil] h-4 w-4"></span>
                  </button>
                  <button
                    class="group inline-flex h-8 w-8 items-center justify-center rounded-full border border-theme-primary/30 bg-theme-bg/75 text-theme-primary backdrop-blur-sm transition-colors hover:bg-theme-primary/15 disabled:opacity-50"
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

          {#if isEditingSummary}
            <div
              class="flex flex-wrap gap-2 border-t border-theme-border/60 px-5 py-4 sm:px-6"
            >
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
      </div>
    </div>
  {/if}
</section>
