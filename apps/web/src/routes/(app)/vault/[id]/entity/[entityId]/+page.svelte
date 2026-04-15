<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/state";
  import { vault } from "$lib/stores/vault.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import {
    consumeZenPopoutPayload,
    requestZenPopoutPayload,
    type ZenPopoutPayload,
  } from "$lib/utils/zen-popout";

  const vaultId = $derived((page.params as any).id);
  const entityId = $derived((page.params as any).entityId);

  const applyGuestPayload = (payload: ZenPopoutPayload) => {
    vault.repository.entities[payload.entity.id] = {
      ...payload.entity,
      _path:
        typeof payload.entity._path === "string"
          ? [payload.entity._path]
          : payload.entity._path,
    };
    vault.isInitialized = true;
    vault.status = "idle";
    if (payload.isGuest) uiStore.isGuestMode = true;
    guestEntityId = payload.entity.id;
  };

  let guestEntityId = $state<string | null>(null);
  let isResolvingGuestPayload = $state(false);
  if (browser) {
    const vid = (page.params as any).id;
    const eid = (page.params as any).entityId;
    if (vid && eid) {
      const payload = consumeZenPopoutPayload(vid, eid);
      if (payload) {
        applyGuestPayload(payload);
      } else if (window.opener) {
        // Set isGuestMode early so vault.init() bails before loadFiles() runs
        uiStore.isGuestMode = true;
        isResolvingGuestPayload = true;
      }
    }
  }

  $effect(() => {
    if (!browser || !isResolvingGuestPayload || !entityId) return;

    let isCancelled = false;

    void requestZenPopoutPayload(entityId).then((payload) => {
      if (isCancelled) return;
      if (payload) applyGuestPayload(payload);
      isResolvingGuestPayload = false;
    });

    return () => {
      isCancelled = true;
    };
  });

  // Guest flow: open zen mode once reactive state has settled
  $effect(() => {
    if (guestEntityId && vault.entities[guestEntityId]) {
      uiStore.openZenMode(guestEntityId);
    }
  });

  // Host flow: only when not a guest popout
  $effect(() => {
    if (
      vaultId &&
      vault.activeVaultId !== vaultId &&
      !uiStore.isGuestMode &&
      !isResolvingGuestPayload
    ) {
      void vault.switchVault(vaultId);
    }
  });

  $effect(() => {
    if (
      entityId &&
      vault.activeVaultId === vaultId &&
      vault.entities[entityId]
    ) {
      uiStore.openZenMode(entityId);
    }
  });
</script>

<svelte:head>
  <title
    >{(entityId ? vault.entities[entityId]?.title : null) ?? "Entity"} | Codex Cryptica</title
  >
</svelte:head>

<!-- Full-screen dark backdrop — ZenModeModal overlays this -->
<div class="h-screen bg-black"></div>
