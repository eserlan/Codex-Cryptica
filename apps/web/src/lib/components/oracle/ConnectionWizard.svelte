<script lang="ts">
  import { oracle, type ChatMessage } from "$lib/stores/oracle.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { aiService, TIER_MODES } from "$lib/services/ai";
  import Autocomplete from "../ui/Autocomplete.svelte";
  import { fade, slide } from "svelte/transition";

  let { message }: { message: ChatMessage } = $props();

  type Step =
    | "SELECT_SOURCE"
    | "SELECT_TARGET"
    | "PROPOSING"
    | "REVIEW"
    | "DONE";

  // Prefill logic for direct commands
  const prefill = (message as any).prefill;

  let step = $state<Step>(prefill ? "REVIEW" : "SELECT_SOURCE");
  let sourceId = $state<string | null>(prefill?.sourceId || null);
  let sourceName = $state(
    prefill?.sourceId ? vault.entities[prefill.sourceId]?.title : "",
  );
  let targetId = $state<string | null>(prefill?.targetId || null);
  let targetName = $state(
    prefill?.targetId ? vault.entities[prefill.targetId]?.title : "",
  );
  let type = $state(prefill?.type || "related_to");
  let label = $state(prefill?.label || "");
  let explanation = $state("");
  let error = $state<string | null>(null);

  const options = [
    { value: "related_to", label: "Default (Grey)" },
    { value: "neutral", label: "Neutral (Amber)" },
    { value: "friendly", label: "Friendly (Blue)" },
    { value: "enemy", label: "Enemy (Red)" },
  ];

  const handleNext = async () => {
    error = null;
    if (step === "SELECT_SOURCE") {
      if (!sourceId) {
        error = "Please select a valid source entity.";
        return;
      }
      step = "SELECT_TARGET";
    } else if (step === "SELECT_TARGET") {
      if (!targetId) {
        error = "Please select a valid target entity.";
        return;
      }
      if (sourceId === targetId) {
        error = "Source and Target cannot be the same entity.";
        return;
      }

      // Fast path: Go to review immediately
      step = "REVIEW";
      // Trigger AI proposal in background
      generateProposal();
    }
  };

  let isProposing = $state(false);
  const generateProposal = async () => {
    try {
      const key = oracle.effectiveApiKey;
      if (!key) return;

      isProposing = true;
      const source = vault.entities[sourceId!];
      const target = vault.entities[targetId!];

      const modelName = TIER_MODES[oracle.tier];
      const proposal = await aiService.generateConnectionProposal(
        key,
        modelName,
        source,
        target,
      );

      // Only apply if the user hasn't typed their own label yet
      if (!label) {
        const allowedTypes = ["related_to", "neutral", "friendly", "enemy"];
        type = allowedTypes.includes(proposal.type)
          ? proposal.type
          : "related_to";
        label = proposal.label;
      }
      explanation = proposal.explanation;
    } catch (err: any) {
      console.error("Proposal failed:", err);
    } finally {
      isProposing = false;
    }
  };

  const handleFinalize = () => {
    if (!sourceId || !targetId) return;

    const success = vault.addConnection(sourceId, targetId, type, label);
    if (success) {
      step = "DONE";
      // Update message content for history
      message.content = `Connected **${vault.entities[sourceId].title}** to **${vault.entities[targetId].title}** as *${label || type}*.`;
      // Convert wizard message to a normal text message so history renders as a stable transcript entry
      message.type = "text";
    } else {
      error = "Failed to create connection in vault.";
    }
  };

  const handleCancel = () => {
    oracle.removeMessage(message.id);
  };
</script>

<div class="flex flex-col gap-3 p-1">
  <div
    class="flex items-center gap-2 text-theme-primary font-bold uppercase tracking-[0.2em] text-[10px] mb-1"
  >
    <span class="icon-[heroicons--link] w-3.5 h-3.5"></span>
    Connection Wizard
  </div>

  {#if step === "SELECT_SOURCE"}
    <div in:fade>
      <p class="text-xs text-theme-muted mb-2 font-mono">
        1. Select the origin entity (From):
      </p>
      <Autocomplete
        bind:value={sourceName}
        bind:selectedId={sourceId}
        placeholder="Type entity name..."
        id="wizard-source-search"
        ariaLabel="Search source entity"
      />
    </div>
  {:else if step === "SELECT_TARGET"}
    <div in:fade>
      <p class="text-xs text-theme-muted mb-2 font-mono">
        2. Select the destination entity (To):
      </p>
      <div
        class="flex items-center gap-2 mb-2 px-2 py-1 bg-theme-primary/10 rounded border border-theme-primary/20"
      >
        <span class="text-[10px] font-bold text-theme-primary">FROM:</span>
        <span class="text-xs text-theme-text font-mono truncate"
          >{sourceName}</span
        >
      </div>
      <Autocomplete
        bind:value={targetName}
        bind:selectedId={targetId}
        placeholder="Type entity name..."
        id="wizard-target-search"
        ariaLabel="Search target entity"
      />
    </div>
  {:else if step === "PROPOSING"}
    <div class="flex flex-col items-center py-4 gap-3" in:fade>
      <div
        class="w-8 h-8 border-2 border-theme-primary/30 border-t-theme-primary rounded-full animate-spin"
      ></div>
      <p
        class="text-xs text-theme-primary animate-pulse font-mono uppercase tracking-widest"
      >
        Oracle is analyzing lore...
      </p>
    </div>
  {:else if step === "REVIEW"}
    <div class="space-y-3" in:fade>
      <div
        class="flex flex-col gap-1 p-2 bg-theme-bg/50 rounded border border-theme-border text-xs font-mono"
      >
        <div class="flex gap-2">
          <span class="text-theme-muted w-12 shrink-0 text-right">FROM:</span>
          <span class="text-theme-text truncate"
            >{vault.entities[sourceId!]?.title ?? "Unknown Entity"}</span
          >
        </div>
        <div class="flex gap-2">
          <span class="text-theme-muted w-12 shrink-0 text-right">TO:</span>
          <span class="text-theme-text truncate"
            >{vault.entities[targetId!]?.title ?? "Unknown Entity"}</span
          >
        </div>
      </div>

      {#if explanation}
        <div
          class="p-2 bg-theme-primary/5 border-l-2 border-theme-primary italic text-xs text-theme-text/80 leading-relaxed"
        >
          "{explanation}"
        </div>
      {:else if isProposing}
        <div
          class="flex items-center gap-2 px-2 py-1.5 bg-theme-primary/5 rounded border border-theme-primary/10 animate-pulse"
        >
          <div
            class="w-2.5 h-2.5 border border-theme-primary/30 border-t-theme-primary rounded-full animate-spin"
          ></div>
          <span
            class="text-[10px] font-mono text-theme-primary uppercase tracking-widest"
            >Oracle is weaving suggestions...</span
          >
        </div>
      {/if}

      <div class="grid grid-cols-2 gap-2">
        <div class="flex flex-col gap-1">
          <label
            for="wizard-connection-type"
            class="text-[9px] font-bold text-theme-secondary uppercase tracking-wider"
            >Base Type</label
          >
          <select
            id="wizard-connection-type"
            bind:value={type}
            class="bg-theme-surface text-theme-text border border-theme-border rounded px-2 py-1 text-xs focus:outline-none focus:border-theme-primary"
          >
            {#each options as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label
            for="wizard-connection-label"
            class="text-[9px] font-bold text-theme-secondary uppercase tracking-wider"
            >Label (Custom)</label
          >
          <input
            id="wizard-connection-label"
            type="text"
            bind:value={label}
            placeholder="e.g. Rival"
            class="bg-theme-surface text-theme-text border border-theme-border rounded px-2 py-1 text-xs focus:outline-none focus:border-theme-primary"
          />
        </div>
      </div>
    </div>
  {:else if step === "DONE"}
    <div class="py-2 text-center" in:fade>
      <span
        class="text-green-400 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
      >
        <span class="icon-[heroicons--check-circle] w-4 h-4"></span>
        Connection Created
      </span>
    </div>
  {/if}

  {#if error}
    <p class="text-[10px] text-red-400 font-mono italic" transition:slide>
      {error}
    </p>
  {/if}

  <div class="flex justify-end gap-2 pt-2 border-t border-theme-border/30">
    {#if step !== "DONE"}
      <button
        onclick={handleCancel}
        class="px-3 py-1 text-[10px] font-bold text-theme-muted hover:text-theme-text uppercase tracking-widest transition-all"
        >Cancel</button
      >

      {#if step === "SELECT_SOURCE" || step === "SELECT_TARGET"}
        <button
          onclick={handleNext}
          class="px-4 py-1 bg-theme-primary text-theme-bg font-bold rounded text-[10px] uppercase tracking-widest hover:bg-theme-secondary active:scale-95 transition-all"
          >Next</button
        >
      {:else if step === "REVIEW"}
        <button
          onclick={handleFinalize}
          class="px-4 py-1 bg-theme-primary text-theme-bg font-bold rounded text-[10px] uppercase tracking-widest hover:bg-theme-secondary active:scale-95 transition-all"
          >Create Connection</button
        >
      {/if}
    {/if}
  </div>
</div>
