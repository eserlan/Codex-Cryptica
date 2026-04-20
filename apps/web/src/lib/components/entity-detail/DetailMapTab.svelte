<script lang="ts">
  import type { Entity } from "schema";
  import { goto } from "$app/navigation";
  import { mapStore } from "$lib/stores/map.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";

  let { entity } = $props<{ entity?: Entity | null }>();

  let linkedMap = $derived.by(() => {
    if (!entity) return undefined;
    return Object.values(vault.maps).find(
      (m) => m.parentEntityId === entity.id,
    );
  });

  let files = $state<FileList | null>(null);

  async function handleUpload() {
    if (files && files[0] && entity) {
      try {
        const mapId = await mapStore.uploadMap(files[0], `${entity.title} Map`);
        if (!mapId) {
          uiStore.notify(
            "Failed to upload map. Please ensure your vault is active.",
            "error",
          );
          return;
        }

        // Link the new map to this entity
        if (vault.maps[mapId]) {
          vault.maps[mapId].parentEntityId = entity.id;
          await vault.saveMaps();
        }
        files = null;
      } catch (err) {
        console.error("[DetailMapTab] Error during handleUpload:", err);
        uiStore.notify("An unexpected error occurred during upload.", "error");
      }
    }
  }

  async function handleDeleteMap() {
    if (!linkedMap) return;
    if (
      await uiStore.confirm({
        title: "Clear Points",
        message:
          "Are you sure you want to delete this map? This action cannot be undone.",
        isDangerous: true,
      })
    ) {
      try {
        await vault.deleteMap(linkedMap.id);
      } catch (err: any) {
        uiStore.notify(`Error deleting map: ${err.message}`, "error");
      }
    }
  }

  let isDragging = $state(false);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;

    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      files = dt.files;
      handleUpload();
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
  }
</script>

<div class="p-4 md:p-6 space-y-6">
  {#if linkedMap}
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h4
          class="text-[10px] font-bold text-theme-muted uppercase font-header tracking-widest"
        >
          Linked Sub-Map
        </h4>
        <div class="flex items-center gap-3">
          <button
            class="text-[10px] font-bold text-red-500/70 hover:text-red-400 transition-colors uppercase font-header tracking-widest flex items-center gap-1.5"
            onclick={handleDeleteMap}
            title="Delete this map"
            aria-label="Delete map"
          >
            <span class="icon-[lucide--trash-2] w-3 h-3"></span>
            DELETE
          </button>

          <div class="w-px h-3 bg-theme-border"></div>

          <button
            class="text-[10px] font-bold text-theme-primary hover:text-theme-text transition-colors uppercase font-header tracking-widest flex items-center gap-1.5"
            onclick={() => {
              mapStore.selectMap(linkedMap!.id, true);
              uiStore.closeZenMode();
              goto("/map");
            }}
          >
            <span class="icon-[lucide--map] w-3 h-3"></span>
            VIEW MAP
          </button>
        </div>
      </div>

      <div
        class="aspect-video bg-black/40 rounded-lg border border-theme-border flex items-center justify-center overflow-hidden relative group"
      >
        {#await vault.resolveImageUrl(linkedMap.assetPath) then url}
          <img
            src={url}
            alt={linkedMap.name}
            class="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
          />
        {/await}
        <button
          type="button"
          class="absolute inset-0 w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 focus:ring-2 focus:ring-theme-primary focus:outline-none transition-opacity bg-black/40 cursor-pointer"
          aria-label={`Enter location: ${linkedMap.name}`}
          onclick={() => {
            mapStore.selectMap(linkedMap!.id, true);
            uiStore.closeZenMode();
            goto("/map");
          }}
        >
          <span
            class="px-4 py-2 bg-theme-primary text-theme-bg text-[10px] font-bold rounded uppercase font-header tracking-widest shadow-xl"
          >
            Enter Location
          </span>
        </button>
      </div>
    </div>
  {:else}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="text-center py-12 border-2 border-dashed rounded-xl transition-colors duration-200 {isDragging
        ? 'border-theme-primary bg-theme-primary/5'
        : 'border-theme-border'}"
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
    >
      <div
        class="w-12 h-12 rounded-full bg-theme-primary/10 flex items-center justify-center mx-auto mb-4"
      >
        <span class="icon-[lucide--map-pin] text-theme-primary w-6 h-6"></span>
      </div>
      <h4
        class="text-xs font-bold text-theme-text mb-2 uppercase font-header tracking-tight"
      >
        No map attached
      </h4>
      <p
        class="text-[10px] text-theme-muted max-w-[200px] mx-auto mb-6 leading-relaxed"
      >
        Drag and drop a floor plan or local map here, or click to upload.
      </p>

      <label
        class="px-6 py-2 bg-theme-surface border border-theme-border text-theme-text text-[10px] font-bold rounded uppercase font-header tracking-widest cursor-pointer hover:border-theme-primary transition-all active:scale-95 focus-within:ring-2 focus-within:ring-theme-primary focus-within:outline-none focus-within:ring-offset-2 focus-within:ring-offset-theme-bg"
      >
        Upload Map
        <input
          type="file"
          accept="image/*"
          class="sr-only"
          onchange={handleUpload}
          bind:files
        />
      </label>
    </div>
  {/if}
</div>
