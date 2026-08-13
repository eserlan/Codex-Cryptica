<script lang="ts">
  import { untrack } from "svelte";
  import { proposerStore } from "$lib/stores/proposer.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import type { Proposal } from "@codex/proposer";
  import ProposalHistory from "./ProposalHistory.svelte";
  import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";

  let { isEditing, entityId } = $props<{
    isEditing: boolean;
    entityId?: string;
  }>();
  let showHistory = $state(false);
  let isAutoProposeSuppressed = $state(false);
  let lastEvaluatedEntityId = $state<string | null>(null);
  let hasAutoProposedForEntity = $state<string | null>(null);
  const activeEntityId = $derived(entityId ?? vault.selectedEntityId);
  const activeProposals = $derived(
    proposerStore.getActiveProposalsForEntity(activeEntityId),
  );
  const activeHistory = $derived(
    proposerStore.getActiveHistoryForEntity(activeEntityId),
  );

  // Re-evaluate suppression and load proposals on each entity navigation.
  // Suppression is recomputed fresh per navigation; proposals load is gated to once per entity.
  async function loadAndEvaluate(id: string) {
    const outbound = untrack(
      () => vault.entities[id]?.connections?.length ?? 0,
    );
    const inbound = untrack(() => vault.inboundConnections[id]?.length ?? 0);
    isAutoProposeSuppressed = outbound + inbound > 4;

    if (id === lastEvaluatedEntityId) return;
    lastEvaluatedEntityId = id;
    await proposerStore.loadProposals(id, !entityId);
  }

  $effect(() => {
    if (activeEntityId) {
      void loadAndEvaluate(activeEntityId);
    }
  });

  $effect(() => {
    if (discoveryPolicyStore.aiDisabled) return;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    // Trigger analysis once per entity navigation; hasAutoProposedForEntity prevents
    // repeated scheduling when reactive deps (isLoadingProposals, etc.) toggle later.
    if (
      activeEntityId &&
      vault.status === "idle" &&
      !isEditing &&
      !vault.isGuest &&
      !isAutoProposeSuppressed &&
      hasAutoProposedForEntity !== activeEntityId
    ) {
      const entityToAnalyze = activeEntityId;
      timeoutId = setTimeout(() => {
        void proposerStore.analyzeEntityById(entityToAnalyze, !entityId);
        // Mark as proposed only if analysis actually started (beginAnalysis is synchronous).
        // If the store early-returned (no vault, aiDisabled, etc.), the flag stays unset
        // so the next navigation can retry.
        if (proposerStore.isEntityAnalyzing(entityToAnalyze)) {
          hasAutoProposedForEntity = entityToAnalyze;
        }
      }, 5000);
    }

    return () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  });

  const handleApply = async (proposal: Proposal) => {
    await proposerStore.apply(proposal);
  };

  const handleDismiss = async (proposal: Proposal) => {
    await proposerStore.dismiss(proposal);
  };
</script>

{#if !discoveryPolicyStore.aiDisabled && !vault.isGuest && (activeProposals.length > 0 || activeHistory.length > 0 || isAutoProposeSuppressed)}
  <div
    class="mt-8 border-t border-theme-border pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
  >
    <div class="flex items-center justify-between mb-4">
      <h3
        class="text-theme-secondary font-body italic text-lg flex items-center gap-2"
      >
        <span class="icon-[lucide--sparkles] w-4 h-4 text-theme-primary"></span>
        <span>Oracle Suggestions</span>
      </h3>
      {#if activeProposals.length > 0}
        <span
          class="text-xs text-theme-muted bg-theme-bg/50 px-2 py-1 rounded-full border border-theme-border"
        >
          {activeProposals.length} New
        </span>
      {/if}
    </div>

    {#if activeProposals.length > 0}
      <div class="space-y-4 mb-6">
        {#each activeProposals as proposal (proposal.id)}
          <div
            class="bg-theme-bg/30 border border-theme-border/50 rounded-lg p-3 hover:border-theme-primary/30 transition-colors group"
          >
            <div class="flex justify-between items-start gap-3">
              <div class="space-y-1 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-theme-text font-bold text-sm">
                    {vault.entities[proposal.targetId]?.title ||
                      proposal.targetId}
                  </span>
                  <span
                    class="text-xs text-theme-muted px-1.5 py-0.5 rounded bg-theme-bg border border-theme-border"
                  >
                    {proposal.label || proposal.type}
                  </span>
                  {#if proposal.confidence > 0.8}
                    <span
                      class="text-[10px] text-green-400 font-mono"
                      title="High Confidence"
                    >
                      {(proposal.confidence * 100).toFixed(0)}%
                    </span>
                  {/if}
                </div>

                <p class="text-xs text-theme-muted italic">
                  "{proposal.reason}"
                </p>

                {#if proposal.context}
                  <div
                    class="mt-2 text-xs text-theme-muted border-l-2 border-theme-border pl-2 py-1 italic opacity-70"
                  >
                    "...{proposal.context}..."
                  </div>
                {/if}
              </div>

              <div
                class="flex flex-col gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
              >
                <button
                  type="button"
                  onclick={() => handleApply(proposal)}
                  class="p-1.5 hover:bg-green-500/20 text-green-400 rounded transition-colors"
                  title="Apply Connection"
                  aria-label="Apply connection proposal for {vault.entities[
                    proposal.targetId
                  ]?.title || proposal.targetId}"
                >
                  <span aria-hidden="true" class="icon-[lucide--check] w-4 h-4"
                  ></span>
                </button>
                <button
                  type="button"
                  onclick={() => handleDismiss(proposal)}
                  class="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                  title="Dismiss"
                  aria-label="Dismiss connection proposal for {vault.entities[
                    proposal.targetId
                  ]?.title || proposal.targetId}"
                >
                  <span aria-hidden="true" class="icon-[lucide--x] w-4 h-4"
                  ></span>
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if isAutoProposeSuppressed || activeProposals.length > 4}
      <div class="pb-6">
        <button
          type="button"
          onclick={() =>
            proposerStore.analyzeEntityById(
              activeEntityId,
              !entityId,
              undefined,
              true,
            )}
          disabled={proposerStore.isEntityAnalyzing(activeEntityId)}
          aria-busy={proposerStore.isEntityAnalyzing(activeEntityId)}
          class="w-full flex items-center justify-center gap-2 py-2 px-4 bg-theme-bg/50 hover:bg-theme-bg border border-theme-border hover:border-theme-primary/50 text-theme-secondary hover:text-theme-primary rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-theme-primary"
          aria-label="Look for connection proposals manually"
        >
          {#if proposerStore.isEntityAnalyzing(activeEntityId)}
            <span
              class="icon-[lucide--loader-2] w-4 h-4 animate-spin"
              aria-hidden="true"
            ></span>
            <span>Looking for Proposals...</span>
          {:else}
            <span
              class="icon-[lucide--sparkles] w-4 h-4 text-theme-primary"
              aria-hidden="true"
            ></span>
            <span>Look for Connection Proposals</span>
          {/if}
        </button>
      </div>
    {/if}

    {#if activeHistory.length > 0}
      <div class="border-t border-theme-border pt-4">
        <button
          onclick={() => (showHistory = !showHistory)}
          class="text-xs text-theme-muted hover:text-theme-primary flex items-center gap-1 transition-colors"
        >
          <span class="icon-[lucide--history] w-3 h-3"></span>
          {showHistory
            ? "Hide Dismissed Proposals"
            : `Show Dismissed Proposals (${activeHistory.length})`}
        </button>

        {#if showHistory}
          <div class="mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <ProposalHistory history={activeHistory} />
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}
