<script lang="ts">
  import type { Entity } from "schema";
  import { goto } from "$app/navigation";
  import { mapStore } from "$lib/stores/map.svelte";
  import { vault } from "$lib/stores/vault.svelte";

  let { entity } = $props<{ entity: Entity }>();

  let linkedMap = $derived.by(() => {
    return Object.values(vault.maps).find(
      (m) => m.parentEntityId === entity.id,
    );
  });

  let files = $state<FileList | null>(null);

  async function handleUpload() {
    console.log("[DetailMapTab] handleUpload triggered. Files:", files?.length);
    if (files && files[0]) {
      try {
        console.log("[DetailMapTab] Uploading sub-map for:", entity.title);
        const mapId = await mapStore.uploadMap(files[0], `${entity.title} Map`);
        if (!mapId) {
          console.error("[DetailMapTab] Upload failed (returned undefined)");
          if (typeof window !== "undefined") {
            alert("Failed to upload map. Please ensure your vault is active.");
          }
          return;
        }

        console.log(
          "[DetailMapTab] Linking map",
          mapId,
          "to entity",
          entity.id,
        );
        // Link the new map to this entity
        if (vault.maps[mapId]) {
          vault.maps[mapId].parentEntityId = entity.id;
          await vault.saveMaps();
          console.log("[DetailMapTab] Sub-map linked and saved.");
        }
        files = null;
      } catch (err) {
        console.error("[DetailMapTab] Error during handleUpload:", err);
        if (typeof window !== "undefined") {
          alert("An unexpected error occurred during upload.");
        }
      }
    }
  }

  async function handleDeleteMap() {
    if (!linkedMap) return;
    if (
      confirm(
        "Are you sure you want to delete this map? This action cannot be undone.",
      )
    ) {
      try {
        await vault.deleteMap(linkedMap.id);
      } catch (err: any) {
        if (typeof window !== "undefined") {
          alert(`Error deleting map: ${err.message}`);
        }
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
          class="text-[10px] font-bold text-theme-muted uppercase tracking-widest"
        >
          Linked Sub-Map
        </h4>
        <div class="flex items-center gap-3">
          <button
            class="text-[10px] font-bold text-red-500/70 hover:text-red-400 transition-colors uppercase tracking-widest flex items-center gap-1.5"
            onclick={handleDeleteMap}
            title="Delete this map"
          >
            <span class="icon-[lucide--trash-2] w-3 h-3"></span>
            DELETE
          </button>

          <div class="w-px h-3 bg-theme-border"></div>

          <button
            class="text-[10px] font-bold text-theme-primary hover:text-theme-text transition-colors uppercase tracking-widest flex items-center gap-1.5"
            onclick={() => {
              mapStore.selectMap(linkedMap!.id, true);
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
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 cursor-pointer"
          onclick={() => {
            mapStore.selectMap(linkedMap!.id, true);
            goto("/map");
          }}
        >
          <span
            class="px-4 py-2 bg-theme-primary text-theme-bg text-[10px] font-bold rounded uppercase tracking-widest shadow-xl"
          >
            Enter Location
          </span>
        </div>
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
        class="text-xs font-bold text-theme-text mb-2 uppercase tracking-tight"
      >
        No map attached
      </h4>
      <p
        class="text-[10px] text-theme-muted max-w-[200px] mx-auto mb-6 leading-relaxed"
      >
        Drag and drop a floor plan or local map here, or click to upload.
      </p>

      <label
        class="px-6 py-2 bg-theme-surface border border-theme-border text-theme-text text-[10px] font-bold rounded uppercase tracking-widest cursor-pointer hover:border-theme-primary transition-all active:scale-95"
      >
        Upload Map
        <input
          type="file"
          accept="image/*"
          class="hidden"
          onchange={handleUpload}
          bind:files
        />
      </label>
    </div>
  {/if}
</div>
