<script lang="ts">
  import { untrack } from "svelte";
  import type { Core, NodeSingular } from "cytoscape";
  import { vault } from "$lib/stores/vault.svelte";
  import { openSelectionReport } from "$lib/components/reports/open-selection-report";

  let { cy } = $props<{ cy: Core }>();

  let selectedIds = $state<string[]>([]);

  const update = () => {
    selectedIds = cy
      ? cy.$("node:selected").map((n: NodeSingular) => n.id())
      : [];
  };

  $effect(() => {
    if (!cy) return;
    cy.on("select unselect remove", "node", update);
    untrack(update);
    return () => cy.off("select unselect remove", "node", update);
  });
</script>

{#if selectedIds.length > 1 && !vault.isGuest}
  <button
    type="button"
    class="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 inline-flex items-center gap-2 rounded-lg border border-theme-primary/50 bg-theme-surface/90 px-3 py-1.5 text-xs font-header uppercase tracking-widest text-theme-primary shadow-lg backdrop-blur-md hover:bg-theme-primary/15"
    data-testid="graph-generate-report"
    onclick={() => openSelectionReport("graph", selectedIds)}
  >
    <span class="icon-[lucide--file-text] h-4 w-4" aria-hidden="true"></span>
    Generate report ({selectedIds.length})
  </button>
{/if}
