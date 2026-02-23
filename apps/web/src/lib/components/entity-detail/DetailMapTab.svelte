<script lang="ts">
  import type { Entity } from "schema";
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
    if (files && files[0]) {
      const mapId = await mapStore.uploadMap(files[0], `${entity.title} Map`);
      // Link the new map to this entity
      if (mapId && vault.maps[mapId]) {
        vault.maps[mapId].parentEntityId = entity.id;
        await vault.saveMaps();
      }
    }
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
        <button
          class="text-[10px] font-bold text-theme-primary hover:text-theme-text transition-colors uppercase tracking-widest"
          onclick={() => mapStore.selectMap(linkedMap!.id, true)}
        >
          View Map
        </button>
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
        <div
          class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"
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
    <div
      class="text-center py-12 border-2 border-dashed border-theme-border rounded-xl"
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
        Attach a floor plan or local map to this {entity.type} for spatial organization.
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
