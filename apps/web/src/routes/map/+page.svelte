<script lang="ts">
  import MapView from "$lib/components/map/MapView.svelte";
  import { mapStore } from "$lib/stores/map.svelte";
  import { vault } from "$lib/stores/vault.svelte";

  let showUpload = $state(false);
  let mapName = $state("");
  let files = $state<FileList | null>(null);

  async function handleUpload() {
    if (files && files[0]) {
      try {
        const result = await mapStore.uploadMap(
          files[0],
          mapName || files[0].name,
        );
        if (result === undefined) {
          if (typeof window !== "undefined") {
            alert("Failed to upload map. Please ensure your vault is active.");
          }
          return;
        }
        showUpload = false;
        mapName = "";
        files = null;
      } catch (err) {
        console.error("[MapPage] Error during handleUpload:", err);
        if (typeof window !== "undefined") {
          alert("An unexpected error occurred during upload.");
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
      // If dropping while modal is closed, open it to confirm name/upload
      if (!showUpload) {
        showUpload = true;
      }
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

<div class="flex-1 flex flex-col bg-black overflow-hidden relative">
  {#if mapStore.activeMap}
    <MapView>
      <!-- HUD Overlay -->
      <div class="absolute top-4 left-4 z-10 flex gap-2">
        {#if mapStore.canGoBack}
          <button
            class="px-3 py-1.5 bg-theme-surface border border-theme-border text-theme-text text-xs font-bold rounded-lg hover:border-theme-primary transition-colors flex items-center gap-2"
            onclick={() => mapStore.goBack()}
          >
            <span class="icon-[lucide--arrow-left] w-3 h-3"></span>
            BACK
          </button>
        {/if}

        <select
          class="bg-theme-surface border border-theme-border text-theme-text px-3 py-1.5 rounded-lg text-xs"
          value={mapStore.activeMapId}
          onchange={(e) => mapStore.selectMap(e.currentTarget.value)}
        >
          {#each Object.values(vault.maps) as map}
            <option value={map.id}>
              {map.isWorldMap ? "★ " : ""}{map.name}
            </option>
          {/each}
        </select>

        {#if mapStore.activeMap && !mapStore.activeMap.isWorldMap}
          <button
            class="px-3 py-1.5 bg-theme-surface border border-theme-border text-theme-muted text-[10px] font-bold rounded-lg hover:text-theme-primary hover:border-theme-primary transition-colors flex items-center gap-2"
            onclick={() => mapStore.setAsWorldMap(mapStore.activeMapId!)}
            title="Set as World Map"
          >
            <span class="icon-[lucide--star] w-3 h-3"></span>
            SET WORLD
          </button>
        {:else if mapStore.activeMap?.isWorldMap}
          <div
            class="px-3 py-1.5 bg-theme-primary/10 border border-theme-primary/30 text-theme-primary text-[10px] font-bold rounded-lg flex items-center gap-2"
          >
            <span class="icon-[lucide--star] w-3 h-3 fill-theme-primary"></span>
            WORLD MAP
          </div>
        {/if}

        <button
          class="px-3 py-1.5 bg-theme-surface border border-theme-border text-red-500/70 text-[10px] font-bold rounded-lg hover:text-red-400 hover:border-red-400 transition-colors flex items-center gap-2"
          onclick={async () => {
            if (
              confirm(
                "Are you sure you want to delete this map? This action cannot be undone.",
              )
            ) {
              await vault.deleteMap(mapStore.activeMapId!);
            }
          }}
          title="Delete Map"
        >
          <span class="icon-[lucide--trash-2] w-3 h-3"></span>
          DELETE
        </button>

        <button
          class="px-3 py-1.5 bg-theme-primary text-theme-bg text-xs font-bold rounded-lg uppercase tracking-wider"
          onclick={() => (showUpload = true)}
        >
          Add Map
        </button>
      </div>

      <div
        class="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 bg-theme-surface/80 backdrop-blur border border-theme-border p-2 rounded-xl shadow-2xl"
      >
        <button
          class="px-4 py-2 rounded-lg text-[10px] font-bold tracking-widest transition-all {mapStore.isGMMode
            ? 'bg-theme-primary text-theme-bg'
            : 'text-theme-muted hover:text-theme-text'}"
          onclick={() => (mapStore.isGMMode = !mapStore.isGMMode)}
        >
          {mapStore.isGMMode ? "GM MODE: ON" : "PLAYER VIEW"}
        </button>

        <div
          class="flex items-center gap-1 border-x border-theme-border px-2 mx-1"
        >
          <button
            class="px-4 py-2 rounded-lg text-[10px] font-bold tracking-widest transition-all {mapStore.showFog
              ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50'
              : 'text-theme-muted hover:text-theme-text'}"
            onclick={() => (mapStore.showFog = !mapStore.showFog)}
          >
            FOG: {mapStore.showFog ? "ON" : "OFF"}
          </button>

          <button
            class="px-4 py-2 rounded-lg text-[10px] font-bold tracking-widest transition-all {mapStore.showGrid
              ? 'bg-theme-primary/20 text-theme-primary border border-theme-primary/50'
              : 'text-theme-muted hover:text-theme-text'}"
            onclick={() => (mapStore.showGrid = !mapStore.showGrid)}
          >
            GRID: {mapStore.showGrid ? "ON" : "OFF"}
          </button>
        </div>

        {#if mapStore.isGMMode}
          <div
            class="flex items-center gap-3 px-4 border-r border-theme-border"
          >
            <span
              class="text-[9px] text-theme-muted font-bold tracking-tighter uppercase"
              >Brush Size</span
            >
            <input
              type="range"
              min="10"
              max="200"
              bind:value={mapStore.brushRadius}
              class="w-24 accent-theme-primary h-1"
            />
            <span class="text-[9px] text-theme-primary font-mono w-6"
              >{mapStore.brushRadius}px</span
            >
          </div>

          {#if mapStore.showGrid}
            <div
              class="flex items-center gap-3 px-4 border-r border-theme-border"
            >
              <span
                class="text-[9px] text-theme-muted font-bold tracking-tighter uppercase"
                >Grid Size</span
              >
              <input
                type="range"
                min="20"
                max="200"
                bind:value={mapStore.gridSize}
                class="w-24 accent-theme-primary h-1"
              />
              <span class="text-[9px] text-theme-primary font-mono w-6"
                >{mapStore.gridSize}px</span
              >
            </div>
          {/if}

          <div
            class="flex items-center px-2 text-[9px] text-theme-muted italic"
          >
            Hold Alt + Mouse to reveal
          </div>
        {/if}
      </div>
    </MapView>
  {:else}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="flex-1 flex flex-col items-center justify-center p-8 text-center transition-colors duration-200 {isDragging
        ? 'bg-theme-primary/10'
        : ''}"
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
    >
      <div
        class="w-24 h-24 mb-8 rounded-full bg-theme-primary/10 flex items-center justify-center"
      >
        <span class="icon-[lucide--map] text-theme-primary w-12 h-12"></span>
      </div>
      <h2
        class="text-3xl font-bold text-theme-text mb-4 font-header uppercase tracking-tight"
      >
        No active map
      </h2>
      <p
        class="text-theme-muted max-w-md mb-12 font-body font-light leading-relaxed"
      >
        Drag and drop a world image or tactical layout here, or click to upload
        and start mapping your lore spatially.
      </p>

      <button
        class="px-12 py-4 bg-theme-primary text-theme-bg font-bold uppercase tracking-[0.2em] text-sm rounded-lg hover:shadow-[0_0_30px_var(--color-accent-primary)] transition-all active:scale-95 font-header"
        onclick={() => (showUpload = true)}
      >
        Upload World Image
      </button>
    </div>
  {/if}

  {#if showUpload}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
    >
      <div
        class="w-full max-w-md bg-theme-surface border rounded-xl p-8 shadow-2xl transition-colors duration-200 {isDragging
          ? 'border-theme-primary'
          : 'border-theme-border'}"
      >
        <h3
          class="text-xl font-bold text-theme-text mb-6 uppercase tracking-wider font-header"
        >
          Upload New Map
        </h3>

        <div class="space-y-6">
          <div class="space-y-2">
            <label
              class="text-[10px] font-mono text-theme-muted uppercase tracking-widest"
              for="map-name"
            >
              Map Name
            </label>
            <input
              id="map-name"
              type="text"
              bind:value={mapName}
              placeholder="World Map, City Plan, etc."
              class="w-full bg-black/50 border border-theme-border text-theme-text px-4 py-3 rounded-lg focus:border-theme-primary outline-none transition-colors"
            />
          </div>

          <div class="space-y-2">
            <label
              class="text-[10px] font-mono text-theme-muted uppercase tracking-widest"
              for="map-file"
            >
              Image File
            </label>
            <input
              id="map-file"
              type="file"
              accept="image/*"
              bind:files
              class="w-full text-xs text-theme-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-theme-primary/10 file:text-theme-primary hover:file:bg-theme-primary/20"
            />
          </div>

          <div class="flex gap-4 pt-4">
            <button
              class="flex-1 px-6 py-3 border border-theme-border text-theme-muted rounded-lg hover:bg-theme-surface transition-colors uppercase text-[10px] font-bold tracking-widest"
              onclick={() => (showUpload = false)}
            >
              Cancel
            </button>
            <button
              class="flex-1 px-6 py-3 bg-theme-primary text-theme-bg rounded-lg font-bold uppercase text-[10px] tracking-widest"
              onclick={handleUpload}
              disabled={!files}
            >
              Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
