<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { worldStore } from "$lib/stores/world.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { partitionAndSortRecentActivity } from "./front-page/front-page-entities";
  import {
    readRecentLimit,
    persistRecentLimit,
  } from "./front-page/front-page-prefs";
  import { DEFAULT_RECENT_LIMIT } from "./front-page/front-page-constants";
  import { FrontPageController } from "./front-page/front-page-controller";
  import ZenImageLightbox from "$lib/components/zen/ZenImageLightbox.svelte";
  import FrontPageHero from "./FrontPageHero.svelte";
  import FrontPageEntities from "./FrontPageEntities.svelte";
  import FrontPageBriefing from "./FrontPageBriefing.svelte";

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
  let lastLoadedRecentLimit = DEFAULT_RECENT_LIMIT;
  let showCoverLightbox = $state(false);
  let isGeneratingBriefing = $state(false);

  $effect(() => {
    if (!activeVaultId || typeof window === "undefined") return;
    const storedLimit = readRecentLimit(activeVaultId);
    if (storedLimit !== recentLimit) {
      recentLimit = storedLimit;
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
    isGeneratingBriefing = true;
    try {
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
    } finally {
      isGeneratingBriefing = false;
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

  const handleRecentLimitChange = (limit: number) => {
    recentLimit = limit;
    if (activeVaultId) persistRecentLimit(activeVaultId, limit);
  };

  const startEditingBriefing = () => {
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
        </div>

        <FrontPageHero
          {coverImageUrl}
          {coverImage}
          {showCoverEditor}
          isSaving={worldStore.isSaving}
          {onClose}
          onOpenCoverEditor={openCoverEditor}
          onOpenLightbox={openCoverLightbox}
          onUploadCover={handleUploadCover}
          onGenerateCover={handleGenerateCover}
        />
      </header>

      <ZenImageLightbox
        bind:show={showCoverLightbox}
        imageUrl={coverImageUrl}
        title="World cover"
      />

      <div class="flex flex-1 flex-col gap-5 lg:gap-6">
        {#if worldStore.error}
          <p
            class="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {worldStore.error}
          </p>
        {/if}

        <FrontPageEntities
          {displayedRecentActivity}
          {recentLimit}
          isLoading={worldStore.isLoading}
          onRecentLimitChange={handleRecentLimitChange}
        />

        <FrontPageBriefing
          draftDescription={briefingPreview}
          {isEditingBriefing}
          {isDraftDirty}
          {hasBriefing}
          isSaving={worldStore.isSaving}
          isGenerating={isGeneratingBriefing}
          onSave={handleSaveDescription}
          onCancel={cancelEditingBriefing}
          onGenerate={handleGenerateBriefing}
          onEdit={startEditingBriefing}
        />
      </div>
    </div>
  {/if}
</section>
