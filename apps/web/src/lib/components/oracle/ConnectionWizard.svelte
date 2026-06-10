<script lang="ts">
  import { oracle, type ChatMessage } from "$lib/stores/oracle.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import Autocomplete from "../ui/Autocomplete.svelte";
  import { fade, slide } from "svelte/transition";

  let { message = $bindable() }: { message: ChatMessage } = $props();

  type Step = "SELECT_SOURCE" | "SELECT_TARGET" | "DONE";

  // Prefill logic for direct commands
  const prefill = (message as any).prefill;

  let step = $state<Step>(prefill ? "SELECT_TARGET" : "SELECT_SOURCE");
  let sourceId = $state<string | null>(prefill?.sourceId || null);
  let sourceName = $state(
    prefill?.sourceId ? vault.entities[prefill.sourceId]?.title : "",
  );
  let sourceTitle = $derived(sourceId ? vault.entities[sourceId]?.title : "");
  let targetId = $state<string | null>(prefill?.targetId || null);
  let targetName = $state(
    prefill?.targetId ? vault.entities[prefill.targetId]?.title : "",
  );
  let targetTitle = $derived(targetId ? vault.entities[targetId]?.title : "");
  let type = $state(prefill?.type || "related_to");
  let label = $state(prefill?.label || "");
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
    }
  };

  const handleFinalize = async () => {
    if (!sourceId || !targetId) return;

    const success = await vault.addConnection(sourceId, targetId, type, label);
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
    class="flex items-center gap-2 text-theme-primary font-bold uppercase font-header tracking-[0.2em] text-[10px] mb-1"
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
    <div class="space-y-3" in:fade>
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
      <div
        class="flex flex-col gap-1 p-2 bg-theme-bg/50 rounded border border-theme-border text-xs font-mono"
      >
        <div class="flex gap-2">
          <span class="text-theme-muted w-12 shrink-0 text-right">FROM:</span>
          <span class="text-theme-text truncate"
            >{sourceTitle || "Unknown Entity"}</span
          >
        </div>
        <div class="flex gap-2">
          <span class="text-theme-muted w-12 shrink-0 text-right">TO:</span>
          <span class="text-theme-text truncate"
            >{targetTitle || "Unknown Entity"}</span
          >
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div class="flex flex-col gap-1">
          <label
            for="wizard-connection-type"
            class="text-[9px] font-bold text-theme-secondary uppercase font-header tracking-wider"
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
            class="text-[9px] font-bold text-theme-secondary uppercase font-header tracking-wider"
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
        class="text-green-400 font-bold uppercase font-header tracking-widest text-[10px] flex items-center justify-center gap-2"
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
        class="px-3 py-1 text-[10px] font-bold text-theme-muted hover:text-theme-text uppercase font-header tracking-widest transition-all"
        >Cancel</button
      >

      {#if step === "SELECT_SOURCE"}
        <button
          onclick={handleNext}
          class="px-4 py-1 bg-theme-primary text-theme-bg font-bold rounded text-[10px] uppercase font-header tracking-widest hover:bg-theme-secondary active:scale-95 transition-all"
          >Next</button
        >
      {:else if step === "SELECT_TARGET"}
        <button
          onclick={handleFinalize}
          class="px-4 py-1 bg-theme-primary text-theme-bg font-bold rounded text-[10px] uppercase font-header tracking-widest hover:bg-theme-secondary active:scale-95 transition-all"
          >Create Connection</button
        >
      {/if}
    {/if}
  </div>
</div>
