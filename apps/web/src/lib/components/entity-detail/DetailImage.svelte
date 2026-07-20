<script lang="ts">
  import type { Entity } from "schema";
  import { vault } from "$lib/stores/vault.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { debugStore } from "$lib/stores/debug.svelte";
  import { fade } from "svelte/transition";
  import { isEntityVisible, resolveArtDirection } from "schema";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
  import { p2pHost } from "$lib/cloud-bridge/p2p/host-service.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

  let {
    entity,
    isEditing,
    editImage = $bindable(),
  } = $props<{
    entity: Entity;
    isEditing: boolean;
    editImage: string;
  }>();

  let resolvedImageUrl = $state("");
  let isDraggingOver = $state(false);
  let isImageLoaded = $state(false);

  $effect(() => {
    // Reset loaded state when image URL changes
    if (resolvedImageUrl) {
      isImageLoaded = false;
    }
  });
  const isVisualizing = $derived(oracle.isVisualizingEntity(entity?.id));

  // Check if this entity is visible in guest/shared mode
  const isVisible = $derived.by(() => {
    if (!vault.isGuest) return true;
    return isEntityVisible(entity, {
      sharedMode: vault.isGuest,
      defaultVisibility: vault.defaultVisibility,
    });
  });

  const artDirectionPrompt = $derived.by(() => {
    if (!entity) return "";
    const res = resolveArtDirection({
      surface: "entity",
      subject: entity.title,
      categoryId: entity.type,
      themeId: themeStore.activeTheme?.id || "default",
      entityArtDirection: entity.artDirection,
    });
    return res.prompt;
  });

  $effect(() => {
    const imagePath = entity?.image;
    const thumbnailPath = entity?.thumbnail;
    let stale = false;

    const resolveImage = async () => {
      let url = "";
      if (imagePath) {
        url = await vault.resolveImageUrl(imagePath);
      }
      // Fallback to thumbnail if full image resolution fails (e.g. timeout on large P2P file)
      if (!url && thumbnailPath) {
        url = await vault.resolveImageUrl(thumbnailPath);
      }

      if (
        !stale &&
        (entity?.image === imagePath || entity?.thumbnail === thumbnailPath)
      ) {
        resolvedImageUrl = url;
      }
    };

    resolveImage();

    return () => {
      stale = true;
    };
  });

  const handleDragOver = (e: DragEvent) => {
    if (vault.isGuest) return;
    e.preventDefault();
    if (
      e.dataTransfer?.types.includes("application/codex-image-id") ||
      e.dataTransfer?.types.includes("Files")
    ) {
      isDraggingOver = true;
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDragLeave = () => {
    if (vault.isGuest) return;
    isDraggingOver = false;
  };

  const handleDrop = async (e: DragEvent) => {
    if (vault.isGuest) return;
    e.preventDefault();
    isDraggingOver = false;

    if (!entity) return;

    const customId = e.dataTransfer?.getData("application/codex-image-id");
    const message = customId
      ? oracle.messages.find((m) => m.id === customId)
      : null;

    if (message?.imageBlob) {
      try {
        const { image, thumbnail } = await vault.saveImageToVault(
          message.imageBlob,
          entity.id,
        );
        await vault.updateEntity(entity.id, { image, thumbnail });
      } catch (err) {
        debugStore.error("[DetailImage] Failed to save Oracle image:", err);
        notificationStore.notify(
          "Failed to archive image from Oracle. Check the console for details.",
          "error",
        );
      }
      return;
    }

    // Fallback to standard file drop
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      await handleFileDrop(e.dataTransfer.files[0]);
    }
  };

  async function handleFileDrop(file: File) {
    if (!entity || !file) return;
    if (file.type.startsWith("image/")) {
      try {
        const { image, thumbnail } = await vault.saveImageToVault(
          file,
          entity.id,
        );
        await vault.updateEntity(entity.id, { image, thumbnail });
      } catch (err) {
        debugStore.error("[DetailImage] Failed to save external file:", err);
        notificationStore.notify(
          "Failed to save image. Check the console for details.",
          "error",
        );
      }
    }
  }

  const canGenerateImage = $derived.by(() => {
    const provider = oracle.settings?.imageProvider || "cloudflare";
    if (provider === "cloudflare") return true;
    if (provider === "custom") return !!oracle.settings?.customImageApiKey;
    return !!oracle.apiKey;
  });
</script>

<div
  class="relative {isDraggingOver
    ? 'ring-2 ring-oracle-primary ring-offset-4 ring-offset-black bg-oracle-primary/10'
    : ''} transition-all rounded-lg"
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  role="region"
  aria-label="Image drop zone"
>
  {#if isEditing}
    <div class="mb-4 px-4 md:px-6">
      <label
        class="block text-[10px] text-theme-secondary font-bold mb-1"
        for="entity-image-url">IMAGE URL</label
      >
      <input
        id="entity-image-url"
        type="text"
        bind:value={editImage}
        class="bg-theme-bg border border-theme-border text-theme-text px-2 py-1 text-xs focus:outline-none focus:border-theme-primary w-full placeholder-theme-muted/50"
        placeholder="https://..."
      />
    </div>
  {:else if !isVisible && vault.isGuest}
    <div class="px-4 md:px-6">
      <div
        class="mb-4 w-full py-2 md:py-4 md:h-40 rounded border border-dashed border-theme-border flex flex-col items-center justify-center gap-2 md:gap-4 text-theme-muted bg-theme-bg/30"
      >
        <span class="icon-[lucide--lock] w-4 h-4 md:w-6 md:h-6 opacity-30"
        ></span>
        <span
          class="text-[8px] md:text-[9px] font-bold uppercase font-header opacity-40"
          >Image Hidden</span
        >
      </div>
    </div>
  {:else if entity.image}
    <div class="px-4 md:px-6">
      <button
        type="button"
        disabled={!resolvedImageUrl}
        onclick={(e) => {
          if (!resolvedImageUrl) return;
          const rect = e.currentTarget.getBoundingClientRect();
          modalUIStore.openLightbox(
            resolvedImageUrl,
            entity.title,
            {
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height,
            },
            entity.image,
          );
        }}
        class="mb-4 w-full aspect-[16/10] max-h-48 md:max-h-80 rounded border border-theme-border overflow-hidden relative group cursor-pointer hover:border-theme-primary transition block shadow-inner bg-theme-bg/30 disabled:cursor-wait"
      >
        {#if !isImageLoaded}
          <div
            class="absolute inset-0 flex flex-col items-center justify-center bg-theme-bg/40 animate-pulse text-theme-muted gap-2"
          >
            <span class="icon-[lucide--image] w-8 h-8 opacity-30"></span>
            <span
              class="text-[9px] font-mono uppercase tracking-wider opacity-40"
              >Resolving Neural Visual...</span
            >
          </div>
        {/if}
        <img
          src={resolvedImageUrl}
          alt={entity.title}
          loading="lazy"
          decoding="async"
          onload={() => {
            isImageLoaded = true;
          }}
          onerror={() => {
            isImageLoaded = true;
          }}
          class="w-full h-full object-contain transition-all duration-300 mx-auto {isImageLoaded
            ? 'opacity-90 group-hover:opacity-100 scale-100'
            : 'opacity-0 scale-95'}"
        />
        <div
          class="absolute bottom-2 right-2 bg-theme-surface text-theme-primary text-[9px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition"
        >
          Click to enlarge
        </div>
      </button>
      {#if p2pHost.isHosting}
        <button
          type="button"
          onclick={() => {
            const success = mapSession.showImageToPlayers(
              entity.title,
              entity.image,
            );
            if (success) {
              notificationStore.notify("Shared image with guests", "success");
            }
          }}
          class="w-full mt-2 bg-theme-surface hover:bg-theme-surface/80 border border-theme-primary/30 hover:border-theme-primary transition-all flex items-center justify-center gap-2 px-3 py-1.5 rounded shadow-sm group/btn relative overflow-hidden mb-4"
          aria-label="Show image to guests"
        >
          <span
            aria-hidden="true"
            class="icon-[lucide--share-2] w-4 h-4 text-theme-primary"
          ></span>
          <span
            class="text-[9px] font-bold tracking-widest text-theme-primary relative z-10"
            >SHOW TO GUESTS</span
          >
        </button>
      {/if}
    </div>
  {:else}
    <div class="px-4 md:px-6">
      {#if !discoveryPolicyStore.aiDisabled && !vault.isGuest}
        <div
          class="mb-4 w-full py-2 md:py-4 md:h-40 rounded border border-dashed border-theme-border flex flex-col items-center justify-center gap-2 md:gap-4 text-theme-muted hover:border-theme-primary/50 transition relative overflow-hidden bg-theme-bg/30"
        >
          <div class="flex flex-col items-center justify-center gap-1 md:gap-2">
            <span class="icon-[lucide--image] w-4 h-4 md:w-8 md:h-8 opacity-20"
            ></span>
            <span
              class="text-[8px] md:text-[9px] font-bold uppercase font-header opacity-40"
              >No Image</span
            >
          </div>

          <div class="mt-1 md:mt-2">
            <button
              onclick={() => oracle.drawEntity(entity.id)}
              disabled={isVisualizing}
              class="bg-theme-surface hover:bg-theme-surface/80 border border-theme-primary/30 hover:border-theme-primary transition-all flex items-center justify-center gap-2 px-2 py-1 md:px-3 md:py-1.5 rounded shadow-sm group/btn relative overflow-hidden"
              aria-label={canGenerateImage
                ? `Generate image for ${entity.title}`
                : `Generate image prompt for ${entity.title}`}
              aria-busy={isVisualizing}
            >
              {#if isVisualizing}
                <span
                  class="icon-[lucide--loader-2] w-3 h-3 md:w-4 md:h-4 animate-spin text-theme-primary"
                  aria-hidden="true"
                ></span>
                <span
                  class="text-[7px] md:text-[8px] font-bold tracking-widest text-theme-primary text-center px-2"
                  aria-live="polite"
                >
                  {#if oracle.activeStyleTitle}
                    STYLE: {oracle.activeStyleTitle.toUpperCase()}
                  {:else}
                    {canGenerateImage ? "VISUALIZING..." : "GENERATING..."}
                  {/if}
                </span>
              {:else}
                <div
                  class="absolute inset-0 bg-theme-primary/10 opacity-0 group-hover/btn:opacity-100 transition-opacity"
                ></div>
                <span
                  class="icon-[lucide--palette] w-3 h-3 md:w-3.5 md:h-3.5 text-theme-primary opacity-80"
                  aria-hidden="true"
                ></span>
                <span
                  class="text-[8px] md:text-[9px] font-bold tracking-widest text-theme-primary relative z-10"
                  >{canGenerateImage
                    ? "GENERATE IMAGE"
                    : "GENERATE PROMPT"}</span
                >
              {/if}
            </button>
          </div>

          {#if isVisualizing}
            <div
              class="absolute inset-0 bg-theme-bg/75 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 border border-theme-primary/20"
            >
              <span
                class="icon-[lucide--loader-2] w-5 h-5 animate-spin text-theme-primary"
                aria-hidden="true"
              ></span>
              <div
                class="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] font-header text-theme-primary text-center px-4"
                aria-live="polite"
              >
                {#if oracle.activeStyleTitle}
                  {canGenerateImage
                    ? `Visualizing in ${oracle.activeStyleTitle}`
                    : `Generating prompt in ${oracle.activeStyleTitle}`}
                {:else}
                  {canGenerateImage ? "Building Visual" : "Generating Prompt"}
                {/if}
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <button
          type="button"
          onclick={async () => {
            await navigator.clipboard.writeText(artDirectionPrompt);
            notificationStore.notify(
              "Copied image prompt to clipboard",
              "success",
            );
          }}
          class="mb-4 w-full aspect-[16/10] max-h-48 md:max-h-80 rounded border border-theme-border overflow-hidden relative flex flex-col shadow-inner bg-theme-bg/30 group text-left cursor-pointer hover:border-theme-primary transition focus:outline-none focus:border-theme-primary"
        >
          <div
            class="absolute top-2 left-2 flex items-center gap-2 opacity-30 text-theme-muted select-none pointer-events-none transition-opacity group-hover:opacity-100"
          >
            <span class="icon-[lucide--pen-tool] w-4 h-4"></span>
            <span
              class="text-[8px] font-header uppercase tracking-widest font-bold"
              >Image Prompt</span
            >
          </div>
          <div
            class="absolute top-2 right-2 flex items-center gap-1 opacity-0 text-theme-primary select-none pointer-events-none transition-opacity group-hover:opacity-100 group-focus:opacity-100"
          >
            <span class="icon-[lucide--copy] w-3 h-3"></span>
            <span
              class="text-[8px] font-header uppercase tracking-widest font-bold"
              >Click to Copy</span
            >
          </div>
          <div
            class="flex-1 overflow-y-auto custom-scrollbar p-6 pt-8 flex items-center justify-center h-full w-full"
          >
            <p
              class="text-sm md:text-base text-theme-muted/80 italic font-serif text-center leading-relaxed"
            >
              {artDirectionPrompt}
            </p>
          </div>
        </button>
      {/if}
    </div>
  {/if}

  {#if isDraggingOver}
    <div
      class="absolute inset-0 bg-oracle-dim/20 backdrop-blur-sm flex items-center justify-center rounded-lg pointer-events-none"
      transition:fade
    >
      <div class="flex flex-col items-center gap-2">
        <span
          class="icon-[lucide--download-cloud] w-8 h-8 text-oracle-primary animate-bounce"
        ></span>
        <span
          class="text-[10px] font-bold text-oracle-primary tracking-widest uppercase font-header"
          >Drop to Archive</span
        >
      </div>
    </div>
  {/if}
</div>
