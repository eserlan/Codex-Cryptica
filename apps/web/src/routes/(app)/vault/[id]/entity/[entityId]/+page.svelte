<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/state";
  import { vault } from "$lib/stores/vault.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { consumeZenPopoutPayload } from "$lib/utils/zen-popout";

  const vaultId = $derived(page.params.id);
  const entityId = $derived(page.params.entityId);

  // Guest flow: entity was written to localStorage by the opener tab
  $effect(() => {
    if (!browser || !entityId) return;
    const payload = consumeZenPopoutPayload(entityId);
    if (!payload) return;

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
    uiStore.openZenMode(payload.entity.id);
  });

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
</script>

<svelte:head>
  <title
    >{(entityId ? vault.entities[entityId]?.title : null) ?? "Entity"} | Codex Cryptica</title
  >
</svelte:head>

<!-- Full-screen dark backdrop — ZenModeModal overlays this -->
<div class="h-screen bg-black"></div>
