<script lang="ts">
  import { oracle, type ChatMessage } from "$lib/stores/oracle.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import {
    nodeMergeService,
    type IMergedContentProposal,
  } from "$lib/services/node-merge.service";
  import Autocomplete from "../ui/Autocomplete.svelte";
  import { fade, slide } from "svelte/transition";

  let { message = $bindable() }: { message: ChatMessage } = $props();

  type Step = "SELECT_SOURCE" | "SELECT_TARGET" | "REVIEW" | "MERGING" | "DONE";

  let step = $state<Step>("SELECT_SOURCE");
  let sourceId = $state<string | null>(null);
  let sourceName = $state("");
  let targetId = $state<string | null>(null);
  let targetName = $state("");

  let proposal = $state<IMergedContentProposal | null>(null);
  let isProposing = $state(false);
  let error = $state<string | null>(null);
  let strategy = $state<"concat" | "ai">("concat");

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
        error = "Cannot merge an entity into itself.";
        return;
      }

      step = "REVIEW";
      generateProposal();
    }
  };

  const generateProposal = async () => {
    if (!sourceId || !targetId) return;

    isProposing = true;
    error = null;
    try {
      proposal = await nodeMergeService.proposeMerge({
        sourceNodeIds: [sourceId, targetId],
        targetNodeId: targetId,
        strategy,
      });
    } catch (err: any) {
      console.error(err);
      error = err.message;
    } finally {
      isProposing = false;
    }
  };

  const handleMerge = async () => {
    if (!proposal || !sourceId || !targetId) return;

    step = "MERGING";
    try {
      // Capture state for Undo (optional but good practice for Oracle)
      const sId = sourceId;
      const tId = targetId;
      const sourceEntity = vault.entities[sId];
      const targetEntity = vault.entities[tId];
      const beforeTarget = JSON.parse(
        JSON.stringify($state.snapshot(targetEntity)),
      );
      const beforeSource = JSON.parse(
        JSON.stringify($state.snapshot(sourceEntity)),
      );

      await nodeMergeService.executeMerge(proposal, [sId, tId]);

      // Push Undo
      oracle.pushUndoAction(
        `Merge ${sourceEntity.title} into ${targetEntity.title}`,
        async () => {
          await vault.createEntity(beforeSource.type, beforeSource.title, {
            ...beforeSource,
            id: beforeSource.id,
          });
          vault.updateEntity(tId, beforeTarget);
        },
        message.id,
      );

      step = "DONE";
      message.content = `Merged **${sourceEntity.title}** into **${targetEntity.title}**.`;
      message.type = "text";
    } catch (err: any) {
      error = err.message;
      step = "REVIEW";
    }
  };

  const handleCancel = () => {
    oracle.removeMessage(message.id);
  };
</script>

<div class="flex flex-col gap-3 p-1">
  <div
    class="flex items-center gap-2 text-theme-accent font-bold uppercase tracking-[0.2em] text-[10px] mb-1"
  >
    <span class="icon-[lucide--merge] w-3.5 h-3.5"></span>
    Merge Wizard
  </div>

  {#if step === "SELECT_SOURCE"}
    <div in:fade>
      <p class="text-xs text-theme-muted mb-2 font-mono">
        1. Select the entity to ABSORB (will be deleted):
      </p>
      <Autocomplete
        bind:value={sourceName}
        bind:selectedId={sourceId}
        placeholder="Type source entity name..."
      />
    </div>
  {:else if step === "SELECT_TARGET"}
    <div in:fade>
      <p class="text-xs text-theme-muted mb-2 font-mono">
        2. Select the entity to KEEP (will be updated):
      </p>
      <div
        class="flex items-center gap-2 mb-2 px-2 py-1 bg-theme-accent/10 rounded border border-theme-accent/20"
      >
        <span class="text-[10px] font-bold text-theme-accent uppercase"
          >Absorb:</span
        >
        <span class="text-xs text-theme-text font-mono truncate"
          >{sourceName}</span
        >
      </div>
      <Autocomplete
        bind:value={targetName}
        bind:selectedId={targetId}
        placeholder="Type target entity name..."
      />
    </div>
  {:else if step === "REVIEW"}
    <div class="space-y-3" in:fade>
      <div
        class="flex flex-col gap-1 p-2 bg-theme-bg/50 rounded border border-theme-border text-xs font-mono"
      >
        <div class="flex gap-2">
          <span class="text-theme-muted w-16 shrink-0 text-right uppercase"
            >Source:</span
          >
          <span class="text-theme-text truncate"
            >{vault.entities[sourceId!]?.title ?? "Unknown Entity"}</span
          >
        </div>
        <div class="flex gap-2 text-theme-accent">
          <span class="text-theme-muted w-16 shrink-0 text-right uppercase"
            >Into:</span
          >
          <span class="font-bold truncate"
            >{vault.entities[targetId!]?.title ?? "Unknown Entity"}</span
          >
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <div class="flex justify-between items-center">
          <span
            class="text-[9px] font-bold text-theme-secondary uppercase tracking-wider"
            >Merge Strategy</span
          >
          <div
            class="flex bg-theme-bg border border-theme-border rounded p-0.5"
          >
            <button
              class="px-2 py-0.5 text-[9px] rounded transition-colors {strategy ===
              'concat'
                ? 'bg-theme-surface text-theme-text'
                : 'text-theme-muted'}"
              onclick={() => {
                strategy = "concat";
                generateProposal();
              }}
              disabled={isProposing}>Concat</button
            >
            <button
              class="px-2 py-0.5 text-[9px] rounded transition-colors {strategy ===
              'ai'
                ? 'bg-theme-primary/20 text-theme-primary'
                : 'text-theme-muted'}"
              onclick={() => {
                strategy = "ai";
                generateProposal();
              }}
              disabled={isProposing}>AI</button
            >
          </div>
        </div>

        {#if isProposing}
          <div
            class="h-32 flex flex-col items-center justify-center bg-theme-bg rounded border border-theme-border border-dashed animate-pulse gap-2"
          >
            <div
              class="w-4 h-4 border-2 border-theme-primary/30 border-t-theme-primary rounded-full animate-spin"
            ></div>
            <span class="text-[10px] font-mono text-theme-muted uppercase"
              >Generating Preview...</span
            >
          </div>
        {:else if proposal}
          <div class="relative group">
            <div
              class="max-h-32 overflow-y-auto p-2 bg-theme-bg/30 rounded border border-theme-border text-[10px] font-mono whitespace-pre-wrap text-theme-text/70"
            >
              {proposal.suggestedBody}
            </div>
            <div
              class="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-theme-bg/50 to-transparent pointer-events-none"
            ></div>
          </div>
        {/if}
      </div>
    </div>
  {:else if step === "MERGING"}
    <div class="flex flex-col items-center py-4 gap-3" in:fade>
      <div
        class="w-8 h-8 border-2 border-theme-accent/30 border-t-theme-accent rounded-full animate-spin"
      ></div>
      <p
        class="text-xs text-theme-accent animate-pulse font-mono uppercase tracking-widest"
      >
        Merging world threads...
      </p>
    </div>
  {:else if step === "DONE"}
    <div class="py-2 text-center" in:fade>
      <span
        class="text-green-400 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
      >
        <span class="icon-[heroicons--check-circle] w-4 h-4"></span>
        Entities Merged
      </span>
    </div>
  {/if}

  {#if error}
    <p class="text-[10px] text-red-400 font-mono italic" transition:slide>
      {error}
    </p>
  {/if}

  <div class="flex justify-end gap-2 pt-2 border-t border-theme-border/30">
    {#if step !== "DONE" && step !== "MERGING"}
      <button
        onclick={handleCancel}
        class="px-3 py-1 text-[10px] font-bold text-theme-muted hover:text-theme-text uppercase tracking-widest transition-all"
        >Cancel</button
      >

      {#if step === "SELECT_SOURCE" || step === "SELECT_TARGET"}
        <button
          onclick={handleNext}
          class="px-4 py-1 bg-theme-accent text-theme-bg font-bold rounded text-[10px] uppercase tracking-widest hover:opacity-80 active:scale-95 transition-all"
          >Next</button
        >
      {:else if step === "REVIEW"}
        <button
          onclick={handleMerge}
          class="px-4 py-1 bg-theme-accent text-theme-bg font-bold rounded text-[10px] uppercase tracking-widest hover:opacity-80 active:scale-95 transition-all"
          >Confirm Merge</button
        >
      {/if}
    {/if}
  </div>
</div>
