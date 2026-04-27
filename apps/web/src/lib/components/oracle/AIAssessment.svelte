<script lang="ts">
  import { proposerStore } from "$lib/stores/proposer.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import type { Proposal } from "@codex/proposer";

  let assessmentTab = $state<"pending" | "finalized">("pending");
  let isLoading = $state(true);
  let loadError = $state<string | null>(null);

  $effect(() => {
    isLoading = true;
    loadError = null;
    proposerStore
      .loadGlobalProposals()
      .catch((error) => {
        loadError =
          error instanceof Error ? error.message : "Failed to load proposals";
      })
      .finally(() => {
        isLoading = false;
      });
  });

  const handleApply = async (proposal: Proposal) => {
    await proposerStore.apply(proposal);
    // Refresh global list after apply
    await proposerStore.loadGlobalProposals();
  };

  const handleDismiss = async (proposal: Proposal) => {
    await proposerStore.dismiss(proposal);
    // Refresh global list after dismissal
    await proposerStore.loadGlobalProposals();
  };

  const handleVerify = async (proposal: Proposal) => {
    await proposerStore.verify(proposal);
  };

  const handleUndo = async (proposal: Proposal) => {
    const confirmed = await uiStore.confirm({
      title: "Undo Connection",
      message:
        "This will remove the connection from your vault and move it back to rejected history. Are you sure?",
      isDangerous: true,
    });
    if (confirmed) {
      await proposerStore.undo(proposal);
    }
  };
</script>

<div
  class="flex flex-col flex-1 min-h-0 bg-theme-surface font-body"
  style:background-color="var(--theme-panel-fill)"
  style:background-image="var(--bg-texture-overlay)"
  data-testid="ai-assessment-panel"
>
  <!-- Header -->
  <div
    class="p-4 border-b border-theme-border flex items-center justify-between shrink-0"
    style:background-color="var(--theme-panel-fill)"
  >
    <div class="flex items-center gap-2">
      <div
        class="w-8 h-8 rounded-md flex items-center justify-center border"
        style:background-color="var(--theme-selected-bg)"
        style:border-color="var(--theme-selected-border)"
        style:color="var(--theme-icon-active)"
      >
        <span class="icon-[lucide--shield-check] w-4 h-4"></span>
      </div>
      <div>
        <div
          class="text-[9px] font-mono text-theme-muted uppercase tracking-[0.2em] leading-none mb-1"
        >
          Quality Control
        </div>
        <h2
          class="text-xs font-bold text-theme-text uppercase font-header tracking-tight"
        >
          AI Assessment
        </h2>
      </div>
    </div>
    <button
      onclick={() => uiStore.toggleSidebarTool("ai-assessment")}
      class="p-1.5 rounded-md transition-all"
      style:color="var(--theme-icon-default)"
      aria-label="Close Assessment"
    >
      <span class="icon-[lucide--x] w-4 h-4"></span>
    </button>
  </div>

  <!-- Tabs -->
  <div class="flex border-b border-theme-border shrink-0 bg-theme-surface/30">
    <button
      class="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all {assessmentTab ===
      'pending'
        ? 'text-theme-primary border-b-2 border-theme-primary bg-theme-primary/5'
        : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface/50'}"
      onclick={() => (assessmentTab = "pending")}
    >
      Pending ({proposerStore.allPendingProposals.length})
    </button>
    <button
      class="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all {assessmentTab ===
      'finalized'
        ? 'text-theme-primary border-b-2 border-theme-primary bg-theme-primary/5'
        : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface/50'}"
      onclick={() => (assessmentTab = "finalized")}
    >
      Finalized ({proposerStore.allAcceptedProposals.length +
        proposerStore.allVerifiedProposals.length})
    </button>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
    {#if isLoading}
      <div
        class="flex flex-col items-center justify-center h-40 gap-3 text-theme-muted"
      >
        <div
          class="animate-spin rounded-full h-5 w-5 border-2 border-theme-primary border-t-transparent"
        ></div>
        <span class="text-[10px] uppercase tracking-widest"
          >Loading Proposals...</span
        >
      </div>
    {:else if loadError}
      <div
        class="flex flex-col items-center justify-center h-40 gap-3 text-red-400 text-center p-4"
      >
        <span class="icon-[lucide--alert-circle] w-8 h-8 opacity-50"></span>
        <span class="text-xs">{loadError}</span>
        <button
          onclick={() => proposerStore.loadGlobalProposals()}
          class="text-[10px] uppercase tracking-widest underline hover:text-red-300"
        >
          Retry
        </button>
      </div>
    {:else if assessmentTab === "pending"}
      {#if proposerStore.allPendingProposals.length === 0}
        <div
          class="flex flex-col items-center justify-center h-64 text-center p-6 border-2 border-dashed border-theme-border rounded-xl"
        >
          <span
            class="icon-[lucide--sparkles] w-8 h-8 text-theme-muted mb-4 opacity-20"
          ></span>
          <h3 class="text-sm font-bold text-theme-text mb-1">
            No Pending Suggestions
          </h3>
          <p class="text-xs text-theme-muted">
            Run the Oracle on your entities to discover new connections.
          </p>
        </div>
      {:else}
        {#each proposerStore.allPendingProposals as proposal (proposal.id)}
          <div
            class="bg-theme-bg/30 border border-theme-border/50 rounded-lg p-3 hover:border-theme-primary/30 transition-all group"
          >
            <div class="flex justify-between items-start gap-3">
              <div class="space-y-2 flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-theme-text font-bold text-sm truncate">
                    {vault.entities[proposal.sourceId]?.title || "Unknown"}
                  </span>
                  <span
                    class="icon-[lucide--arrow-right] w-3 h-3 text-theme-muted"
                  ></span>
                  <span class="text-theme-text font-bold text-sm truncate">
                    {vault.entities[proposal.targetId]?.title || "Unknown"}
                  </span>
                </div>

                <div class="flex items-center gap-2">
                  <span
                    class="text-[10px] text-theme-muted px-1.5 py-0.5 rounded bg-theme-bg border border-theme-border uppercase tracking-wider"
                  >
                    {proposal.type}
                  </span>
                  {#if proposal.confidence > 0.8}
                    <span class="text-[10px] text-green-400 font-mono">
                      {(proposal.confidence * 100).toFixed(0)}% Match
                    </span>
                  {/if}
                </div>

                <p class="text-xs text-theme-muted italic line-clamp-2">
                  "{proposal.reason}"
                </p>
              </div>

              <div class="flex flex-col gap-1 shrink-0">
                <button
                  onclick={() => handleApply(proposal)}
                  class="p-2 hover:bg-green-500/20 text-green-400 rounded-md transition-colors"
                  title="Accept Connection"
                  aria-label={`Accept connection suggestion from ${vault.entities[proposal.sourceId]?.title || "Unknown"} to ${vault.entities[proposal.targetId]?.title || "Unknown"}`}
                >
                  <span class="icon-[lucide--check] w-4 h-4"></span>
                </button>
                <button
                  onclick={() => handleDismiss(proposal)}
                  class="p-2 hover:bg-red-500/20 text-red-400 rounded-md transition-colors"
                  title="Dismiss"
                  aria-label={`Dismiss connection suggestion from ${vault.entities[proposal.sourceId]?.title || "Unknown"} to ${vault.entities[proposal.targetId]?.title || "Unknown"}`}
                >
                  <span class="icon-[lucide--trash-2] w-4 h-4"></span>
                </button>
              </div>
            </div>
          </div>
        {/each}
      {/if}
    {:else if assessmentTab === "finalized"}
      <div class="space-y-6">
        <!-- Needs Review (Accepted but not verified) -->
        <div>
          <h3
            class="text-[10px] font-mono text-theme-muted uppercase tracking-[0.2em] mb-3 flex items-center gap-2"
          >
            <span class="icon-[lucide--info] w-3 h-3"></span>
            <span
              >Needs Review ({proposerStore.allAcceptedProposals.length})</span
            >
          </h3>

          {#if proposerStore.allAcceptedProposals.length === 0}
            <p class="text-xs text-theme-muted italic p-4 text-center">
              No connections pending review.
            </p>
          {:else}
            <div class="space-y-3">
              {#each proposerStore.allAcceptedProposals as proposal (proposal.id)}
                <div
                  class="bg-theme-bg/30 border border-theme-border/50 rounded-lg p-3 hover:border-theme-primary/30 transition-all"
                >
                  <div class="flex justify-between items-start gap-3">
                    <div class="space-y-2 flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <button
                          onclick={() => uiStore.openZenMode(proposal.sourceId)}
                          class="text-theme-text font-bold text-sm truncate hover:text-theme-primary transition-colors text-left"
                        >
                          {vault.entities[proposal.sourceId]?.title ||
                            "Unknown"}
                        </button>
                        <span
                          class="icon-[lucide--arrow-right] w-3 h-3 text-theme-muted"
                        ></span>
                        <button
                          onclick={() => uiStore.openZenMode(proposal.targetId)}
                          class="text-theme-text font-bold text-sm truncate hover:text-theme-primary transition-colors text-left"
                        >
                          {vault.entities[proposal.targetId]?.title ||
                            "Unknown"}
                        </button>
                      </div>

                      <div class="flex items-center gap-2">
                        <span
                          class="text-[10px] text-theme-muted px-1.5 py-0.5 rounded bg-theme-bg border border-theme-border uppercase tracking-wider"
                        >
                          {proposal.type}
                        </span>
                        <span
                          class="text-[10px] text-theme-primary font-mono bg-theme-primary/5 px-1.5 py-0.5 rounded"
                        >
                          AI Generated
                        </span>
                      </div>

                      <p class="text-xs text-theme-muted italic line-clamp-2">
                        "{proposal.reason}"
                      </p>
                    </div>

                    <div class="flex flex-col gap-1 shrink-0">
                      <button
                        onclick={() => handleVerify(proposal)}
                        class="p-2 bg-theme-primary/10 hover:bg-theme-primary/20 text-theme-primary rounded-md transition-colors"
                        title="Verify Quality"
                        aria-label={`Verify quality for ${vault.entities[proposal.sourceId]?.title || "Unknown"} to ${vault.entities[proposal.targetId]?.title || "Unknown"}`}
                      >
                        <span class="icon-[lucide--check] w-4 h-4"></span>
                      </button>
                      <button
                        onclick={() => handleUndo(proposal)}
                        class="p-2 hover:bg-red-500/20 text-red-400 rounded-md transition-colors"
                        title="Remove Connection"
                        aria-label={`Remove connection between ${vault.entities[proposal.sourceId]?.title || "Unknown"} and ${vault.entities[proposal.targetId]?.title || "Unknown"}`}
                      >
                        <span class="icon-[lucide--rotate-ccw] w-4 h-4"></span>
                      </button>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Verified (High Value) -->
        {#if proposerStore.allVerifiedProposals.length > 0}
          <div class="pt-4 border-t border-theme-border">
            <h3
              class="text-[10px] font-mono text-theme-muted uppercase tracking-[0.2em] mb-3 flex items-center gap-2"
            >
              <span class="icon-[lucide--check] w-3 h-3 text-green-400"></span>
              <span
                >Verified High Value ({proposerStore.allVerifiedProposals
                  .length})</span
              >
            </h3>

            <div class="space-y-3 opacity-80">
              {#each proposerStore.allVerifiedProposals as proposal (proposal.id)}
                <div
                  class="bg-theme-bg/10 border border-theme-border/30 rounded-lg p-3"
                >
                  <div class="flex justify-between items-start gap-3">
                    <div class="space-y-1 flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span
                          class="text-theme-muted font-bold text-sm truncate"
                        >
                          {vault.entities[proposal.sourceId]?.title ||
                            "Unknown"}
                        </span>
                        <span
                          class="icon-[lucide--arrow-right] w-3 h-3 text-theme-muted/50"
                        ></span>
                        <span
                          class="text-theme-muted font-bold text-sm truncate"
                        >
                          {vault.entities[proposal.targetId]?.title ||
                            "Unknown"}
                        </span>
                      </div>
                      <div
                        class="text-[10px] text-green-400/70 uppercase tracking-widest font-mono"
                      >
                        Verified Quality
                      </div>
                    </div>
                    <button
                      onclick={() => handleUndo(proposal)}
                      class="p-1.5 hover:bg-red-500/10 text-red-400/50 hover:text-red-400 rounded transition-colors"
                      title="Undo Verification & Remove"
                      aria-label={`Undo verification and remove connection between ${vault.entities[proposal.sourceId]?.title || "Unknown"} and ${vault.entities[proposal.targetId]?.title || "Unknown"}`}
                    >
                      <span class="icon-[lucide--rotate-ccw] w-3 h-3"></span>
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Footer Info -->
  <div
    class="p-3 bg-theme-bg/20 border-t border-theme-border text-[10px] text-theme-muted italic"
  >
    Review AI suggestions to maintain high lore quality. Verified connections
    are marked as high-value in the knowledge graph.
  </div>
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--theme-border);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: var(--theme-muted);
  }
</style>
