<script lang="ts">
  import MapView from "$lib/components/map/MapView.svelte";
  import { mapStore } from "$lib/stores/map.svelte";
  import { vault } from "$lib/stores/vault.svelte";

  let showUpload = $state(false);
  let mapName = $state("");
  let files = $state<FileList | null>(null);

  async function handleUpload() {
    if (files && files[0]) {
      await mapStore.uploadMap(files[0], mapName || files[0].name);
      showUpload = false;
      mapName = "";
    }
  }
</script>

<div class="h-full flex flex-col bg-black overflow-hidden relative">
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
            <option value={map.id}>{map.name}</option>
          {/each}
        </select>

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
    <div
      class="flex-1 flex flex-col items-center justify-center p-8 text-center"
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
        Upload a world image or tactical layout to start mapping your lore
        spatially.
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
    <div
      class="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <div
        class="w-full max-w-md bg-theme-surface border border-theme-border rounded-xl p-8 shadow-2xl"
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
