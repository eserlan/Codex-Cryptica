<script lang="ts">
  import { page } from "$app/state";
  import { vault } from "$lib/stores/vault.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import FrontPage from "$lib/components/world/FrontPage.svelte";
  import EntityDetailPanel from "$lib/components/EntityDetailPanel.svelte";

  const vaultId = $derived(page.params.id);
  const zenParam = $derived(page.url.searchParams.get("zen"));
  const selectedEntity = $derived.by(() => {
    const id = vault.selectedEntityId;
    return id ? vault.entities[id] : null;
  });

  $effect(() => {
    if (vaultId && vault.activeVaultId !== vaultId) {
      void vault.switchVault(vaultId);
    }
  });

  // Auto-open zen mode when ?zen=entityId is in the URL, once the vault is loaded
  $effect(() => {
    if (
      zenParam &&
      vault.activeVaultId === vaultId &&
      vault.entities[zenParam]
    ) {
      uiStore.openZenMode(zenParam);
    }
  });
</script>

{#if !uiStore.dismissedWorldPage}
  {#key vault.activeVaultId}
    <FrontPage />
  {/key}
{/if}

{#if selectedEntity}
  <EntityDetailPanel
    entity={selectedEntity}
    onClose={() => (vault.selectedEntityId = null)}
  />
{/if}
