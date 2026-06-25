<script lang="ts">
  import GuestInfoOverlay from "$lib/components/vtt/GuestInfoOverlay.svelte";
  import { handleActiveMapSelection } from "$lib/components/map/map-page-actions";
  import { p2pHost } from "$lib/cloud-bridge/p2p/host-service.svelte";
  import { mapStore } from "$lib/stores/map.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

  let {
    chatSidebarOffset,
    onShowUpload,
  }: {
    chatSidebarOffset: string;
    onShowUpload: () => void;
  } = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="absolute z-10 flex flex-col items-start gap-2"
  style="top: 1rem; left: calc({chatSidebarOffset} + 1rem);"
  role="presentation"
  onmousedown={(e) => e.stopPropagation()}
>
  <div class="flex gap-2">
    {#if mapStore.canGoBack}
      <button
        type="button"
        class="px-3 py-1.5 bg-theme-surface border border-theme-border text-theme-text text-xs font-bold rounded-lg hover:border-theme-primary transition-colors flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-none"
        onclick={() => mapStore.goBack()}
      >
        <span class="icon-[lucide--arrow-left] w-3 h-3" aria-hidden="true"
        ></span>
        BACK
      </button>
    {/if}

    {#if sessionModeStore.isGuestMode}
      {#if mapStore.activeMap}
        <div
          class="px-3 py-1.5 bg-theme-surface border border-theme-border text-theme-text rounded-lg text-xs font-bold"
        >
          {mapStore.activeMap.isWorldMap ? "★ " : ""}{mapStore.activeMap.name}
        </div>
      {/if}
    {:else}
      <select
        class="bg-theme-surface border border-theme-border text-theme-text px-3 py-1.5 rounded-lg text-xs focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-none"
        aria-label="Select Map"
        value={mapStore.activeMapId}
        onchange={(e) =>
          handleActiveMapSelection({
            mapId: e.currentTarget.value,
            selectMap: (mapId) => mapStore.selectMap(mapId),
            isHosting: p2pHost.isHosting,
            broadcastActiveMapSync: () => p2pHost.broadcastActiveMapSync(),
          })}
      >
        {#each vault.allMaps as map (map.id)}
          <option value={map.id}>
            {map.isWorldMap ? "★ " : ""}{map.name}
          </option>
        {/each}
      </select>

      {#if mapStore.activeMap && !mapStore.activeMap.isWorldMap}
        <button
          type="button"
          class="px-3 py-1.5 bg-theme-surface border border-theme-border text-theme-muted text-[10px] font-bold rounded-lg hover:text-theme-primary hover:border-theme-primary transition-colors flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-none"
          onclick={() => mapStore.setAsWorldMap(mapStore.activeMapId!)}
          title="Set as World Map"
        >
          <span class="icon-[lucide--star] w-3 h-3" aria-hidden="true"></span>
          SET WORLD
        </button>
      {:else if mapStore.activeMap?.isWorldMap}
        <div
          class="px-3 py-1.5 bg-theme-primary/10 border border-theme-primary/30 text-theme-primary text-[10px] font-bold rounded-lg flex items-center gap-2"
        >
          <span
            class="icon-[lucide--star] w-3 h-3 fill-theme-primary"
            aria-hidden="true"
          ></span>
          WORLD MAP
        </div>
      {/if}

      <button
        type="button"
        class="px-3 py-1.5 bg-theme-surface border border-theme-border text-red-500/70 text-[10px] font-bold rounded-lg hover:text-red-400 hover:border-red-400 transition-colors flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-none"
        onclick={async () => {
          if (
            await notificationStore.confirm({
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
        <span class="icon-[lucide--trash-2] w-3 h-3" aria-hidden="true"></span>
        DELETE
      </button>

      <button
        type="button"
        class="px-3 py-1.5 bg-theme-primary text-theme-bg text-xs font-bold rounded-lg uppercase font-header tracking-wider focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-none"
        onclick={onShowUpload}
      >
        Add Map
      </button>
    {/if}
  </div>

  <GuestInfoOverlay />
</div>
