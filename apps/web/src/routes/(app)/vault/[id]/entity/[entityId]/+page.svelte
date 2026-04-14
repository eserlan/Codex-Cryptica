<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/state";
  import { vault } from "$lib/stores/vault.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import {
    ZEN_POPOUT_REQUEST,
    ZEN_POPOUT_DATA,
    type ZenEntityData,
  } from "$lib/utils/zen-popout";

  const vaultId = $derived(page.params.id);
  const entityId = $derived(page.params.entityId);

  // Host flow: load vault from OPFS then open zen mode
  $effect(() => {
    if (vaultId && vault.activeVaultId !== vaultId && !uiStore.isGuestMode) {
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

  // Guest flow: request entity from the opener tab via postMessage
  $effect(() => {
    if (!browser || !entityId) return;

    const origin = window.location.origin;

    const handleData = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      const msg = event.data as ZenEntityData;
      if (msg?.type !== ZEN_POPOUT_DATA || msg.entity?.id !== entityId) return;

      vault.repository.entities[msg.entity.id] = {
        ...msg.entity,
        _path:
          typeof msg.entity._path === "string"
            ? [msg.entity._path]
            : msg.entity._path,
      };
      vault.isInitialized = true;
      vault.status = "idle";
      if (msg.isGuest) uiStore.isGuestMode = true;
      uiStore.openZenMode(msg.entity.id);

      window.removeEventListener("message", handleData);
    };

    window.addEventListener("message", handleData);

    // Ask the opener for the entity (it may not be ready yet — opener sets
    // up its listener before calling window.open, so this arrives in time)
    if (window.opener) {
      window.opener.postMessage({ type: ZEN_POPOUT_REQUEST, entityId }, origin);
    }

    return () => window.removeEventListener("message", handleData);
  });
</script>

<svelte:head>
  <title
    >{(entityId ? vault.entities[entityId]?.title : null) ?? "Entity"} | Codex Cryptica</title
  >
</svelte:head>

<!-- Full-screen dark backdrop — ZenModeModal overlays this -->
<div class="h-screen bg-black"></div>
