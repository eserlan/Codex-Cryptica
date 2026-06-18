<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { worldStore } from "$lib/stores/world.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { hexToRgb } from "$lib/utils/color";
  import { partitionAndSortRecentActivity } from "./front-page/front-page-entities";
  import {
    readRecentLimit,
    persistRecentLimit,
  } from "./front-page/front-page-prefs";
  import { DEFAULT_RECENT_LIMIT } from "./front-page/front-page-constants";
  import { FrontPageController } from "./front-page/front-page-controller";
  import FrontPageHero from "./FrontPageHero.svelte";
  import FrontPageEntities from "./FrontPageEntities.svelte";
  import FrontPageBriefing from "./FrontPageBriefing.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
  import { openImportWindow } from "$lib/stores/ui/navigation";

  let { onClose }: { onClose?: () => void } = $props();

  const controller = new FrontPageController({
    worldStore,
    vault,
    themeStore,
  });

  let lastLoadedVaultId: string | null = null;
  let draftDescription = $state("");
  let isDraftDirty = $state(false);

  const activeVaultId = $derived(vault.activeVaultId);
  const themeTokens = $derived(themeStore.activeTheme.tokens);
  const metadata = $derived(worldStore.metadata);
  const briefingSource = $derived(
    worldStore.metadata?.description?.trim() ||
      worldStore.frontPageEntity?.chronicle?.trim() ||
      worldStore.frontPageEntity?.content?.trim() ||
      "",
  );
  let recentLimit = $state(DEFAULT_RECENT_LIMIT);
  const recentActivity = $derived(worldStore.recentActivity);
  const displayedRecentActivity = $derived(
    partitionAndSortRecentActivity(recentActivity, recentLimit),
  );
  const coverImage = $derived(metadata?.coverImage || "");
  const _worldName = $derived(metadata?.name?.trim() || vault.vaultName || "");
  const isEmpty = $derived(vault.allEntities.length === 0);
  const aiDisabled = $derived(discoveryPolicyStore.aiDisabled);
  const hasBriefing = $derived(
    !!(
      draftDescription.trim() ||
      worldStore.metadata?.description?.trim() ||
      worldStore.frontPageEntity?.chronicle?.trim() ||
      worldStore.frontPageEntity?.content?.trim()
    ),
  );

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

  let isEditingBriefing = $state(false);
  let showCoverEditor = $state(false);
  let coverImageUrl = $state("");
  let lastCoverImage = "";
  let isWorldReady = $state(false);
  let lastLoadedRecentLimit = DEFAULT_RECENT_LIMIT;
  let isRevisingBriefing = $state(false);

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
      if (!stale) {
        coverImageUrl = url || "";
        if (import.meta.env.DEV) {
          console.log("[FrontPage] Resolved cover image URL:", coverImageUrl);
        }
      }
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
      const confirmed = await notificationStore.confirm({
        title: "Revise Briefing",
        message:
          "This will replace your current world briefing with a new one generated from your notes. Continue?",
        confirmLabel: "Revise",
        cancelLabel: "Keep Existing",
      });
      if (!confirmed) return;
    }

    // Build context and generate
    isRevisingBriefing = true;
    try {
      let contextResult: Awaited<
        ReturnType<typeof controller.buildRetrievedWorldContext>
      > = { content: "" };
      try {
        const frontpageContext =
          await controller.buildFrontpageEntityContextAsync();
        contextResult =
          await controller.buildRetrievedWorldContext(frontpageContext);
      } catch {
        // Context retrieval is non-critical; proceed without it
      }
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
      isRevisingBriefing = false;
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

  const handleDraftDescriptionChange = (value: string) => {
    draftDescription = value;
    isDraftDirty = true;
  };

  const openCoverEditor = () => {
    showCoverEditor = true;
  };

  const closeCoverEditor = () => {
    showCoverEditor = false;
  };

  const openCoverLightbox = (
    e?:
      | MouseEvent
      | { x: number; y: number; width: number; height: number }
      | null,
  ) => {
    if (coverImageUrl) {
      let rect: { x: number; y: number; width: number; height: number } | null =
        null;
      if (e instanceof MouseEvent && e.currentTarget) {
        const clientRect = (
          e.currentTarget as HTMLElement
        ).getBoundingClientRect();
        rect = {
          x: clientRect.left,
          y: clientRect.top,
          width: clientRect.width,
          height: clientRect.height,
        };
      } else if (
        e &&
        typeof e === "object" &&
        !(e instanceof MouseEvent) &&
        "x" in e
      ) {
        rect = e as { x: number; y: number; width: number; height: number };
      }
      modalUIStore.openLightbox(coverImageUrl, "World cover", rect);
    }
  };

  const cancelEditingBriefing = () => {
    draftDescription = briefingSource;
    isDraftDirty = false;
    isEditingBriefing = false;
  };

  const handleGenerateStarterWorld = async () => {
    oracle.open();
    await oracle.chat.sendMessage(
      "Generate a starter world with 3 basic entities: a main location, a key character, and an active quest or conflict.",
    );
  };
</script>

<section
  data-testid="front-page-shell"
  class="front-page-shell world-canvas relative isolate min-h-[calc(var(--app-content-height)-2rem)] overflow-hidden rounded-[2rem] border border-theme-border p-4 sm:p-5 md:p-8 xl:p-10 shadow-[0_30px_120px_rgba(0,0,0,0.35)]"
  style={`background-color: ${themeTokens.background}; background-image: var(--bg-texture-overlay), radial-gradient(circle at top, rgba(${hexToRgb(
    themeTokens.primary,
  )}, 0.16), transparent 48%), linear-gradient(180deg, rgba(${hexToRgb(
    themeTokens.background,
  )}, 0.92), rgba(${hexToRgb(themeTokens.background)}, 0.98));`}
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
        class="absolute inset-0 pointer-events-none bg-cover bg-center opacity-55"
        style={`background-image: url("${coverImageUrl}"); filter: saturate(0.92) contrast(1.04);`}
      ></div>
    {/if}
    <div
      class="absolute inset-0 pointer-events-none opacity-65"
      style={`background-image: var(--frontpage-vignette), radial-gradient(circle at top, rgba(${hexToRgb(
        themeTokens.primary,
      )}, 0.08), transparent 48%), linear-gradient(180deg, rgba(${hexToRgb(
        themeTokens.background,
      )}, 0.1), rgba(${hexToRgb(themeTokens.background)}, 0.75));`}
    ></div>
    <div
      class="absolute inset-0 pointer-events-none opacity-40 bg-[linear-gradient(transparent_0,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,transparent_0,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]"
      style={`background-image: linear-gradient(transparent 0, rgba(${hexToRgb(
        themeTokens.surface,
      )}, 0.03) 1px, transparent 1px), linear-gradient(90deg, transparent 0, rgba(${hexToRgb(
        themeTokens.surface,
      )}, 0.03) 1px, transparent 1px)`}
    ></div>

    <div
      class="relative z-10 flex min-h-[inherit] flex-col gap-6 md:gap-8 xl:gap-10"
    >
      <header
        class="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"
      >
        <div class="w-full space-y-4 xl:pr-56 sr-only">
          <div
            class="inline-flex items-center gap-2 rounded-full border border-theme-primary/45 bg-theme-surface/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-theme-primary shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-theme-primary)_12%,transparent)] backdrop-blur-sm"
          >
            <span class="w-2 h-2 rounded-full bg-theme-primary animate-pulse"
            ></span>
            Front Page
          </div>
          <h1
            class="font-header text-4xl font-black tracking-tight text-theme-text sm:text-5xl xl:text-6xl uppercase"
          >
            {_worldName}
          </h1>
        </div>

        {#if coverImage}
          <div
            class="flex items-center gap-2 max-xl:absolute max-xl:right-0 max-xl:top-0"
          >
            <button
              class="inline-flex h-9 items-center rounded-full border border-theme-primary/45 px-4 text-[9px] font-bold uppercase tracking-[0.2em] text-theme-primary transition-colors hover:bg-theme-primary/12 hover:border-theme-primary/60 disabled:opacity-50"
              onclick={openCoverEditor}
              disabled={worldStore.isSaving}
            >
              Change Image
            </button>
            <button
              class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-theme-border bg-theme-bg/70 text-theme-muted backdrop-blur-sm transition-colors hover:border-theme-primary/50 hover:text-theme-primary"
              onclick={openCoverLightbox}
              aria-label="Open cover image lightbox"
              title="Open cover image"
            >
              <span class="icon-[lucide--maximize-2] h-4 w-4"></span>
            </button>
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
        {:else if onClose}
          <div class="flex justify-end xl:absolute xl:right-0 xl:top-0">
            <button
              class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-theme-border bg-theme-bg/70 text-theme-muted backdrop-blur-sm transition-colors hover:border-theme-primary/50 hover:text-theme-primary"
              onclick={onClose}
              aria-label="Close front page"
              title="Close front page"
            >
              <span class="icon-[lucide--x] h-4 w-4"></span>
            </button>
          </div>
        {/if}
      </header>

      <div class="flex flex-1 flex-col gap-5 lg:gap-6">
        {#if isEmpty && !showCoverEditor}
          <div
            data-testid="start-your-world-card"
            class="rounded-3xl border border-theme-primary/30 bg-theme-surface/90 p-6 sm:p-8 flex flex-col gap-4 shadow-xl backdrop-blur-sm"
          >
            <div>
              <div
                class="inline-flex items-center gap-2 rounded-full border border-theme-primary/30 bg-theme-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-theme-primary mb-3"
              >
                <span class="icon-[lucide--sparkles] h-3.5 w-3.5"></span>
                First Steps
              </div>
              <h2
                class="font-header text-xl font-bold text-theme-text sm:text-2xl"
              >
                Start your world
              </h2>
              <p class="mt-2 text-sm text-theme-muted leading-relaxed max-w-xl">
                Welcome to your new archive! Start shaping your world by
                creating your first entity, importing existing notes, or letting
                the Oracle generate starter content.
              </p>
            </div>

            <div class="flex flex-wrap gap-3 mt-2">
              <button
                class="inline-flex items-center gap-2 rounded-full bg-theme-primary px-5 py-2.5 text-xs font-bold uppercase tracking-[0.15em] text-theme-bg hover:opacity-90 transition-opacity"
                onclick={() => modalUIStore.requestCreateEntity()}
              >
                <span class="icon-[lucide--plus] h-4 w-4"></span>
                Create Entity
              </button>

              <button
                class="inline-flex items-center gap-2 rounded-full border border-theme-border bg-theme-surface hover:bg-theme-bg/50 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.15em] text-theme-text transition-colors"
                onclick={() => openImportWindow()}
              >
                <span class="icon-[lucide--upload] h-4 w-4"></span>
                Import
              </button>

              {#if !discoveryPolicyStore.aiDisabled}
                <button
                  class="inline-flex items-center gap-2 rounded-full border border-theme-primary/45 bg-theme-primary/10 hover:bg-theme-primary/20 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.15em] text-theme-primary transition-colors"
                  onclick={handleGenerateStarterWorld}
                >
                  <span class="icon-[lucide--bot] h-4 w-4"></span>
                  Generate starter world
                </button>
              {:else}
                <button
                  class="inline-flex items-center gap-2 rounded-full border border-dashed border-theme-border bg-theme-surface/30 hover:bg-theme-surface px-5 py-2.5 text-xs font-medium uppercase tracking-[0.15em] text-theme-muted transition-colors"
                  onclick={() => modalUIStore.openSettings("intelligence")}
                >
                  <span class="icon-[lucide--settings] h-4 w-4"></span>
                  Set up AI to generate
                </button>
              {/if}
            </div>
          </div>
        {:else if showCoverEditor || !coverImage}
          <FrontPageHero
            {coverImageUrl}
            {coverImage}
            {showCoverEditor}
            {aiDisabled}
            showActions={false}
            isSaving={worldStore.isSaving}
            onOpenCoverEditor={openCoverEditor}
            onCloseCoverEditor={closeCoverEditor}
            onOpenLightbox={openCoverLightbox}
            onUploadCover={handleUploadCover}
            onGenerateCover={handleGenerateCover}
            onSetupAI={() => modalUIStore.openSettings("intelligence")}
            class="w-full"
          />
        {/if}
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
          bind:draftDescription
          {isEditingBriefing}
          {isDraftDirty}
          {hasBriefing}
          isSaving={worldStore.isSaving}
          isRevising={isRevisingBriefing}
          onSave={handleSaveDescription}
          onCancel={cancelEditingBriefing}
          onGenerate={handleGenerateBriefing}
          onEdit={startEditingBriefing}
          onDraftChange={handleDraftDescriptionChange}
        />
      </div>
    </div>
  {/if}
</section>
