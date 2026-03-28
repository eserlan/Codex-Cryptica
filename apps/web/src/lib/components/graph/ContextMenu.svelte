<script lang="ts">
  import { graph } from "$lib/stores/graph.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
  import CanvasPicker from "$lib/components/canvas/CanvasPicker.svelte";
  import FeatureHint from "$lib/components/help/FeatureHint.svelte";
  import type { Core, EventObject, NodeSingular } from "cytoscape";

  let { cy } = $props<{ cy: Core }>();

  let contextMenuOpen = $state(false);
  let canvasPickerOpen = $state(false);
  let position = $state({ x: 0, y: 0 });
  let targetId = $state<string | null>(null);
  let selectedNodes = $state<string[]>([]);
  let pickerTimeout: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    if (cy) {
      const openHandler = (evt: EventObject) => {
        const node = evt.target;
        targetId = node.id();
        position = evt.renderedPosition || { x: 0, y: 0 };

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
        canvasPickerOpen = false;
      };

      cy.on("cxttap", "node", openHandler);
      cy.on("tap", closeHandler);

      return () => {
        cy.off("cxttap", "node", openHandler);
        cy.off("tap", closeHandler);
      };
    }
  });

  let menuEl = $state<HTMLDivElement>();

  // Focus first menu item when menu opens
  $effect(() => {
    if (contextMenuOpen && menuEl) {
      const firstItem =
        menuEl.querySelector<HTMLButtonElement>('[role="menuitem"]');
      firstItem?.focus();
    }
  });

  const handleMenuKeydown = (e: KeyboardEvent) => {
    if (!menuEl) return;
    const items = Array.from(
      menuEl.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
    );
    if (items.length === 0) return;

    const current = document.activeElement as HTMLButtonElement;
    const idx = items.indexOf(current);

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      contextMenuOpen = false;
      canvasPickerOpen = false;
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = (idx + 1) % items.length;
      items[nextIdx]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIdx = idx <= 0 ? items.length - 1 : idx - 1;
      items[prevIdx]?.focus();
    }
  };

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

  const handleConnectSelection = () => {
    if (selectedNodes.length === 2) {
      ui.startSelectionConnection();
      contextMenuOpen = false;
    }
  };

  const handleBulkLabel = () => {
    if (selectedNodes.length >= 1) {
      ui.openBulkLabelDialog(selectedNodes);
      contextMenuOpen = false;
    }
  };

  const showCanvasPicker = () => {
    if (pickerTimeout) clearTimeout(pickerTimeout);
    pickerTimeout = setTimeout(() => {
      canvasPickerOpen = true;
    }, 100);
  };

  const hideCanvasPicker = () => {
    if (pickerTimeout) clearTimeout(pickerTimeout);
    pickerTimeout = setTimeout(() => {
      canvasPickerOpen = false;
    }, 150);
  };

  const handleAddToCanvas = async (canvasId: string) => {
    canvasPickerOpen = false;
    try {
      const result = await canvasRegistry.addEntities(canvasId, selectedNodes);

      if (result.added.length > 0) {
        const msg =
          result.added.length === 1
            ? `Added to "${canvasRegistry.canvases[canvasId]?.name || "canvas"}"`
            : `Added ${result.added.length} entities to "${canvasRegistry.canvases[canvasId]?.name || "canvas"}"`;
        ui.notify(msg, "success");
      }

      if (result.skipped.length > 0) {
        const msg =
          result.skipped.length === 1
            ? "1 entity already on canvas"
            : `${result.skipped.length} entities already on canvas`;
        ui.notify(msg, "info");
      }
    } catch (err: any) {
      console.error("Failed to add entities to canvas", err);
      ui.notify(`Failed to add to canvas: ${err.message}`, "error");
    }
  };

  const handleCreateCanvas = async () => {
    canvasPickerOpen = false;
    try {
      const result = await canvasRegistry.createCanvas(selectedNodes);

      if (result) {
        ui.notify(
          `Created canvas "${result.name}" with ${selectedNodes.length} entit${selectedNodes.length === 1 ? "y" : "ies"}`,
          "success",
        );
      }
    } catch (err: any) {
      console.error("Failed to create canvas", err);
      ui.notify(`Failed to create canvas: ${err.message}`, "error");
    }
  };

  const deleteNodes = async () => {
    const count = selectedNodes.length;
    const message =
      count > 1
        ? `Are you sure you want to delete ${count} nodes and all their connections? This cannot be undone.`
        : "Are you sure you want to delete this node and all its connections? This cannot be undone.";

    if (window.confirm(message)) {
      contextMenuOpen = false;
      canvasPickerOpen = false;
      try {
        for (const id of selectedNodes) {
          await vault.deleteEntity(id);
        }
        ui.notify(
          count > 1 ? `Deleted ${count} nodes.` : "Node deleted.",
          "success",
        );
      } catch (err: any) {
        console.error("Failed to delete nodes", err);
        ui.notify(`Failed to delete: ${err.message}`, "error");
      }
    }
  };
</script>

{#if contextMenuOpen}
  <div
    class="absolute z-40 pointer-events-none"
    style:top="{position.y - 130}px"
    style:left="{position.x - 110}px"
  >
    <FeatureHint hintId="canvas-context-menu" />
  </div>

  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    bind:this={menuEl}
    role="menu"
    aria-label="Node actions"
    tabindex="-1"
    class="absolute z-50 bg-theme-surface border border-theme-border shadow-2xl rounded overflow-hidden min-w-[150px]"
    style:top="{position.y}px"
    style:left="{position.x}px"
    onkeydown={handleMenuKeydown}
  >
    <button
      role="menuitem"
      class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition"
      onclick={setCentralNode}
      aria-label="Set as Central Node"
    >
      Set as Central Node
    </button>
    {#if selectedNodes.length === 2}
      <button
        role="menuitem"
        class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition border-t border-theme-border"
        onclick={handleConnectSelection}
        aria-label="Connect 2 Nodes"
      >
        Connect 2 Nodes
      </button>
    {/if}
    {#if selectedNodes.length > 1}
      <button
        role="menuitem"
        class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition border-t border-theme-border"
        onclick={handleMerge}
        aria-label="Merge {selectedNodes.length} Nodes"
      >
        Merge {selectedNodes.length} Nodes
      </button>
    {/if}
    <button
      role="menuitem"
      class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition border-t border-theme-border"
      onclick={handleBulkLabel}
      aria-label="Apply / Remove Label"
    >
      {selectedNodes.length > 1
        ? `Label ${selectedNodes.length} Nodes…`
        : "Label…"}
    </button>
    <button
      role="menuitem"
      data-testid="add-to-canvas-button"
      class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition border-t border-theme-border relative"
      onmouseenter={showCanvasPicker}
      onmouseleave={hideCanvasPicker}
      onclick={() => (canvasPickerOpen = !canvasPickerOpen)}
      aria-label="Add to Canvas"
      aria-expanded={canvasPickerOpen}
      aria-haspopup="true"
    >
      Add to Canvas
      {#if canvasPickerOpen}
        <div
          role="menu"
          aria-label="Canvas selection"
          tabindex="0"
          class="fixed z-[100] bg-theme-surface border border-theme-border shadow-2xl rounded overflow-hidden min-w-[200px]"
          style:top="{position.y - 40}px"
          style:left="{position.x + 180}px"
          onmouseenter={showCanvasPicker}
          onmouseleave={hideCanvasPicker}
        >
          <CanvasPicker
            onSelect={handleAddToCanvas}
            onCreateNew={handleCreateCanvas}
          />
        </div>
      {/if}
    </button>
    {#if !vault.isGuest}
      <button
        role="menuitem"
        class="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition border-t border-theme-border"
        onclick={deleteNodes}
        aria-label="Delete {selectedNodes.length > 1
          ? `${selectedNodes.length} Nodes`
          : 'Node'}"
      >
        Delete {selectedNodes.length > 1
          ? `${selectedNodes.length} Nodes`
          : "Node"}
      </button>
    {/if}
  </div>
{/if}
