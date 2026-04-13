<script lang="ts">
  import { page } from "$app/state";
  import { vault } from "$lib/stores/vault.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import FrontPage from "$lib/components/world/FrontPage.svelte";
  import EntityDetailPanel from "$lib/components/EntityDetailPanel.svelte";

  const vaultId = $derived(page.params.id);
  const selectedEntity = $derived.by(() => {
    const id = vault.selectedEntityId;
    return id ? vault.entities[id] : null;
  });

  $effect(() => {
    if (vaultId && vault.activeVaultId !== vaultId) {
      void vault.switchVault(vaultId);
    }
  });
</script>

{#if !uiStore.dismissedWorldPage}
  <FrontPage />
{/if}

{#if selectedEntity}
  <EntityDetailPanel
    entity={selectedEntity}
    onClose={() => (vault.selectedEntityId = null)}
  />
{/if}
