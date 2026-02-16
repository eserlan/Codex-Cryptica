<script lang="ts">
  import { proposerStore } from "$lib/stores/proposer.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import type { Proposal } from "@codex/proposer";

  const handleReEvaluate = async (proposal: Proposal) => {
    await proposerStore.reEvaluate(proposal);
  };
</script>

{#if proposerStore.activeHistory.length > 0}
  <div class="space-y-3 mt-4">
    {#each proposerStore.activeHistory as proposal (proposal.id)}
      <div
        class="bg-theme-bg/20 border border-theme-border/30 rounded-lg p-3 flex justify-between items-center opacity-70 hover:opacity-100 transition-opacity"
      >
        <div class="text-sm">
          <span
            class="text-theme-muted line-through decoration-theme-secondary/50"
          >
            {vault.entities[proposal.targetId]?.title || proposal.targetId}
          </span>
          <span class="text-xs text-theme-muted block">
            Dismissed: {new Date(proposal.timestamp).toLocaleDateString()}
          </span>
        </div>

        <button
          onclick={() => handleReEvaluate(proposal)}
          class="text-xs text-theme-primary hover:underline"
        >
          Re-evaluate
        </button>
      </div>
    {/each}
  </div>
{:else}
  <div class="text-xs text-theme-muted italic text-center py-4">
    No dismissed proposals in history.
  </div>
{/if}
