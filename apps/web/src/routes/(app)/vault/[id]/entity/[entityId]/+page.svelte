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

  const vaultId = $derived(page.params.id);
  const entityId = $derived(page.params.entityId);

  const normalizeEntity = (e: {
    _path?: string | string[] | null;
    [k: string]: unknown;
  }) => ({
    ...e,
    _path: typeof e._path === "string" ? [e._path] : (e._path ?? []),
  });

  const applyGuestPayload = (payload: ZenPopoutPayload) => {
    vault.repository.entities[payload.entity.id] = normalizeEntity(
      payload.entity,
    ) as any;

    // Hydrate stubs for connected entities so connection rendering works
    for (const extra of payload.extraEntities ?? []) {
      if (!vault.repository.entities[extra.id]) {
        vault.repository.entities[extra.id] = normalizeEntity(extra) as any;
      }
    }

    vault.isInitialized = true;
    vault.status = "idle";
    if (payload.isGuest) uiStore.isGuestMode = true;
    guestEntityId = payload.entity.id;
  };

  let guestEntityId = $state<string | null>(null);
  let isResolvingGuestPayload = $state(false);
  if (browser) {
    const payload = page.params.entityId
      ? consumeZenPopoutPayload(page.params.entityId)
      : null;
    if (payload) {
      applyGuestPayload(payload);
    } else if (page.params.entityId && window.opener) {
      // Set isGuestMode early so vault.init() bails before loadFiles() runs
      uiStore.isGuestMode = true;
      isResolvingGuestPayload = true;
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
