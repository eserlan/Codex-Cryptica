<script lang="ts">
  import { page } from "$app/state";
  import { vault } from "$lib/stores/vault.svelte";
  import FrontPage from "$lib/components/campaign/FrontPage.svelte";

  const vaultId = $derived(page.params.id);

  $effect(() => {
    if (vaultId && vault.activeVaultId !== vaultId) {
      void vault.switchVault(vaultId);
    }
  });
</script>

<FrontPage />
