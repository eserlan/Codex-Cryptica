<script lang="ts">
  import type { Entity } from "schema";
  import { vault } from "$lib/stores/vault.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { debugStore } from "$lib/stores/debug.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { fade } from "svelte/transition";
  import { isEntityVisible } from "schema";

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
  const isVisualizing = $derived(oracle.isVisualizingEntity(entity?.id));

  // Check if this entity is visible in guest/shared mode
  const isVisible = $derived.by(() => {
    if (!vault.isGuest) return true;
    return isEntityVisible(entity, {
      sharedMode: vault.isGuest,
      defaultVisibility: vault.defaultVisibility,
    });
  });

  $effect(() => {
    const imagePath = entity?.image;
    let stale = false;

    if (imagePath) {
      vault.resolveImageUrl(imagePath).then((url) => {
        if (!stale && entity?.image === imagePath) {
          resolvedImageUrl = url;
        }
      });
    } else {
      resolvedImageUrl = "";
    }

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
        alert("Failed to archive image from Oracle.");
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
        alert("Failed to save external image.");
      }
    }
  }
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
        onclick={() => uiStore.openLightbox(resolvedImageUrl, entity.title)}
        class="mb-4 w-full rounded border border-theme-border overflow-hidden relative group cursor-pointer hover:border-theme-primary transition block shadow-inner bg-theme-bg/30"
      >
        <img
          src={resolvedImageUrl}
          alt={entity.title}
          class="w-full h-auto max-h-48 md:max-h-80 object-contain opacity-90 group-hover:opacity-100 transition mx-auto"
        />
        <div
          class="absolute bottom-2 right-2 bg-theme-surface text-theme-primary text-[9px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition"
        >
          Click to enlarge
        </div>
      </button>
    </div>
  {:else}
    <div class="px-4 md:px-6">
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

        {#if oracle.tier === "advanced" && !uiStore.aiDisabled}
          <div class="mt-1 md:mt-2">
            <button
              onclick={() => oracle.drawEntity(entity.id)}
              disabled={isVisualizing}
              class="bg-theme-surface hover:bg-theme-surface/80 border border-theme-primary/30 hover:border-theme-primary transition-all flex items-center justify-center gap-2 px-2 py-1 md:px-3 md:py-1.5 rounded shadow-sm group/btn relative overflow-hidden"
              aria-label="Draw visualization for {entity.title}"
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
                    VISUALIZING...
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
                  >DRAW VISUAL</span
                >
              {/if}
            </button>
          </div>
        {/if}

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
                Visualizing in {oracle.activeStyleTitle}
              {:else}
                Building Visual
              {/if}
            </div>
          </div>
        {/if}
      </div>
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
