<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/state";
  import { vault } from "$lib/stores/vault.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { consumeZenPopoutPayload } from "$lib/utils/zen-popout";

  const vaultId = $derived(page.params.id);
  const entityId = $derived(page.params.entityId);

  // Consume guest payload synchronously so uiStore.isGuestMode is set
  // before any effects run — prevents the host switchVault from firing.
  let guestEntityId: string | null = null;
  if (browser) {
    const payload = page.params.entityId
      ? consumeZenPopoutPayload(page.params.entityId)
      : null;
    if (payload) {
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
    }
  }

  // Guest flow: open zen mode once reactive state has settled
  $effect(() => {
    if (guestEntityId && vault.entities[guestEntityId]) {
      uiStore.openZenMode(guestEntityId);
    }
  });

  // Host flow: only when not a guest popout
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
</script>

<svelte:head>
  <title
    >{(entityId ? vault.entities[entityId]?.title : null) ?? "Entity"} | Codex Cryptica</title
  >
</svelte:head>

<!-- Full-screen dark backdrop — ZenModeModal overlays this -->
<div class="h-screen bg-black"></div>
