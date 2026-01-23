<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { initGraph } from "graph-engine";
  import { graph } from "$lib/stores/graph.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import type { Core, NodeSingular } from "cytoscape";

  let container: HTMLElement;
  let cy: Core | undefined = $state();

  let connectMode = $state(false);
  let sourceId = $state<string | null>(null);

  onMount(() => {
    if (container) {
      cy = initGraph({
        container,
        elements: graph.elements,
      });

      cy.on("tap", "node", (evt) => {
        if (!connectMode) return;
        const targetNode = evt.target as NodeSingular;
        const targetId = targetNode.id();

        if (!sourceId) {
          sourceId = targetId;
          targetNode.addClass("selected-source");
        } else if (sourceId === targetId) {
          // Deselect
          sourceId = null;
          targetNode.removeClass("selected-source");
        } else {
          // Connect!
          vault.addConnection(sourceId, targetId);

          // Cleanup
          cy?.$(".selected-source").removeClass("selected-source");
          sourceId = null;
        }
      });

      cy.on("tap", (evt) => {
        if (evt.target === cy && sourceId) {
          cy?.$(".selected-source").removeClass("selected-source");
          sourceId = null;
        }
      });
    }
  });

  onDestroy(() => {
    if (cy) {
      cy.destroy();
    }
  });

  // Reactive effect to update graph when store changes
  $effect(() => {
    if (cy && graph.elements) {
      const currentIds = new Set(cy.elements().map((el) => el.id()));
      const newElements = graph.elements.filter(
        (el) => !currentIds.has(el.data.id),
      );

      if (newElements.length > 0) {
        cy.add(newElements);
        cy.layout({ name: "cose", animate: true, fit: true }).run();
      } else {
        // Update existing elements if needed (e.g. labels changed)
        // For simplicity in MVP, full JSON update if no new elements but data might have changed
        // cy.json({ elements: graph.elements });
      }
    }
  });

  // Reactive effect for styling
  $effect(() => {
    if (cy) {
      cy.style()
        .selector(".selected-source")
        .style({
          "border-width": 4,
          "border-color": "#3b82f6",
          "background-color": "#93c5fd",
        })
        .update();
    }
  });
</script>

<div class="relative group">
  <div class="absolute top-2 right-2 z-10 flex gap-2">
    <button
      class="px-3 py-1 text-xs font-semibold rounded shadow-sm transition
             {connectMode
        ? 'bg-blue-600 text-white'
        : 'bg-white text-gray-700 border hover:bg-gray-50'}"
      onclick={() => {
        connectMode = !connectMode;
        if (!connectMode && cy) {
          cy.$(".selected-source").removeClass("selected-source");
          sourceId = null;
        }
      }}
    >
      {connectMode ? "Exit Connect Mode" : "Connect Nodes"}
    </button>
  </div>
  <div
    class="graph-container w-full h-[500px] border border-gray-200 rounded shadow-inner bg-white"
    bind:this={container}
  ></div>
  {#if connectMode && !sourceId}
    <div
      class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-blue-100 text-blue-800 px-4 py-1 rounded-full text-sm font-medium border border-blue-200 shadow-sm pointer-events-none"
    >
      Select source node...
    </div>
  {:else if connectMode && sourceId}
    <div
      class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-green-100 text-green-800 px-4 py-1 rounded-full text-sm font-medium border border-green-200 shadow-sm pointer-events-none"
    >
      Select target node to connect...
    </div>
  {/if}
</div>
