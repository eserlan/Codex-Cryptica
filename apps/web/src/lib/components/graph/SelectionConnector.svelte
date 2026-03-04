<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import { fade } from "svelte/transition";
  import type { Core, NodeSingular } from "cytoscape";

  let { cy } = $props<{ cy: Core }>();

  let selection = $state<NodeSingular[]>([]);
  let position = $state({ x: 0, y: 0 });
  let isConnecting = $state(false);
  let labelInput = $state("");

  $effect(() => {
    if (cy) {
      const updateSelection = () => {
        const selected = cy.$("node:selected");
        if (selected.length === 2) {
          selection = [
            selected[0] as NodeSingular,
            selected[1] as NodeSingular,
          ];
          updatePosition();
        } else {
          selection = [];
          isConnecting = false;
        }
      };

      const updatePosition = () => {
        if (selection.length === 2) {
          const p1 = selection[0].renderedPosition();
          const p2 = selection[1].renderedPosition();
          position = {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
          };
        }
      };

      cy.on("select unselect", "node", updateSelection);
      cy.on("position pan zoom", updatePosition);

      // Initial check
      updateSelection();

      return () => {
        cy.off("select unselect", "node", updateSelection);
        cy.off("position pan zoom", updatePosition);
      };
    }
  });

  const handleConnect = () => {
    isConnecting = true;
    labelInput = ui.lastConnectionLabel;
  };

  const submit = async () => {
    if (selection.length === 2) {
      try {
        const sourceId = selection[0].id();
        const targetId = selection[1].id();
        const label = labelInput.trim() || "related_to";
        const sourceTitle = selection[0].data("label");
        const targetTitle = selection[1].data("label");

        await vault.addConnection(sourceId, targetId, "neutral", label);
        ui.setLastConnectionLabel(label);

        cy.elements().unselect();
        isConnecting = false;

        ui.notify(`Connected ${sourceTitle} to ${targetTitle}`);
      } catch (err) {
        console.error("[SelectionConnector] submit failed", err);
      }
    }
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      submit();
    } else if (e.key === "Escape") {
      isConnecting = false;
    }
  };

  const selectRecent = (label: string) => {
    labelInput = label;
    submit();
  };
</script>

{#if selection.length === 2}
  <div
    class="absolute z-40 pointer-events-none"
    style:top="{position.y}px"
    style:left="{position.x}px"
    transition:fade={{ duration: 150 }}
  >
    <div class="pointer-events-auto -translate-x-1/2 -translate-y-1/2">
      {#if !isConnecting}
        <button
          class="bg-theme-surface border border-theme-primary/50 text-theme-primary px-3 py-1.5 rounded shadow-2xl hover:bg-theme-primary hover:text-theme-bg transition flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider"
          onclick={handleConnect}
          aria-label="Connect Selection"
        >
          <span class="icon-[lucide--link] w-3 h-3"></span>
          Connect
        </button>
      {:else}
        <div
          class="bg-theme-surface border border-theme-border shadow-2xl p-3 min-w-[240px] rounded"
        >
          <div
            class="text-[10px] font-mono text-theme-primary uppercase tracking-widest mb-2"
          >
            Label Connection
          </div>
          <input
            bind:value={labelInput}
            onkeydown={handleKeydown}
            placeholder="e.g. Brother, Rival..."
            class="w-full bg-theme-bg border border-theme-border text-theme-text px-3 py-2 text-xs font-mono focus:outline-none focus:border-theme-primary rounded mb-3"
            autofocus
          />

          {#if ui.recentConnectionLabels.length > 0}
            <div class="flex flex-wrap gap-1 mb-3">
              {#each ui.recentConnectionLabels as label}
                <button
                  class="text-[9px] bg-theme-primary/10 text-theme-primary border border-theme-primary/30 px-2 py-0.5 rounded-full hover:bg-theme-primary hover:text-theme-bg transition"
                  onclick={() => selectRecent(label)}
                >
                  {label}
                </button>
              {/each}
            </div>
          {/if}

          <div class="flex justify-end gap-2">
            <button
              class="text-[10px] font-mono text-theme-muted hover:text-theme-text transition uppercase"
              onclick={() => (isConnecting = false)}
            >
              Cancel
            </button>
            <button
              class="text-[10px] font-mono text-theme-primary hover:text-theme-accent transition uppercase"
              onclick={submit}
            >
              Link
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
