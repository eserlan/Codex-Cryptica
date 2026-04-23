<script lang="ts">
  import { proposerStore } from "$lib/stores/proposer.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { fade, scale } from "svelte/transition";
  import type { Proposal } from "@codex/proposer";

  let { isOpen = $bindable(false) } = $props<{ isOpen: boolean }>();

  let _isAnalyzing = $state(false);
  let analyzedCount = $state(0);
  let currentStep = $state<"init" | "analyzing" | "review" | "complete">(
    "init",
  );
  let pendingProposals = $state<Proposal[]>([]);
  let currentProposalIndex = $state(0);

  const currentProposal = $derived(pendingProposals[currentProposalIndex]);

  const startAssessment = async () => {
    _isAnalyzing = true;
    analyzedCount = 0;
    currentStep = "analyzing";
    pendingProposals = [];
    currentProposalIndex = 0;

    const allEntities = vault.allEntities;
    for (const entity of allEntities) {
      // Analyze each entity
      await proposerStore.analyzeEntityById(entity.id, false);
      analyzedCount++;

      // Collect new proposals
      const active = proposerStore.proposals[entity.id] || [];
      pendingProposals = [...pendingProposals, ...active];
    }

    _isAnalyzing = false;
    if (pendingProposals.length > 0) {
      currentStep = "review";
    } else {
      currentStep = "complete";
    }
  };

  const handleApply = async () => {
    if (!currentProposal) return;
    await proposerStore.apply(currentProposal);
    nextProposal();
  };

  const handleDismiss = async () => {
    if (!currentProposal) return;
    await proposerStore.dismiss(currentProposal);
    nextProposal();
  };

  const nextProposal = () => {
    if (currentProposalIndex < pendingProposals.length - 1) {
      currentProposalIndex++;
    } else {
      currentStep = "complete";
    }
  };

  const close = () => {
    isOpen = false;
    // Reset state for next time
    setTimeout(() => {
      currentStep = "init";
      analyzedCount = 0;
      pendingProposals = [];
    }, 300);
  };
</script>

{#if isOpen}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    transition:fade={{ duration: 200 }}
    class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
    onclick={close}
    role="presentation"
  >
    <!-- Modal -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      transition:scale={{ duration: 200, start: 0.95 }}
      class="bg-theme-surface border border-theme-border w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      onclick={(e) => e.stopPropagation()}
      role="presentation"
    >
      <!-- Header -->
      <div
        class="p-4 border-b border-theme-border flex justify-between items-center bg-theme-bg/50"
      >
        <div class="flex items-center gap-2">
          <span class="icon-[lucide--brain-circuit] w-5 h-5 text-theme-primary"
          ></span>
          <h2
            class="font-header font-bold uppercase tracking-widest text-sm text-theme-text"
          >
            AI Connections Assessment
          </h2>
        </div>
        <button
          onclick={close}
          class="text-theme-muted hover:text-theme-text transition-colors"
          aria-label="Close Assessment"
        >
          <span class="icon-[lucide--x] w-5 h-5"></span>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto flex-1">
        {#if currentStep === "init"}
          <div class="text-center space-y-4 py-4">
            <div
              class="w-16 h-16 bg-theme-primary/10 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <span class="icon-[lucide--sparkles] w-8 h-8 text-theme-primary"
              ></span>
            </div>
            <p class="text-theme-text text-sm leading-relaxed">
              The Oracle will scan your entire archive to identify missing
              hidden connections. You can then review and apply them one by one.
            </p>
            <button
              onclick={startAssessment}
              class="bg-theme-primary text-theme-bg font-bold py-2 px-6 rounded-lg text-xs uppercase tracking-widest hover:bg-theme-secondary transition-colors"
            >
              Start Full Scan
            </button>
          </div>
        {:else if currentStep === "analyzing"}
          <div class="text-center space-y-6 py-8">
            <div class="flex justify-center">
              <span
                class="icon-[lucide--loader-2] w-10 h-10 text-theme-primary animate-spin"
              ></span>
            </div>
            <div class="space-y-2">
              <p
                class="text-theme-text font-bold uppercase tracking-wider text-xs"
              >
                Scanning Archive...
              </p>
              <div
                class="w-full bg-theme-bg rounded-full h-1.5 max-w-[200px] mx-auto overflow-hidden border border-theme-border"
              >
                <div
                  class="bg-theme-primary h-full transition-all duration-300"
                  style:width="{(analyzedCount / vault.allEntities.length) *
                    100}%"
                ></div>
              </div>
              <p class="text-[10px] text-theme-muted font-mono uppercase">
                {analyzedCount} / {vault.allEntities.length} Entities
              </p>
            </div>
            <p class="text-xs text-theme-muted italic">
              Identifying potentials, motives, and hidden links...
            </p>
          </div>
        {:else if currentStep === "review"}
          <div class="space-y-6">
            <!-- Progress counter -->
            <div
              class="flex justify-between items-center text-[10px] text-theme-muted uppercase tracking-widest font-mono"
            >
              <span>Reviewing Suggestion</span>
              <span>{currentProposalIndex + 1} / {pendingProposals.length}</span
              >
            </div>

            <!-- The Proposal Card -->
            <div
              class="bg-theme-bg/40 border border-theme-primary/20 rounded-xl p-5 space-y-4 animate-in fade-in slide-in-from-right-4 duration-300"
            >
              <div class="flex items-center gap-3">
                <div class="flex-1">
                  <div
                    class="text-[10px] text-theme-muted uppercase tracking-wider mb-0.5"
                  >
                    Source
                  </div>
                  <div class="text-sm font-bold text-theme-text">
                    {vault.entities[currentProposal.sourceId]?.title ||
                      currentProposal.sourceId}
                  </div>
                </div>
                <span
                  class="icon-[lucide--arrow-right] w-4 h-4 text-theme-muted"
                ></span>
                <div class="flex-1 text-right">
                  <div
                    class="text-[10px] text-theme-muted uppercase tracking-wider mb-0.5"
                  >
                    Target
                  </div>
                  <div class="text-sm font-bold text-theme-text">
                    {vault.entities[currentProposal.targetId]?.title ||
                      currentProposal.targetId}
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <span
                  class="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-theme-primary/10 text-theme-primary border border-theme-primary/20"
                >
                  {currentProposal.type}
                </span>
                <span class="text-[10px] text-theme-muted font-mono">
                  {(currentProposal.confidence * 100).toFixed(0)}% Confidence
                </span>
              </div>

              <p
                class="text-xs text-theme-text italic bg-black/20 p-3 rounded border-l-2 border-theme-primary leading-relaxed"
              >
                "{currentProposal.reason}"
              </p>

              {#if currentProposal.context}
                <div
                  class="text-[10px] text-theme-muted border-t border-theme-border/50 pt-3"
                >
                  <span class="opacity-50 italic"
                    >"...{currentProposal.context}..."</span
                  >
                </div>
              {/if}
            </div>

            <!-- Action Buttons -->
            <div class="grid grid-cols-2 gap-3">
              <button
                onclick={handleDismiss}
                class="border border-theme-border text-theme-text font-bold py-2 rounded-lg text-[10px] uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all"
              >
                Dismiss
              </button>
              <button
                onclick={handleApply}
                class="bg-theme-primary text-theme-bg font-bold py-2 rounded-lg text-[10px] uppercase tracking-widest hover:bg-theme-secondary transition-all shadow-lg shadow-theme-primary/10"
              >
                Apply Connection
              </button>
            </div>
          </div>
        {:else if currentStep === "complete"}
          <div class="text-center space-y-4 py-8">
            <div
              class="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <span class="icon-[lucide--check-circle-2] w-8 h-8 text-green-400"
              ></span>
            </div>
            <h3
              class="text-theme-text font-bold uppercase tracking-widest text-sm"
            >
              Assessment Complete
            </h3>
            <p
              class="text-xs text-theme-muted max-w-[280px] mx-auto leading-relaxed"
            >
              {pendingProposals.length === 0
                ? "No new connections were discovered in this scan. Your archive is perfectly linked!"
                : `You've reviewed all ${pendingProposals.length} suggestions and refined your world's web.`}
            </p>
            <button
              onclick={close}
              class="bg-theme-bg border border-theme-border text-theme-text font-bold py-2 px-8 rounded-lg text-[10px] uppercase tracking-widest hover:bg-theme-surface transition-colors"
            >
              Close Assessment
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
