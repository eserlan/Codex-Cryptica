<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { vault } from "$lib/stores/vault.svelte";

  let { editingEdge = $bindable() } = $props<{
    editingEdge: {
      source: string;
      target: string;
      label: string;
      type: string;
    } | null;
  }>();

  let edgeEditInput = $state("");
  let edgeEditType = $state("neutral");

  $effect(() => {
    if (editingEdge) {
      edgeEditInput = editingEdge.label;
      edgeEditType = editingEdge.type;
    }
  });

  const saveEdgeLabel = async () => {
    if (editingEdge) {
      await vault.updateConnection(
        editingEdge.source,
        editingEdge.target,
        editingEdge.type,
        edgeEditType,
        edgeEditInput,
      );
      editingEdge = null;
    }
  };

  const close = () => {
    editingEdge = null;
  };

  const handleWindowKeydown = (e: KeyboardEvent) => {
    if (!editingEdge) return;
    if (e.key === "Escape") close();
  };
</script>

<svelte:window onkeydown={handleWindowKeydown} />

{#if editingEdge}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-theme-bg/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
    transition:fade={{ duration: 200 }}
    onclick={close}
  >
    <div
      class="bg-theme-surface border border-theme-primary p-6 shadow-2xl w-full max-w-md"
      transition:fly={{ y: 20, duration: 300 }}
      onclick={(e) => e.stopPropagation()}
    >
      <h2
        class="text-theme-primary font-header font-bold text-sm uppercase tracking-[0.2em] mb-4"
      >
        Update Connection
      </h2>

      <div class="space-y-4">
        <div>
          <label
            for="edge-label"
            class="block text-[10px] font-bold text-theme-muted uppercase mb-1"
            >Label</label
          >
          <input
            id="edge-label"
            type="text"
            bind:value={edgeEditInput}
            class="w-full bg-theme-bg border border-theme-border px-3 py-2 text-xs focus:border-theme-primary outline-none text-theme-text transition-colors"
            placeholder="Friend, Enemy, Leader..."
          />
        </div>

        <div>
          <label
            for="edge-type"
            class="block text-[10px] font-bold text-theme-muted uppercase mb-1"
            >Relationship Nature</label
          >
          <select
            id="edge-type"
            bind:value={edgeEditType}
            class="w-full bg-theme-bg border border-theme-border px-3 py-2 text-xs focus:border-theme-primary outline-none text-theme-text transition-colors"
          >
            <option value="friendly">Friendly</option>
            <option value="neutral">Neutral</option>
            <option value="enemy">Hostile</option>
          </select>
        </div>

        <div class="flex justify-between items-center pt-4">
          <button
            onclick={async () => {
              if (editingEdge) {
                await vault.removeConnection(
                  editingEdge.source,
                  editingEdge.target,
                  editingEdge.type,
                );
                editingEdge = null;
              }
            }}
            class="text-[10px] font-bold text-red-600 hover:text-red-500 uppercase tracking-widest transition-colors"
          >
            Sever Connection
          </button>

          <div class="flex gap-2">
            <button
              onclick={() => (editingEdge = null)}
              class="px-4 py-2 text-[10px] font-bold text-theme-muted hover:text-theme-text uppercase tracking-widest transition-colors"
            >
              Cancel
            </button>
            <button
              onclick={saveEdgeLabel}
              class="px-6 py-2 bg-theme-primary text-theme-bg text-[10px] font-bold uppercase tracking-widest hover:bg-theme-secondary transition-colors"
            >
              Sync Data
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
