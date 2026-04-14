<script lang="ts">
  import MapView from "$lib/components/map/MapView.svelte";
  import VTTControls from "$lib/components/map/VTTControls.svelte";
  import VTTGridColorMenu from "$lib/components/map/VTTGridColorMenu.svelte";
  import VTTModeToggle from "$lib/components/map/VTTModeToggle.svelte";
  import ShareModal from "$lib/components/ShareModal.svelte";
  import TokenAddDialog from "$lib/components/vtt/TokenAddDialog.svelte";
  import TokenDetail from "$lib/components/vtt/TokenDetail.svelte";
  import InitiativePanel from "$lib/components/vtt/InitiativePanel.svelte";
  import VTTChatSidebar from "$lib/components/vtt/VTTChatSidebar.svelte";
  import GuestInfoOverlay from "$lib/components/vtt/GuestInfoOverlay.svelte";
  import VTTSharedImageLightbox from "$lib/components/vtt/VTTSharedImageLightbox.svelte";
  import {
    getPrimaryButtonStateClass,
    getMeasurementToolButtonClass,
    shouldShowInitiativePanel,
  } from "$lib/components/map/vtt-ui";
  import { handleActiveMapSelection } from "$lib/components/map/map-page-actions";
  import { p2pHost } from "$lib/cloud-bridge/p2p/host-service.svelte";
  import { mapStore } from "$lib/stores/map.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";

  const showInitiativePanel = $derived(
    shouldShowInitiativePanel(mapSession.vttEnabled, mapSession.mode),
  );
  const hasSelectedToken = $derived(Boolean(mapSession.selectedToken));

  let showUpload = $state(false);
  let showVttShare = $state(false);
  let isVttChatSidebarCollapsed = $state(false);
  let isVttSidebarCollapsed = $state(false);
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
          uiStore.notify(
            "Failed to upload map. Please ensure your vault is active.",
            "error",
          );
          return;
        }
        showUpload = false;
        mapName = "";
        files = null;
      } catch (err) {
        console.error("[MapPage] Error during handleUpload:", err);
        uiStore.notify("An unexpected error occurred during upload.", "error");
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

<div class="flex-1 flex flex-col bg-theme-bg overflow-hidden relative">
  {#if mapStore.activeMap}
    <MapView>
      {#if mapSession.vttEnabled}
        <VTTChatSidebar bind:collapsed={isVttChatSidebarCollapsed} />

        <aside
          class="absolute top-0 right-0 bottom-0 z-[30] flex overflow-hidden border-l border-theme-border bg-theme-surface/95 shadow-[0_0_30px_rgba(0,0,0,0.25)] backdrop-blur transition-all duration-200 pointer-events-auto {isVttSidebarCollapsed
            ? 'w-12'
            : 'w-[22rem] max-w-[calc(100vw-3rem)]'}"
          aria-label="VTT Sidebar"
        >
          {#if isVttSidebarCollapsed}
            <div
              class="flex h-full w-full flex-col items-center justify-between p-2"
            >
              <button
                class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-theme-border bg-theme-bg/70 text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-text hover:bg-theme-primary/10"
                onclick={() => (isVttSidebarCollapsed = false)}
                aria-label="Expand VTT Sidebar"
                aria-expanded="false"
                type="button"
              >
                <span class="icon-[lucide--panel-right-open] w-4 h-4"></span>
              </button>

              <div class="flex flex-1 items-center justify-center">
                <span
                  class="rotate-180 text-[10px] font-black uppercase tracking-[0.4em] text-theme-muted [writing-mode:vertical-rl]"
                >
                  VTT
                </span>
              </div>
            </div>
          {:else}
            <div class="flex h-full min-h-0 w-full flex-col">
              <div
                class="flex items-center justify-between gap-3 border-b border-theme-border/70 px-3 py-3"
              >
                <div>
                  <div
                    class="text-[9px] font-black uppercase tracking-[0.35em] text-theme-muted"
                  >
                    VTT Sidebar
                  </div>
                </div>

                <button
                  class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-theme-border bg-theme-bg/70 text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-text hover:bg-theme-primary/10"
                  onclick={() => (isVttSidebarCollapsed = true)}
                  aria-label="Collapse VTT Sidebar"
                  aria-expanded="true"
                  type="button"
                >
                  <span class="icon-[lucide--panel-right-close] w-4 h-4"></span>
                </button>
              </div>

              <div class="border-b border-theme-border/70 px-3 py-3">
                <VTTControls />
              </div>

              <div
                class="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-3 p-3 pr-2"
              >
                {#if showInitiativePanel}
                  <InitiativePanel />
                {/if}

                <TokenDetail />

                {#if !showInitiativePanel && !hasSelectedToken}
                  <div
                    class="rounded-xl border border-dashed border-theme-border bg-theme-bg/50 p-4 text-sm text-theme-muted"
                  >
                    Select a token to view its details.
                  </div>
                {/if}
              </div>

              {#if !uiStore.isGuestMode}
                <div
                  class="relative z-20 border-t border-theme-border/70 p-3 flex justify-end pointer-events-auto"
                  role="presentation"
                  onmousedown={(e) => e.stopPropagation()}
                >
                  <button
                    class="w-8 h-8 flex flex-shrink-0 items-center justify-center border border-theme-border bg-theme-surface/80 text-theme-muted transition hover:text-theme-primary"
                    onclick={() => {
                      console.log("[MapPage] VTT share requested");
                      showVttShare = true;
                      console.log("[MapPage] showVttShare set", showVttShare);
                    }}
                    type="button"
                    title="Share Campaign"
                    aria-label="Share Campaign"
                  >
                    <span class="icon-[lucide--share-2] w-4 h-4"></span>
                  </button>
                </div>
              {/if}
            </div>
          {/if}
        </aside>
      {/if}

      <!-- HUD Overlay -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="absolute top-4 left-4 z-10 flex flex-col items-start gap-2"
        role="presentation"
        onmousedown={(e) => e.stopPropagation()}
      >
        <div class="flex gap-2">
          {#if mapStore.canGoBack}
            <button
              class="px-3 py-1.5 bg-theme-surface border border-theme-border text-theme-text text-xs font-bold rounded-lg hover:border-theme-primary transition-colors flex items-center gap-2"
              onclick={() => mapStore.goBack()}
            >
              <span class="icon-[lucide--arrow-left] w-3 h-3"></span>
              BACK
            </button>
          {/if}

          {#if uiStore.isGuestMode}
            <!-- Guests only see the current shared map name -->
            {#if mapStore.activeMap}
              <div
                class="px-3 py-1.5 bg-theme-surface border border-theme-border text-theme-text rounded-lg text-xs font-bold"
              >
                {mapStore.activeMap.isWorldMap ? "★ " : ""}{mapStore.activeMap
                  .name}
              </div>
            {/if}
          {:else}
            <select
              class="bg-theme-surface border border-theme-border text-theme-text px-3 py-1.5 rounded-lg text-xs"
              value={mapStore.activeMapId}
              onchange={(e) =>
                handleActiveMapSelection({
                  mapId: e.currentTarget.value,
                  selectMap: (mapId) => mapStore.selectMap(mapId),
                  isHosting: p2pHost.isHosting,
                  broadcastActiveMapSync: () =>
                    p2pHost.broadcastActiveMapSync(),
                })}
            >
              {#each Object.values(vault.maps) as map (map.id)}
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
                <span class="icon-[lucide--star] w-3 h-3 fill-theme-primary"
                ></span>
                WORLD MAP
              </div>
            {/if}

            <button
              class="px-3 py-1.5 bg-theme-surface border border-theme-border text-red-500/70 text-[10px] font-bold rounded-lg hover:text-red-400 hover:border-red-400 transition-colors flex items-center gap-2"
              onclick={async () => {
                if (
                  await uiStore.confirm({
                    title: "Clear Map",
                    message:
                      "Are you sure you want to delete this map? This action cannot be undone.",
                    isDangerous: true,
                  })
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
              class="px-3 py-1.5 bg-theme-primary text-theme-bg text-xs font-bold rounded-lg uppercase font-header tracking-wider"
              onclick={() => (showUpload = true)}
            >
              Add Map
            </button>
          {/if}
        </div>

        <GuestInfoOverlay />
      </div>

      <!-- Measurement tool button (lower left) -->
      {#if !uiStore.isGuestMode && mapSession.vttEnabled}
        <div class="absolute bottom-4 left-4 z-20 pointer-events-auto">
          <button
            class={getMeasurementToolButtonClass(mapSession.measurement.active)}
            onclick={(e) => {
              e.stopPropagation();
              mapSession.setMeasurementActive(!mapSession.measurement.active);
            }}
            aria-pressed={mapSession.measurement.active}
            title={mapSession.measurement.active
              ? "Disable measurement tool"
              : "Measure: click on map to set start point, click again to set end point"}
            aria-label="Toggle measurement tool"
          >
            <span
              class={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                mapSession.measurement.active
                  ? "border-theme-bg/20 bg-theme-bg shadow-md translate-x-[calc(1.075rem+2px)]"
                  : "border-theme-border bg-theme-bg/90 shadow-sm translate-x-0 group-hover:border-theme-primary/40"
              }`}
            >
              <span
                class={`icon-[lucide--ruler] w-4 h-4 transition-colors ${
                  mapSession.measurement.active
                    ? "text-theme-primary"
                    : "text-theme-muted group-hover:text-theme-primary"
                }`}
              ></span>
            </span>

            {#if mapSession.measurement.active}
              <span
                class="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.18),transparent_48%)]"
              ></span>
            {/if}
          </button>
        </div>
      {/if}

      <!-- svelte-ignore a11y_no_static_element_interactions -->
      {#if !uiStore.isGuestMode}
        <div
          class="absolute inset-x-4 bottom-4 z-10 flex justify-center"
          role="presentation"
          onmousedown={(e) => e.stopPropagation()}
        >
          <div
            class="flex gap-1.5 bg-theme-surface/80 backdrop-blur border border-theme-border p-1.5 rounded-lg shadow-lg items-center"
          >
            <button
              class={`px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${getPrimaryButtonStateClass(uiStore.sharedMode)}`}
              onclick={() => (uiStore.sharedMode = !uiStore.sharedMode)}
              title={uiStore.sharedMode
                ? "Exit Shared Mode (Admin View)"
                : "Enter Shared Mode (Player Preview)"}
              data-testid="shared-mode-toggle"
              aria-pressed={uiStore.sharedMode}
              aria-label="Toggle player view mode"
            >
              {uiStore.sharedMode ? "EXIT PLAYER VIEW" : "PLAYER VIEW"}
            </button>

            {#if mapStore.isGMMode}
              <button
                class={`px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${getPrimaryButtonStateClass(mapStore.showFog)}`}
                onclick={() => (mapStore.showFog = !mapStore.showFog)}
              >
                FOG: {mapStore.showFog ? "ON" : "OFF"}
              </button>

              <button
                class={`px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${getPrimaryButtonStateClass(mapStore.showGrid)}`}
                onclick={() => (mapStore.showGrid = !mapStore.showGrid)}
                oncontextmenu={(e) => {
                  e.preventDefault();
                  mapSession.showGridSettings = true;
                }}
                title="Toggle Grid (Right-click for settings)"
              >
                GRID: {mapStore.showGrid ? "ON" : "OFF"}
              </button>

              <VTTModeToggle />

              <div class="flex items-center gap-2 px-2">
                <span
                  class="text-[9px] text-theme-muted font-bold tracking-tighter uppercase"
                  >Brush Size</span
                >
                <input
                  type="range"
                  min="10"
                  max="500"
                  bind:value={mapStore.brushRadius}
                  class="w-24 accent-theme-primary h-1"
                />
                <span class="text-[9px] text-theme-primary font-mono w-6"
                  >{mapStore.brushRadius}px</span
                >
              </div>

              <div
                class="flex flex-col justify-center px-2 text-[10px] text-theme-muted/90 font-semibold italic leading-tight"
              >
                <span>Alt+Drag to Reveal</span>
                <span>Alt+Shift+Drag to Hide</span>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <TokenAddDialog />
    </MapView>
    {#if showVttShare}
      <ShareModal close={() => (showVttShare = false)} />
    {/if}
    {#if uiStore.isGuestMode}
      <VTTSharedImageLightbox
        imageState={mapSession.sharedTokenImage}
        onClose={() => mapSession.clearSharedTokenImage()}
      />
    {/if}
    <VTTGridColorMenu />
  {:else if uiStore.isGuestMode}
    <!-- Guest view: no active map -->
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
        Waiting for host
      </h2>
      <p class="text-theme-muted max-w-md font-body font-light leading-relaxed">
        The host hasn't shared a map yet. Once they do, it will appear here.
      </p>
    </div>
  {:else}
    <!-- Host view: no active map, can upload -->
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
        class="px-12 py-4 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-[0.2em] text-sm rounded-lg hover:shadow-[0_0_30px_var(--color-accent-primary)] transition-all active:scale-95"
        onclick={() => (showUpload = true)}
      >
        Upload World Image
      </button>
    </div>
  {/if}

  {#if showUpload}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="absolute inset-0 z-50 bg-theme-bg/80 backdrop-blur-sm flex items-center justify-center p-6"
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
          class="text-xl font-bold text-theme-text mb-6 uppercase font-header tracking-wider"
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
              class="w-full bg-theme-surface/50 border border-theme-border text-theme-text px-4 py-3 rounded-lg focus:border-theme-primary outline-none transition-colors"
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
              class="flex-1 px-6 py-3 border border-theme-border text-theme-muted rounded-lg hover:bg-theme-surface transition-colors uppercase text-[10px] font-bold font-header tracking-widest"
              onclick={() => (showUpload = false)}
            >
              Cancel
            </button>
            <button
              class="flex-1 px-6 py-3 bg-theme-primary text-theme-bg rounded-lg font-bold uppercase font-header text-[10px] tracking-widest"
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
