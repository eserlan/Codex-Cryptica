<script lang="ts">
  import { onDestroy } from "svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { worldStore } from "$lib/stores/world.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import ArticleRenderer from "$lib/components/blog/ArticleRenderer.svelte";
  import CoverImage from "./CoverImage.svelte";
  import EntityCard from "./EntityCard.svelte";
  import ZenImageLightbox from "$lib/components/zen/ZenImageLightbox.svelte";
  import { partitionAndSortRecentActivity } from "./front-page/front-page-entities";
  import {
    readRecentLimit,
    persistRecentLimit,
  } from "./front-page/front-page-prefs";
  import { DEFAULT_RECENT_LIMIT } from "./front-page/front-page-constants";
  import { FrontPageController } from "./front-page/front-page-controller";

  let { onClose }: { onClose?: () => void } = $props();

  const controller = new FrontPageController({
    worldStore,
    vault,
    themeStore,
    uiStore,
  });

  let lastLoadedVaultId: string | null = null;
  let draftDescription = $state("");
  let isDraftDirty = $state(false);

  const activeVaultId = $derived(vault.activeVaultId);
  const metadata = $derived(worldStore.metadata);
  const briefingSource = $derived(
    worldStore.metadata?.description?.trim() ||
      worldStore.frontPageEntity?.chronicle?.trim() ||
      worldStore.frontPageEntity?.content?.trim() ||
      "",
  );
  const recentActivity = $derived(worldStore.recentActivity);
  const displayedRecentActivity = $derived(
    partitionAndSortRecentActivity(recentActivity, recentLimit),
  );
  const coverImage = $derived(metadata?.coverImage || "");
  const worldName = $derived(metadata?.name?.trim() || vault.vaultName || "");
  const hasBriefing = $derived(
    !!(
      draftDescription.trim() ||
      worldStore.metadata?.description?.trim() ||
      worldStore.frontPageEntity?.chronicle?.trim() ||
      worldStore.frontPageEntity?.content?.trim()
    ),
  );
  const briefingPreview = $derived(draftDescription.trim());

  // Sync draft description from briefing source when not actively editing
  $effect(() => {
    if (!isEditingBriefing && !isDraftDirty) {
      draftDescription = briefingSource;
    }
  });

  // Clear dirty flag when source changes and we're not editing
  $effect(() => {
    if (!isEditingBriefing && briefingSource) isDraftDirty = false;
  });

  let recentLimit = $state(DEFAULT_RECENT_LIMIT);
  const recentActivity = $derived(worldStore.recentActivity);
  const displayedRecentActivity = $derived(
    partitionAndSortRecentActivity(recentActivity, recentLimit),
  );
  const coverImage = $derived(metadata?.coverImage || "");
  const _worldName = $derived(metadata?.name?.trim() || vault.vaultName || "");

  let isEditingBriefing = $state(false);
  let showCoverEditor = $state(false);
  let coverImageUrl = $state("");
  let lastCoverImage = "";
  let isWorldReady = $state(false);
  let briefingTextarea = $state<HTMLTextAreaElement | null>(null);
  let isEditingRecentLimit = $state(false);
  let recentLimitInput = $state(String(DEFAULT_RECENT_LIMIT));
  let lastLoadedRecentLimit = DEFAULT_RECENT_LIMIT;
  let isBriefingExpanded = $state(false);
  let briefingHoverTimer: ReturnType<typeof setTimeout> | null = null;
  let showCoverLightbox = $state(false);

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
      isWorldReady = false;
      return;
    }

    if (
      lastLoadedVaultId === activeVaultId &&
      lastLoadedRecentLimit === recentLimit &&
      isWorldReady
    )
      return;

    let stale = false;
    isWorldReady = false;
    lastLoadedVaultId = activeVaultId;
    lastLoadedRecentLimit = recentLimit;

    Promise.resolve(worldStore.load(activeVaultId, recentLimit)).finally(() => {
      if (!stale) isWorldReady = true;
    });

    return () => {
      stale = true;
    };
  });

  // Cover-editor initial state: show editor only when there is no cover image
  $effect(() => {
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
    if (!briefingTextarea || (!isEditingBriefing && hasBriefing)) return;

    briefingTextarea.style.height = "auto";
    briefingTextarea.style.height = `${briefingTextarea.scrollHeight}px`;
  });

  const handleSaveDescription = async () => {
    await worldStore.saveDescription(draftDescription);
    if (!worldStore.error) {
      isDraftDirty = false;
      isEditingBriefing = false;
    }
  };

  const handleGenerateBriefing = async () => {
    // Check confirmation FIRST (before expensive context building)
    if (hasBriefing) {
      const confirmed = await uiStore.confirm({
        title: "Regenerate Briefing",
        message:
          "This will replace your current world briefing with a new one generated from your notes. Continue?",
        confirmLabel: "Regenerate",
        cancelLabel: "Keep Existing",
      });
      if (!confirmed) return;
    }

    // Build context and generate
    const frontpageContext =
      await controller.buildFrontpageEntityContextAsync();
    const contextResult =
      await controller.buildRetrievedWorldContext(frontpageContext);
    if (contextResult.devWarning) {
      console.warn(
        "[FrontPage] Context retrieval warning:",
        contextResult.devWarning,
      );
    }

    const result = await controller.generateBriefing(contextResult.content);
    if (result.success) {
      draftDescription = worldStore.metadata?.description ?? "";
      isDraftDirty = false;
      isEditingBriefing = false;
    }
  };

  const handleGenerateCover = async () => {
    // Build context and generate
    let contextContent = "";
    try {
      const frontpageContext =
        await controller.buildFrontpageEntityContextAsync();
      const contextResult = await controller.buildRetrievedWorldContext(
        frontpageContext,
        true,
      );
      if (contextResult.devWarning) {
        console.warn(
          "[FrontPage] Context retrieval warning:",
          contextResult.devWarning,
        );
      }
      contextContent = contextResult.content;
    } catch {
      // Context retrieval is non-critical; proceed without it
    }

    const result = await controller.generateCover(contextContent);
    if (result.warning) {
      worldStore.error = result.warning;
    }
  };

  const handleUploadCover = async (file: File) => {
    const result = await controller.uploadCover(file);
    if (!result.success) {
      worldStore.error = "Failed to upload cover image.";
    }
  };

  const startEditingBriefing = async () => {
    isEditingBriefing = true;
  };

  const openCoverEditor = () => {
    showCoverEditor = true;
  };

  const openCoverLightbox = () => {
    showCoverLightbox = true;
  };

  const cancelEditingBriefing = () => {
    draftDescription = briefingSource;
    isDraftDirty = false;
    isEditingBriefing = false;
  };

  const closeCoverEditor = () => {
    showCoverEditor = false;
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

  const clearBriefingHoverTimer = () => {
    if (briefingHoverTimer) {
      clearTimeout(briefingHoverTimer);
      briefingHoverTimer = null;
    }
  };

  const beginBriefingPreviewHover = () => {
    if (!hasBriefing || isEditingBriefing) return;
    clearBriefingHoverTimer();
    briefingHoverTimer = setTimeout(() => {
      isBriefingExpanded = true;
      briefingHoverTimer = null;
    }, 800);
  };

  const endBriefingPreviewHover = () => {
    clearBriefingHoverTimer();
    isBriefingExpanded = false;
  };

  onDestroy(() => {
    clearBriefingHoverTimer();
  });

  $effect(() => {
    if (!hasBriefing || isEditingBriefing) {
      isBriefingExpanded = false;
    }
  });
</script>

<section
  data-testid="front-page-shell"
  class="relative isolate min-h-[calc(100vh-var(--header-height,65px)-2rem)] overflow-hidden rounded-[2rem] border border-theme-border bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_48%),linear-gradient(180deg,rgba(10,10,10,0.92),rgba(5,5,8,0.98))] p-4 sm:p-5 md:p-8 xl:p-10 shadow-[0_30px_120px_rgba(0,0,0,0.35)]"
>
  {#if !isWorldReady}
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
          <p class="mt-2 text-sm text-theme-muted">Preparing data…</p>
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
            title="World cover"
          />
        </div>

        <div
          class="flex flex-wrap justify-end gap-2 xl:absolute xl:right-0 xl:top-0 xl:gap-3"
        >
          {#if coverImage}
            <button
              class="rounded-full border border-theme-primary/45 bg-theme-surface/80 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-theme-primary shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-theme-primary)_12%,transparent)] transition-colors hover:bg-theme-primary/12 hover:border-theme-primary/60"
              onclick={openCoverEditor}
              disabled={worldStore.isSaving}
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
            isSaving={worldStore.isSaving}
            onDrop={handleUploadCover}
            onGenerate={handleGenerateCover}
            onCancel={coverImage ? closeCoverEditor : undefined}
          />
        {/if}

        {#if worldStore.error}
          <p
            class="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {worldStore.error}
          </p>
        {/if}

        <section
          data-testid="entities-section"
          class="flex flex-1 flex-col rounded-3xl border border-theme-border bg-theme-surface/80 p-4 sm:p-5 md:p-6"
        >
          <div class="mb-4 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <h2
                class="font-header text-xs uppercase tracking-[0.22em] text-theme-muted"
              >
                Relevant Entities
              </h2>
              <div class="group relative flex items-center">
                <span
                  class="icon-[lucide--info] h-3.5 w-3.5 text-theme-muted/60 transition-colors hover:text-theme-primary cursor-help"
                ></span>
                <div
                  class="absolute bottom-full left-0 mb-2 w-56 p-3 bg-theme-surface/95 backdrop-blur-md border border-theme-primary/30 rounded-xl text-[10px] leading-relaxed text-theme-text shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 translate-y-1 group-hover:translate-y-0"
                >
                  <p>
                    Entities tagged or labeled with <strong
                      class="text-theme-primary">frontpage</strong
                    > will be pinned to the top of this section.
                  </p>
                  <!-- Decorative Corner -->
                  <div
                    class="absolute -top-px -left-px w-2 h-2 border-t border-l border-theme-primary/40 rounded-tl-lg"
                  ></div>
                  <div
                    class="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-theme-primary/40 rounded-br-lg"
                  ></div>
                </div>
              </div>
            </div>
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

          {#if worldStore.isLoading}
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
          data-testid="briefing-content-section"
          class="flex flex-col overflow-hidden rounded-3xl border border-theme-border bg-theme-surface/80"
        >
          <div class="relative overflow-hidden bg-theme-bg/80">
            {#if isEditingBriefing}
              <textarea
                bind:this={briefingTextarea}
                bind:value={draftDescription}
                oninput={() => (isDraftDirty = true)}
                rows="1"
                class="min-h-[12rem] w-full resize-none border-0 bg-transparent px-5 py-5 pb-16 text-sm leading-relaxed text-theme-text placeholder:text-theme-muted/60 focus:outline-none sm:px-6 sm:py-6 sm:text-base overflow-hidden"
                placeholder="Write a short world briefing…"
              ></textarea>
            {:else}
              <div class="relative w-full px-5 py-5 sm:px-6 sm:py-6">
                <div
                  data-testid="briefing-preview"
                  role="region"
                  aria-label="World briefing preview"
                  class={`relative flex-1 overflow-hidden prose prose-invert max-w-none prose-p:my-0 prose-p:leading-relaxed prose-ul:my-4 prose-ul:list-disc prose-ul:pl-5 prose-li:my-1 prose-li:marker:text-theme-primary prose-strong:text-theme-primary prose-a:text-theme-primary transition-[max-height] duration-300 ease-out ${isBriefingExpanded ? "max-h-[48rem]" : "max-h-[14rem]"}`}
                  onmouseenter={beginBriefingPreviewHover}
                  onmouseleave={endBriefingPreviewHover}
                  onfocusin={beginBriefingPreviewHover}
                  onfocusout={endBriefingPreviewHover}
                >
                  {#if hasBriefing}
                    <ArticleRenderer content={briefingPreview} />
                    {#if !isBriefingExpanded}
                      <div
                        class="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-theme-bg/95"
                      ></div>
                    {/if}
                  {:else}
                    <div
                      class="flex min-h-[12rem] items-center justify-center px-4 py-8 text-center text-sm text-theme-muted/70"
                    >
                      No world briefing yet. Use the edit or generate button to
                      add one.
                    </div>
                  {/if}
                </div>
                <div
                  class="absolute right-3 top-3 z-20 flex flex-wrap justify-end gap-1"
                >
                  <button
                    class="group inline-flex h-8 w-8 items-center justify-center rounded-full border border-theme-border/80 bg-theme-bg/75 text-theme-muted backdrop-blur-sm transition-colors hover:border-theme-primary/50 hover:text-theme-primary"
                    onclick={startEditingBriefing}
                    disabled={worldStore.isSaving}
                    title="Edit briefing"
                    aria-label="Edit briefing"
                  >
                    <span class="icon-[lucide--pencil] h-4 w-4"></span>
                  </button>
                  <button
                    class="group inline-flex h-8 w-8 items-center justify-center rounded-full border border-theme-primary/30 bg-theme-bg/75 text-theme-primary backdrop-blur-sm transition-colors hover:bg-theme-primary/15 disabled:opacity-50"
                    onclick={handleGenerateBriefing}
                    disabled={worldStore.isSaving}
                    title="Generate briefing"
                    aria-label="Generate briefing"
                  >
                    <span class="icon-[lucide--sparkles] h-4 w-4"></span>
                  </button>
                </div>
              </div>
            {/if}
          </div>

          {#if isEditingBriefing}
            <div
              class="flex flex-wrap gap-2 border-t border-theme-border/60 px-5 py-4 sm:px-6"
            >
              <button
                class="rounded-lg bg-theme-primary px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-theme-bg disabled:opacity-50"
                onclick={handleSaveDescription}
                disabled={worldStore.isSaving || !isDraftDirty}
              >
                Save Briefing
              </button>
              <button
                class="rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-theme-muted hover:text-theme-text disabled:opacity-50"
                onclick={cancelEditingBriefing}
                disabled={worldStore.isSaving}
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
