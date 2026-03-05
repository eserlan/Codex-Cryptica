<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import { fade } from "svelte/transition";
  import type { Core, NodeSingular } from "cytoscape";

  let { cy } = $props<{ cy: Core }>();

  let selection = $state<NodeSingular[]>([]);
  let position = $state({ x: 0, y: 0 });
  let labelInput = $state("");
  let isSubmitting = $state(false);
  let previousShow = $state(false);

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
          ui.showSelectionConnector = false;
          isSubmitting = false;
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

  // Prefill label when connector opens
  $effect(() => {
    const currentShow = ui.showSelectionConnector;
    if (currentShow && !previousShow) {
      labelInput = ui.lastConnectionLabel;
      isSubmitting = false;
    }
    previousShow = currentShow;
  });

  const submit = async () => {
    if (selection.length === 2 && !isSubmitting) {
      isSubmitting = true;
      try {
        const sourceId = selection[0].id();
        const targetId = selection[1].id();
        const label = labelInput.trim() || "related_to";
        const sourceTitle = selection[0].data("label");
        const targetTitle = selection[1].data("label");

        const success = await vault.addConnection(
          sourceId,
          targetId,
          "neutral",
          label,
        );

        if (success) {
          ui.setLastConnectionLabel(label);
          cy.elements().unselect();
          ui.showSelectionConnector = false;
          ui.notify(`Connected ${sourceTitle} to ${targetTitle}`);
        } else {
          ui.notify(
            `Failed to connect ${sourceTitle} to ${targetTitle}`,
            "error",
          );
          isSubmitting = false;
        }
      } catch (err) {
        console.error("[SelectionConnector] submit failed", err);
        isSubmitting = false;
      }
    }
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      submit();
    } else if (e.key === "Escape") {
      ui.showSelectionConnector = false;
    }
  };

  const selectRecent = (label: string) => {
    labelInput = label;
    submit();
  };

  const focusAction = (el: HTMLInputElement) => {
    el.focus();
  };
</script>

{#if selection.length === 2 && ui.showSelectionConnector}
  <div
    class="absolute z-40 pointer-events-none"
    style:top="{position.y}px"
    style:left="{position.x}px"
    transition:fade={{ duration: 150 }}
  >
    <div class="pointer-events-auto -translate-x-1/2 -translate-y-1/2">
      <div
        class="bg-theme-surface border border-theme-border shadow-2xl p-3 min-w-[240px] rounded"
      >
        <div
          id="connector-title"
          class="text-[10px] font-mono text-theme-primary uppercase tracking-widest mb-2"
        >
          Label Connection
        </div>
        <input
          bind:value={labelInput}
          onkeydown={handleKeydown}
          placeholder="e.g. Brother, Rival..."
          class="w-full bg-theme-bg border border-theme-border text-theme-text px-3 py-2 text-xs font-mono focus:outline-none focus:border-theme-primary rounded mb-3"
          use:focusAction
          disabled={isSubmitting}
          aria-labelledby="connector-title"
        />

        {#if ui.recentConnectionLabels.length > 0}
          <div class="flex flex-wrap gap-1 mb-3">
            {#each ui.recentConnectionLabels as label}
              <button
                class="text-[9px] bg-theme-primary/10 text-theme-primary border border-theme-primary/30 px-2 py-0.5 rounded-full hover:bg-theme-primary hover:text-theme-bg transition"
                onclick={() => selectRecent(label)}
                disabled={isSubmitting}
              >
                {label}
              </button>
            {/each}
          </div>
        {/if}

        <div class="flex justify-end gap-2">
          <button
            class="text-[10px] font-mono text-theme-muted hover:text-theme-text transition uppercase"
            onclick={() => (ui.showSelectionConnector = false)}
            disabled={isSubmitting}
            aria-label="Cancel connection"
          >
            Cancel
          </button>
          <button
            class="text-[10px] font-mono text-theme-primary hover:text-theme-accent transition uppercase"
            onclick={submit}
            disabled={isSubmitting}
            aria-label="Create connection"
          >
            {isSubmitting ? "Linking..." : "Link"}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
