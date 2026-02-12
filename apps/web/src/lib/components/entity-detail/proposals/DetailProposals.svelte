<script lang="ts">
  import { proposerStore } from "$lib/stores/proposer.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import type { Proposal } from "@codex/proposer";
  import ProposalHistory from "./ProposalHistory.svelte";

  let { isEditing } = $props<{ isEditing: boolean }>();
  let showHistory = $state(false);

  $effect(() => {
    // Trigger analysis when viewing an entity
    if (vault.selectedEntityId && vault.status === 'idle' && !isEditing) {
      // We could add a debounce here or let the store handle it.
      // The store checks isAnalyzing, so it won't double-trigger.
      // But we might want to wait a bit after load.
      setTimeout(() => {
        if (vault.selectedEntityId) {
          proposerStore.analyzeCurrentEntity();
        }
      }, 1000);
    }
  });

  const handleApply = async (proposal: Proposal) => {
    await proposerStore.apply(proposal);
  };

  const handleDismiss = async (proposal: Proposal) => {
    await proposerStore.dismiss(proposal);
  };
</script>

{#if proposerStore.activeProposals.length > 0 || proposerStore.activeHistory.length > 0}
  <div class="mt-8 border-t border-theme-border pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-theme-secondary font-serif italic text-lg flex items-center gap-2">
        <span class="icon-[lucide--sparkles] w-4 h-4 text-theme-primary"></span>
        <span>Oracle Suggestions</span>
      </h3>
      {#if proposerStore.activeProposals.length > 0}
        <span class="text-xs text-theme-muted bg-theme-bg/50 px-2 py-1 rounded-full border border-theme-border">
          {proposerStore.activeProposals.length} New
        </span>
      {/if}
    </div>

    {#if proposerStore.activeProposals.length > 0}
      <div class="space-y-4 mb-6">
        {#each proposerStore.activeProposals as proposal (proposal.id)}
          <div class="bg-theme-bg/30 border border-theme-border/50 rounded-lg p-3 hover:border-theme-primary/30 transition-colors group">
            <div class="flex justify-between items-start gap-3">
              <div class="space-y-1 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-theme-text font-bold text-sm">
                    {vault.entities[proposal.targetId]?.title || proposal.targetId}
                  </span>
                  <span class="text-xs text-theme-muted px-1.5 py-0.5 rounded bg-theme-bg border border-theme-border">
                    {proposal.type}
                  </span>
                  {#if proposal.confidence > 0.8}
                    <span class="text-[10px] text-green-400 font-mono" title="High Confidence">
                      {(proposal.confidence * 100).toFixed(0)}%
                    </span>
                  {/if}
                </div>
                
                <p class="text-xs text-theme-muted italic">
                  "{proposal.reason}"
                </p>
                
                {#if proposal.context}
                  <div class="mt-2 text-xs text-theme-muted border-l-2 border-theme-border pl-2 py-1 italic opacity-70">
                    "...{proposal.context}..."
                  </div>
                {/if}
              </div>

              <div class="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onclick={() => handleApply(proposal)}
                  class="p-1.5 hover:bg-green-500/20 text-green-400 rounded transition-colors"
                  title="Apply Connection"
                >
                  <span class="icon-[lucide--check] w-4 h-4"></span>
                </button>
                <button 
                  onclick={() => handleDismiss(proposal)}
                  class="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                  title="Dismiss"
                >
                  <span class="icon-[lucide--x] w-4 h-4"></span>
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if proposerStore.activeHistory.length > 0}
      <div class="border-t border-theme-border pt-4">
        <button 
          onclick={() => showHistory = !showHistory}
          class="text-xs text-theme-muted hover:text-theme-primary flex items-center gap-1 transition-colors"
        >
          <span class="icon-[lucide--history] w-3 h-3"></span>
          {showHistory ? "Hide Dismissed Proposals" : `Show Dismissed Proposals (${proposerStore.activeHistory.length})`}
        </button>
        
        {#if showHistory}
          <div class="mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <ProposalHistory />
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}
