<script lang="ts">
  import { graph } from "$lib/stores/graph.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import type { Core, EventObject, NodeSingular } from "cytoscape";

  let { cy } = $props<{ cy: Core }>();

  let contextMenuOpen = $state(false);
  let position = $state({ x: 0, y: 0 });
  let targetId = $state<string | null>(null);
  let selectedNodes = $state<string[]>([]);

  $effect(() => {
    if (cy) {
      const openHandler = (evt: EventObject) => {
        const node = evt.target;
        targetId = node.id();
        position = { x: evt.renderedPosition.x, y: evt.renderedPosition.y };
        
        // Check selection
        const selection = cy.$("node:selected");
        if (node.selected()) {
            selectedNodes = selection.map((n: NodeSingular) => n.id());
        } else {
            selectedNodes = [targetId!];
        }
        
        contextMenuOpen = true;
      };

      const closeHandler = () => {
        contextMenuOpen = false;
      };

      cy.on("cxttap", "node", openHandler);
      cy.on("tap", closeHandler);

      return () => {
        cy.off("cxttap", "node", openHandler);
        cy.off("tap", closeHandler);
      };
    }
  });

  const setCentralNode = () => {
    if (targetId) {
      graph.setCentralNode(targetId);
      contextMenuOpen = false;
    }
  };

  const handleMerge = () => {
    if (selectedNodes.length > 1) {
      ui.openMergeDialog(selectedNodes);
      contextMenuOpen = false;
    }
  };
</script>

{#if contextMenuOpen}
  <div
    class="absolute z-50 bg-theme-surface border border-theme-border shadow-2xl rounded overflow-hidden min-w-[150px]"
    style:top="{position.y}px"
    style:left="{position.x}px"
  >
    <button
      class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition"
      onclick={setCentralNode}
    >
      Set as Central Node
    </button>
    {#if selectedNodes.length > 1}
      <button
        class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition border-t border-theme-border"
        onclick={handleMerge}
      >
        Merge {selectedNodes.length} Nodes
      </button>
    {/if}
  </div>
{/if}
