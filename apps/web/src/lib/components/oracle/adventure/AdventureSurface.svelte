<script lang="ts">
  import { oracle } from "$lib/stores/oracle.svelte";
  import AdventureStart from "./AdventureStart.svelte";
  import AdventurePlay from "./AdventurePlay.svelte";
  import AdventureRollPrompt from "./AdventureRollPrompt.svelte";
  import AdventureStateSummary from "./AdventureStateSummary.svelte";
  import AdventureArchive from "./AdventureArchive.svelte";
  import { adventureSessionRepository } from "$lib/services/adventure/adventure-session-repository";

  let vaultId = $derived(oracle.vault.activeVaultId ?? "default");
  adventureSessionRepository.setRootResolver(async (id) => {
    const handle = await oracle.vault.getSpecificVaultHandle(id);
    if (!handle) throw new Error("vault-not-open");
    return handle;
  });
</script>

<div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
  {#if oracle.adventure.session}
    <AdventureStateSummary manager={oracle.adventure} />
    <AdventurePlay manager={oracle.adventure} />
    <AdventureRollPrompt manager={oracle.adventure} />
  {:else}
    <AdventureStart manager={oracle.adventure} {vaultId} />
  {/if}
  <AdventureArchive repository={adventureSessionRepository} {vaultId} />
</div>
