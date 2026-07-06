<script lang="ts">
  import MapHUD from "$lib/components/map/MapHUD.svelte";
  import MapUploadOverlay from "$lib/components/map/MapUploadOverlay.svelte";
  import MapView from "$lib/components/map/MapView.svelte";
  import MapVTTControlsHUD from "$lib/components/map/MapVTTControlsHUD.svelte";
  import VTTGridColorMenu from "$lib/components/map/VTTGridColorMenu.svelte";
  import TokenAddDialog from "$lib/components/vtt/TokenAddDialog.svelte";
  import MapVTTSidebar from "$lib/components/vtt/MapVTTSidebar.svelte";
  import {
    MapPageController,
    type MapPageControllerDependencies,
  } from "$lib/stores/map/map-page-controller.svelte";
  import { mapStore } from "$lib/stores/map.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import { guestVault } from "$lib/stores/guest-vault.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import type { Entity } from "schema";

  const controller = new MapPageController({
    mapStore,
    mapSession,
    vault,
    notificationStore,
    sessionModeStore,
    layoutUIStore,
  } satisfies MapPageControllerDependencies);

  // A published-vault reader browses maps on their own (no host), unlike a
  // live VTT guest who only sees whatever map the host is currently sharing.
  const isPublishedVaultReader = $derived(
    sessionModeStore.isGuestMode && !!guestVault.publishId,
  );

  function handleEntitySelect(entity: Entity) {
    modalUIStore.openZenMode(entity.id);
  }

  $effect(() => {
    controller.syncActiveVault(vault.activeVaultId);
  });
</script>

<div class="flex-1 flex flex-col bg-theme-bg overflow-hidden relative">
  {#if mapStore.activeMap}
    <MapView
      onMapDragOver={(event) => controller.onDragOver(event)}
      onMapDragLeave={(event) => controller.onDragLeave(event)}
      onMapDrop={(event) => controller.onDrop(event)}
    >
      {#if mapSession.vttEnabled}
        <MapVTTSidebar
          isVttChatSidebarCollapsed={layoutUIStore.vttChatSidebarCollapsed}
          showInitiativePanel={controller.showInitiativePanel}
          hasSelectedToken={controller.hasSelectedToken}
          vttEntityCount={controller.vttEntityCount}
          onVttChatSidebarCollapsed={(collapsed) =>
            controller.setVttChatSidebarCollapsed(collapsed)}
          onEntitySelect={handleEntitySelect}
          onEntityDragStart={(event, entityId) =>
            controller.handleEntityDragStart(event, entityId)}
          onEntityDragEnd={() => controller.handleEntityDragEnd()}
          onShare={() => controller.openShareModal()}
        />
      {/if}

      <MapHUD
        chatSidebarOffset={controller.chatSidebarOffset}
        onShowUpload={() => (controller.showUpload = true)}
      />
      <MapVTTControlsHUD chatSidebarOffset={controller.chatSidebarOffset} />
      <TokenAddDialog />
    </MapView>

    <VTTGridColorMenu />
  {:else if isPublishedVaultReader}
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
        No maps published
      </h2>
      <p class="text-theme-muted max-w-md font-body font-light leading-relaxed">
        This world hasn't published any maps yet.
      </p>
    </div>
  {:else if sessionModeStore.isGuestMode}
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
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="flex-1 flex flex-col items-center justify-center p-8 text-center transition-colors duration-200 {controller.isDragging
        ? 'bg-theme-primary/10'
        : ''}"
      ondragover={(event) => controller.onDragOver(event)}
      ondragleave={(event) => controller.onDragLeave(event)}
      ondrop={(event) => controller.onDrop(event)}
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
        onclick={() => (controller.showUpload = true)}
      >
        Upload World Image
      </button>
    </div>
  {/if}

  {#if controller.showUpload}
    <MapUploadOverlay
      bind:mapName={controller.mapName}
      bind:files={controller.files}
      isDragging={controller.isDragging}
      onDragOver={(event) => controller.onDragOver(event)}
      onDragLeave={(event) => controller.onDragLeave(event)}
      onDrop={(event) => controller.onDrop(event)}
      onUpload={() => controller.handleUpload()}
      onCancel={() => controller.cancelUpload()}
    />
  {/if}
</div>
