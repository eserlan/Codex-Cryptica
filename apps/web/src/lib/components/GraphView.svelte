<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { onMount, onDestroy } from "svelte";
  import { initGraph } from "graph-engine";
  import { graph } from "$lib/stores/graph.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { parse } from "marked";
  import type { Core, NodeSingular } from "cytoscape";

  let container: HTMLElement;
  let cy: Core | undefined = $state();

  let connectMode = $state(false);
  let sourceId = $state<string | null>(null);
  let { selectedId = $bindable(null) } = $props<{
    selectedId: string | null;
  }>();

  let skipNextCenter = false;

  // Hover state
  let hoveredEntityId = $state<string | null>(null);
  let hoverPosition = $state<{ x: number; y: number } | null>(null);
  let hoverTimeout: number | undefined;
  const HOVER_DELAY = 800; // ms

  // Edge editing state
  let editingEdge = $state<{
    source: string;
    target: string;
    label: string;
  } | null>(null);
  let edgeEditInput = $state("");

  const toggleConnectMode = () => {
    connectMode = !connectMode;
    if (!connectMode) {
      sourceId = null;
      cy?.$(".selected-source").removeClass("selected-source");
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === "c" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Don't toggle if user is typing in an input (though we don't have many here yet)
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      )
        return;
      toggleConnectMode();
    }
    if (e.key === "Escape" && connectMode) {
      toggleConnectMode();
    }
  };

  // Green Sci-Fi Theme ("Green Ops")
  const SCIFI_GREEN_STYLE = [
    {
      selector: "node",
      style: {
        "background-color": "#022c22", // Very dark green
        "border-width": 1,
        "border-color": "#15803d", // Green-700
        width: 32,
        height: 32,
        shape: "round-rectangle",
        label: "data(label)",
        color: "#86efac", // Green-300
        "font-family": "Inter, sans-serif",
        "font-size": 10,
        "text-valign": "bottom",
        "text-margin-y": 8,
        "text-max-width": 80,
        "text-wrap": "wrap",
      },
    },
    {
      selector: "node[image]",
      style: {
        "background-image": "data(image)",
        "background-fit": "cover",
        "background-clip": "node",
        width: 48,
        height: 48,
        "border-width": 2,
        "border-color": "#4ade80", // Brighter border for images
      },
    },
    {
      selector: "node:selected",
      style: {
        "background-color": "#14532d", // Green-900
        "border-color": "#4ade80", // Green-400
        "border-width": 2,
        color: "#fff",
        "text-outline-color": "#000",
        "text-outline-width": 2,
        "overlay-color": "#22d3ee",
        "overlay-padding": 8,
        "overlay-opacity": 0.3,
      },
    },
    {
      selector: ".selected-source",
      style: {
        "border-width": 2,
        "border-color": "#facc15", // Yellow for source
        "background-color": "#422006",
      },
    },
    {
      selector: "edge",
      style: {
        width: 1,
        "line-color": "#14532d",
        "target-arrow-color": "#14532d",
        "curve-style": "bezier",
        "target-arrow-shape": "triangle",
        "arrow-scale": 0.6,
        opacity: 0.6,
        label: "data(label)",
        "text-rotation": "autorotate",
        "font-size": 8,
        "font-family": "Inter, sans-serif",
        color: "#86efac",
        "text-background-color": "#000",
        "text-background-opacity": 0.8,
        "text-background-padding": "2px",
        "text-margin-y": -8,
      },
    },
    {
      selector: "edge:selected",
      style: {
        "line-color": "#4ade80",
        "target-arrow-color": "#4ade80",
        width: 2,
        opacity: 1,
      },
    },
    // Type-specific Node Borders
    {
      selector: 'node[type="npc"]',
      style: {
        "border-color": "#60a5fa", // Blue-400
        "border-width": 3,
      },
    },
    {
      selector: 'node[type="location"]',
      style: {
        "border-color": "#4ade80", // Green-400
        "border-width": 3,
      },
    },
    {
      selector: 'node[type="item"]',
      style: {
        "border-color": "#facc15", // Yellow-400
        "border-width": 3,
      },
    },
    {
      selector: 'node[type="event"]',
      style: {
        "border-color": "#e879f9", // Fuchsia-400
        "border-width": 3,
      },
    },
    {
      selector: 'node[type="faction"]',
      style: {
        "border-color": "#fb923c", // Orange-400
        "border-width": 3,
      },
    },
  ];

  onMount(() => {
    if (container) {
      cy = initGraph({
        container,
        elements: graph.elements,
        style: SCIFI_GREEN_STYLE,
      });

      // Hover events
      cy.on("mouseover", "node", (evt) => {
        const node = evt.target;
        clearTimeout(hoverTimeout);
        hoverTimeout = window.setTimeout(() => {
          const renderedPos = node.renderedPosition();
          hoverPosition = {
            x: renderedPos.x,
            y: renderedPos.y,
          };
          hoveredEntityId = node.id();
        }, HOVER_DELAY);
      });

      cy.on("mouseout", "node", () => {
        clearTimeout(hoverTimeout);
        hoveredEntityId = null;
        hoverPosition = null;
      });

      // Update hover position on drag/pan/zoom to keep it attached (optional but nice)
      cy.on("position", "node", (evt) => {
        if (hoveredEntityId === evt.target.id()) {
          const renderedPos = evt.target.renderedPosition();
          hoverPosition = { x: renderedPos.x, y: renderedPos.y };
        }
      });
      cy.on("pan zoom", () => {
        if (hoveredEntityId && cy) {
          const node = cy.$id(hoveredEntityId);
          if (node.length > 0) {
            const renderedPos = node.renderedPosition();
            hoverPosition = { x: renderedPos.x, y: renderedPos.y };
          }
        }
      });

      cy.on("tap", "node", (evt) => {
        const targetNode = evt.target as NodeSingular;
        const targetId = targetNode.id();

        if (connectMode) {
          if (!sourceId) {
            sourceId = targetId;
            targetNode.addClass("selected-source");
          } else if (sourceId === targetId) {
            sourceId = null;
            targetNode.removeClass("selected-source");
          } else {
            vault.addConnection(sourceId, targetId);
            cy?.$(".selected-source").removeClass("selected-source");
            sourceId = null;
            connectMode = false; // Auto exit connect mode
          }
        } else {
          // Selection Logic for Detail Panel
          skipNextCenter = true;
          selectedId = targetId;
        }
      });

      // Right-click on edge to edit label
      cy.on("cxttap", "edge", (evt) => {
        const edge = evt.target;
        const sourceId = edge.data("source");
        const targetId = edge.data("target");
        const currentLabel = edge.data("label") || "";

        editingEdge = {
          source: sourceId,
          target: targetId,
          label: currentLabel,
        };
        edgeEditInput = currentLabel;
      });

      cy.on("tap", (evt) => {
        if (evt.target === cy) {
          // Only clear selection if we clicked strictly on background, not on node
          if (!connectMode) {
            selectedId = null;
          }
          // Close edge editor on background tap
          editingEdge = null;
        }
      });
    }
  });

  onDestroy(() => {
    if (cy) {
      cy.destroy();
    }
    clearTimeout(hoverTimeout);
  });

  // Reactive effect to update graph when store changes
  let initialLoaded = $state(false);

  // Center on selection when it changes externally
  $effect(() => {
    if (cy && selectedId) {
      const node = cy.$id(selectedId);
      if (node.length > 0) {
        // Select the node in Cytoscape if not already selected
        if (!node.selected()) {
          cy.$(":selected").unselect(); // Optional: clear other selections
          node.select();
        }

        if (skipNextCenter) {
          skipNextCenter = false;
        } else {
          cy.animate({
            center: { eles: node },
            duration: 500,
            easing: "ease-out-cubic",
          });
        }
      }
    }
  });

  $effect(() => {
    if (cy && graph.elements) {
      console.log(
        "GraphView Effect Triggered. Elements:",
        graph.elements.length,
      );

      try {
        cy.resize(); // Ensure viewport is up to date

        const currentElements = cy.elements();
        const currentIds = new Set(currentElements.map((el) => el.id()));
        const targetIds = new Set(graph.elements.map((el) => el.data.id));

        // 1. Remove elements no longer in the store
        const removedElements = currentElements.filter(
          (el) => !targetIds.has(el.id()),
        );
        if (removedElements.length > 0) {
          console.log("Removing elements:", removedElements.length);
          cy.remove(removedElements);
        }

        // 2. Add new elements
        const newElements = graph.elements.filter(
          (el) => !currentIds.has(el.data.id),
        );

        if (newElements.length > 0) {
          console.log("Adding new elements:", newElements.length);
          cy.add(newElements);
        }

        // 3. Update existing elements (labels, etc)
        graph.elements.forEach((el) => {
          if (currentIds.has(el.data.id)) {
            cy?.$id(el.data.id).data(el.data);
          }
        });

        // 4. Force layout and fit if changes occurred OR if first load with elements
        const shouldRunLayout =
          newElements.length > 0 ||
          removedElements.length > 0 ||
          (!initialLoaded && graph.elements.length > 0);

        if (shouldRunLayout) {
          console.log("Running layout/fit. Initial:", !initialLoaded);

          const layout = cy.layout({
            name: "cose",
            animate: true,
            // @ts-expect-error - 'duration' is valid for cose but types might be strict
            duration: 800,
            padding: 50,
            componentSpacing: 100,
          });

          layout.one("layoutstop", () => {
            cy?.fit(undefined, 50);
            initialLoaded = true;
          });

          layout.run();
        }
      } catch (err) {
        console.error("Cytoscape Error:", err);
      }
    }
  });

  // Save edge label
  const saveEdgeLabel = () => {
    if (editingEdge) {
      vault.updateConnection(editingEdge.source, editingEdge.target, {
        label: edgeEditInput || undefined,
      });
      editingEdge = null;
    }
  };

  // Derived state for breadcrumbs
  let selectedEntity = $derived(selectedId ? vault.entities[selectedId] : null);
  let parentEntity = $derived(
    selectedId
      ? vault.allEntities.find((e) =>
          e.connections.some((c) => c.target === selectedId),
        )
      : null,
  );

  // Derived state for tooltip
  let hoveredEntity = $derived(
    hoveredEntityId ? vault.entities[hoveredEntityId] : null,
  );
</script>

<div
  class="absolute inset-0 w-full h-full bg-[#050505] overflow-hidden shadow-2xl border-y border-green-900/30"
>
  <!-- ... (Background) ... -->
  <div
    class="absolute inset-0 pointer-events-none opacity-20"
    style="background-image: radial-gradient(#15803d 1px, transparent 1px); background-size: 30px 30px;"
  ></div>

  <!-- Breadcrumbs Overlay -->
  <div class="absolute top-6 left-6 z-20 flex items-center gap-3">
    <div
      class="bg-black/80 backdrop-blur border border-green-900/50 px-4 py-1.5 flex items-center gap-2 text-[10px] font-mono tracking-widest text-green-500 shadow-lg uppercase"
    >
      {#if selectedEntity}
        {#if parentEntity}
          <span class="text-green-700"
            >{parentEntity.title || parentEntity.id}</span
          >
          <span class="text-green-700">/</span>
        {/if}
        <span class="font-bold text-green-400"
          >{selectedEntity.title || selectedEntity.id}</span
        >
      {:else}
        <span class="text-green-700">SYSTEM</span>
        <span class="text-green-700">/</span>
        <span class="font-bold text-green-400">OVERVIEW</span>
      {/if}
    </div>
    {#if selectedId}
      <div
        class="flex items-center gap-2 text-[9px] font-bold text-green-500 animate-pulse"
      >
        <div class="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
        ARCHIVE DETAIL MODE
      </div>
    {/if}
  </div>

  <!-- Zoom Controls (Bottom Left) -->
  <div class="absolute bottom-6 left-6 z-20 flex flex-col gap-2 items-start">
    <!-- Status Indicator -->
    <div
      class="border border-green-900/30 bg-black/80 px-4 py-1.5 text-[10px] font-mono text-green-600 uppercase tracking-widest"
    >
      <span class="text-green-400 font-bold">Ready</span>
    </div>

    <div class="flex gap-1">
      <button
        class="w-8 h-8 flex items-center justify-center border border-green-900/50 bg-black/80 text-green-500 hover:bg-green-900/20 hover:text-green-300 transition"
        onclick={() => cy?.zoom(cy.zoom() * 1.2)}
        title="Zoom In"
        aria-label="Zoom In"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          ><path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
          ></path></svg
        >
      </button>
      <button
        class="w-8 h-8 flex items-center justify-center border border-green-900/50 bg-black/80 text-green-500 hover:bg-green-900/20 hover:text-green-300 transition"
        onclick={() => cy?.zoom(cy.zoom() / 1.2)}
        title="Zoom Out"
        aria-label="Zoom Out"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          ><path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
          ></path></svg
        >
      </button>

      <!-- Connect Mode Toggle -->
      <button
        class="w-8 h-8 flex items-center justify-center border transition {connectMode
          ? 'border-yellow-500 bg-yellow-500/20 text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]'
          : 'border-green-900/50 bg-black/80 text-green-500 hover:bg-green-900/20 hover:text-green-300'}"
        onclick={toggleConnectMode}
        title="Connect Mode (C)"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          ></path>
        </svg>
      </button>
    </div>
  </div>

  <!-- Graph Canvas -->
  <div
    class="absolute inset-0 z-10 w-full h-full"
    style="display: block !important;"
    bind:this={container}
  ></div>

  <!-- Hover Tooltip -->
  {#if hoveredEntityId && hoverPosition && hoveredEntity}
    <div
      class="absolute z-50 pointer-events-none"
      style="top: {hoverPosition.y}px; left: {hoverPosition.x}px; transform: translate(-50%, -115%);"
      transition:fade={{ duration: 150 }}
    >
      <div
        class="bg-black/95 border border-green-500/50 shadow-[0_0_20px_rgba(21,128,61,0.6)] p-4 rounded-sm max-w-[400px] min-w-[200px]"
        in:fly={{ y: 10, duration: 200 }}
      >
        <div
          class="text-xs font-bold text-green-400 tracking-wider uppercase mb-2 border-b border-green-900/50 pb-1 flex justify-between"
        >
          <span>{hoveredEntity.title}</span>
          <span class="text-[10px] text-green-700">{hoveredEntity.type}</span>
        </div>
        <div
          class="text-sm text-green-100/90 font-mono leading-relaxed prose prose-invert prose-p:my-1 prose-headings:text-green-400 prose-headings:text-xs prose-strong:text-green-300 prose-em:text-green-200"
        >
          {@html hoveredEntity.content
            ? parse(hoveredEntity.content)
            : '<span class="italic text-green-900">No data available</span>'}
        </div>

        <!-- Decorative corner bits -->
        <div
          class="absolute -top-px -left-px w-2 h-2 border-t border-l border-green-400"
        ></div>
        <div
          class="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-green-400"
        ></div>
      </div>
      <!-- Arrow/Stem -->
      <div
        class="absolute left-1/2 -translate-x-1/2 bottom-[-6px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-green-500/50"
      ></div>
    </div>
  {/if}

  <!-- Mini-map Decoration (Static Mock) -->
  <div
    class="absolute bottom-6 right-6 z-20 w-48 h-32 bg-black/80 backdrop-blur border border-green-900/50 rounded-lg p-2 hidden md:block"
  >
    <div
      class="w-full h-full border border-green-900/30 relative overflow-hidden"
    >
      <div
        class="absolute top-1/4 left-1/4 w-1/2 h-1/2 border border-green-500/30 bg-green-500/5"
      ></div>
      <div
        class="absolute bottom-2 left-2 w-1 h-1 bg-green-500 rounded-full animate-pulse"
      ></div>
      <span
        class="absolute bottom-1 right-2 text-[8px] text-green-800 font-mono"
        >LIVE_SURVEILLANCE_ACTIVE</span
      >
    </div>
  </div>

  <!-- Connection Hints -->
  {#if connectMode}
    <div
      class="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
    >
      {#if !sourceId}
        <div
          class="bg-green-500/10 border border-green-500/50 text-green-200 px-4 py-1 rounded-full text-xs font-mono animate-bounce"
        >
          > SELECT SOURCE NODE
        </div>
      {:else}
        <div
          class="bg-yellow-500/10 border border-yellow-500/50 text-yellow-200 px-4 py-1 rounded-full text-xs font-mono animate-bounce"
        >
          > SELECT TARGET TO LINK
        </div>
      {/if}
    </div>
  {/if}

  <!-- Edge Edit Modal -->
  {#if editingEdge}
    <div
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30"
    >
      <div
        class="bg-black/95 border border-green-900/50 shadow-2xl p-4 min-w-[280px]"
      >
        <div
          class="text-[10px] font-mono text-green-600 uppercase tracking-widest mb-3"
        >
          Edit Connection
        </div>
        <input
          type="text"
          bind:value={edgeEditInput}
          placeholder="Enter description..."
          class="w-full bg-black/50 border border-green-900/50 text-green-300 px-3 py-2 text-sm font-mono focus:outline-none focus:border-green-500"
          onkeydown={(e) => {
            if (e.key === "Enter") saveEdgeLabel();
            if (e.key === "Escape") editingEdge = null;
          }}
        />
        <div class="flex gap-2 mt-3">
          <button
            class="flex-1 px-3 py-1.5 text-xs font-mono uppercase bg-green-900/20 border border-green-900/50 text-green-500 hover:bg-green-900/40 transition"
            onclick={saveEdgeLabel}
          >
            Save
          </button>
          <button
            class="flex-1 px-3 py-1.5 text-xs font-mono uppercase bg-black/50 border border-green-900/50 text-green-700 hover:text-green-500 transition"
            onclick={() => (editingEdge = null)}
          >
            Cancel
          </button>
        </div>
        <button
          class="w-full mt-2 px-3 py-1.5 text-xs font-mono uppercase bg-red-900/20 border border-red-900/50 text-red-500 hover:bg-red-900/40 hover:text-red-400 transition"
          onclick={() => {
            if (editingEdge) {
              vault.removeConnection(editingEdge.source, editingEdge.target);
              editingEdge = null;
            }
          }}
        >
          Delete Connection
        </button>
      </div>
    </div>
  {/if}
</div>

<svelte:window onkeydown={handleKeyDown} />
