<script lang="ts">
  import { page } from "$app/state";
  import { vault } from "$lib/stores/vault.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";

  const vaultId = $derived(page.params.id);
  const entityId = $derived(page.params.entityId);

  $effect(() => {
    if (vaultId && vault.activeVaultId !== vaultId) {
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

<!-- Full-screen dark backdrop — the ZenModeModal overlays this -->
<div class="h-screen bg-black"></div>
