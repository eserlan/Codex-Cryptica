<script lang="ts">
  import { graph } from "$lib/stores/graph.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import CanvasPicker from "$lib/components/canvas/CanvasPicker.svelte";
  import type { Core, EventObject, NodeSingular } from "cytoscape";

  let { cy } = $props<{ cy: Core }>();

  let contextMenuOpen = $state(false);
  let canvasPickerOpen = $state(false);
  let categoryPickerOpen = $state(false);
  let position = $state({ x: 0, y: 0 });
  let pickerPosition = $state({ x: 0, y: 0 });
  let categoryPickerPosition = $state({ x: 0, y: 0 });
  let targetId = $state<string | null>(null);
  let selectedNodes = $state<string[]>([]);
  let pickerTimeout: ReturnType<typeof setTimeout> | null = null;
  let categoryPickerTimeout: ReturnType<typeof setTimeout> | null = null;
  let pickerAnchor = $state<HTMLButtonElement>();
  let categoryPickerAnchor = $state<HTMLButtonElement>();

  const hasImage = $derived.by(() => {
    return selectedNodes.some((id) => vault.entities[id]?.image);
  });

  const imageActionLabel = $derived.by(() => {
    return hasImage ? "Regen Image" : "Gen Image";
  });

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
        if (pickerTimeout) clearTimeout(pickerTimeout);
        if (categoryPickerTimeout) clearTimeout(categoryPickerTimeout);
        pickerTimeout = null;
        categoryPickerTimeout = null;
        contextMenuOpen = false;
        canvasPickerOpen = false;
        categoryPickerOpen = false;
      };

      cy.on("cxttap", "node", openHandler);
      cy.on("tap", closeHandler);

      return () => {
        if (pickerTimeout) clearTimeout(pickerTimeout);
        if (categoryPickerTimeout) clearTimeout(categoryPickerTimeout);
        pickerTimeout = null;
        categoryPickerTimeout = null;
        cy.off("cxttap", "node", openHandler);
        cy.off("tap", closeHandler);
      };
    }
  });

  let menuEl = $state<HTMLDivElement>();

  const clearPickerTimeout = () => {
    if (pickerTimeout) {
      clearTimeout(pickerTimeout);
      pickerTimeout = null;
    }
    if (categoryPickerTimeout) {
      clearTimeout(categoryPickerTimeout);
      categoryPickerTimeout = null;
    }
  };

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
      clearPickerTimeout();
      contextMenuOpen = false;
      canvasPickerOpen = false;
      categoryPickerOpen = false;
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

  const handleChooseFull = () => {
    clearPickerTimeout();
    canvasPickerOpen = false;
    contextMenuOpen = false;
    ui.openCanvasSelection(selectedNodes);
  };

  const showCanvasPicker = () => {
    clearPickerTimeout();
    pickerTimeout = setTimeout(() => {
      if (pickerAnchor) {
        const rect = pickerAnchor.getBoundingClientRect();
        pickerPosition = {
          x: rect.right + 4,
          y: rect.top,
        };
      }
      canvasPickerOpen = true;
      categoryPickerOpen = false;
    }, 100);
  };

  const hideCanvasPicker = () => {
    if (pickerTimeout) clearTimeout(pickerTimeout);
    pickerTimeout = setTimeout(() => {
      canvasPickerOpen = false;
    }, 150);
  };

  const showCategoryPicker = () => {
    clearPickerTimeout();
    categoryPickerTimeout = setTimeout(() => {
      if (categoryPickerAnchor) {
        const rect = categoryPickerAnchor.getBoundingClientRect();
        categoryPickerPosition = {
          x: rect.right + 4,
          y: rect.top,
        };
      }
      categoryPickerOpen = true;
      canvasPickerOpen = false;
    }, 100);
  };

  const toggleCategoryPicker = (e: MouseEvent | KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (categoryPickerOpen) {
      categoryPickerOpen = false;
    } else {
      showCategoryPicker();
    }
  };

  const hideCategoryPicker = () => {
    if (categoryPickerTimeout) clearTimeout(categoryPickerTimeout);
    categoryPickerTimeout = setTimeout(() => {
      categoryPickerOpen = false;
    }, 150);
  };

  const handleSetCategory = async (type: string) => {
    const nodesToUpdate = $state.snapshot(selectedNodes);
    clearPickerTimeout();
    categoryPickerOpen = false;
    contextMenuOpen = false;

    try {
      if (nodesToUpdate.length === 1) {
        await vault.updateEntity(nodesToUpdate[0], { type });
        ui.notify("Category updated.", "success");
      } else if (nodesToUpdate.length > 1) {
        const updates: Record<string, { type: string }> = {};
        for (const id of nodesToUpdate) {
          updates[id] = { type };
        }
        await vault.batchUpdate(updates);
        ui.notify(`Updated ${nodesToUpdate.length} nodes.`, "success");
      }
    } catch (err: any) {
      console.error("Failed to update category", err);
      ui.notify(`Failed to update category: ${err.message}`, "error");
    }
  };

  const handleGenerateImage = async () => {
    const nodesToUpdate = $state.snapshot(selectedNodes);
    if (nodesToUpdate.length !== 1) return;

    contextMenuOpen = false;
    canvasPickerOpen = false;
    categoryPickerOpen = false;

    try {
      await oracle.drawEntity(nodesToUpdate[0]);
    } catch (err: any) {
      console.error("Failed to generate image", err);
      ui.notify(`Failed to generate image: ${err.message}`, "error");
    }
  };

  const handleAddToCanvas = async (canvasId: string) => {
    clearPickerTimeout();
    canvasPickerOpen = false;
    contextMenuOpen = false;
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
    clearPickerTimeout();
    canvasPickerOpen = false;
    contextMenuOpen = false;
    try {
      const title = window.prompt("Enter canvas name (optional):");
      if (title === null) return; // Cancelled

      const result = await canvasRegistry.createCanvas(selectedNodes, title);

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

    if (
      await ui.confirm({
        title: "Confirm Action",
        message,
        confirmLabel: "Delete",
        isDangerous: true,
      })
    ) {
      contextMenuOpen = false;
      canvasPickerOpen = false;
      categoryPickerOpen = false;
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
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    bind:this={menuEl}
    role="menu"
    aria-label="Node actions"
    tabindex="-1"
    class="absolute z-50 bg-theme-surface border border-theme-border shadow-2xl rounded overflow-hidden w-max flex flex-col"
    style:top="{position.y}px"
    style:left="{position.x}px"
    onkeydown={handleMenuKeydown}
  >
    <button
      role="menuitem"
      class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition whitespace-nowrap"
      onclick={setCentralNode}
      aria-label="Set as Central Node"
    >
      Set as Central Node
    </button>
    {#if selectedNodes.length === 2}
      <button
        role="menuitem"
        class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition border-t border-theme-border whitespace-nowrap"
        onclick={handleConnectSelection}
        aria-label="Connect 2 Nodes"
      >
        Connect 2 Nodes
      </button>
    {/if}
    {#if selectedNodes.length > 1}
      <button
        role="menuitem"
        class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition border-t border-theme-border whitespace-nowrap"
        onclick={handleMerge}
        aria-label="Merge {selectedNodes.length} Nodes"
      >
        Merge {selectedNodes.length} Nodes
      </button>
    {/if}
    <button
      role="menuitem"
      class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition border-t border-theme-border whitespace-nowrap"
      onclick={handleBulkLabel}
      aria-label="Apply / Remove Label"
    >
      {selectedNodes.length > 1
        ? `Label ${selectedNodes.length} Nodes…`
        : "Label…"}
    </button>

    {#if !ui.aiDisabled && selectedNodes.length === 1}
      <button
        role="menuitem"
        class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition border-t border-theme-border flex items-center justify-between gap-4 whitespace-nowrap"
        onclick={handleGenerateImage}
        aria-label={imageActionLabel}
      >
        {imageActionLabel}
        <span class="icon-[lucide--image-plus] h-3.5 w-3.5 opacity-50"></span>
      </button>
    {/if}

    <button
      bind:this={categoryPickerAnchor}
      role="menuitem"
      class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition border-t border-theme-border flex items-center justify-between gap-4 whitespace-nowrap"
      onmouseenter={showCategoryPicker}
      onmouseleave={hideCategoryPicker}
      onclick={toggleCategoryPicker}
      aria-label="Change Category"
      aria-expanded={categoryPickerOpen}
      aria-haspopup="true"
    >
      Change Category
      <span class="icon-[lucide--chevron-right] h-3.5 w-3.5 opacity-50"></span>
    </button>

    <button
      bind:this={pickerAnchor}
      role="menuitem"
      data-testid="add-to-canvas-button"
      class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition border-t border-theme-border flex items-center justify-between gap-4 whitespace-nowrap"
      onmouseenter={showCanvasPicker}
      onmouseleave={hideCanvasPicker}
      onclick={() => (canvasPickerOpen = !canvasPickerOpen)}
      aria-label="Add to Canvas"
      aria-expanded={canvasPickerOpen}
      aria-haspopup="true"
    >
      Add to Canvas
      <span class="icon-[lucide--chevron-right] h-3.5 w-3.5 opacity-50"></span>
    </button>

    {#if !vault.isGuest}
      <button
        role="menuitem"
        class="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition border-t border-theme-border whitespace-nowrap"
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

  {#if categoryPickerOpen}
    <div
      role="menu"
      aria-label="Select category"
      tabindex="-1"
      class="fixed z-[100] bg-theme-surface border border-theme-border shadow-2xl rounded overflow-hidden w-max flex flex-col p-1"
      style:top="{categoryPickerPosition.y}px"
      style:left="{categoryPickerPosition.x}px"
      onmouseenter={showCategoryPicker}
      onmouseleave={hideCategoryPicker}
      onkeydown={handleMenuKeydown}
    >
      {#each categories.list as cat (cat.id)}
        <button
          role="menuitem"
          class="w-full text-left px-3 py-1.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition flex items-center gap-2 rounded-sm"
          onclick={() => handleSetCategory(cat.id)}
        >
          <div
            class="w-2 h-2 rounded-full"
            style:background-color={cat.color}
          ></div>
          {cat.label}
        </button>
      {/each}
    </div>
  {/if}

  {#if canvasPickerOpen}
    <div
      role="none"
      class="fixed z-[100] bg-theme-surface border border-theme-border shadow-2xl rounded overflow-hidden w-max"
      style:top="{pickerPosition.y}px"
      style:left="{pickerPosition.x}px"
      onmouseenter={showCanvasPicker}
      onmouseleave={hideCanvasPicker}
    >
      <CanvasPicker
        onSelect={handleAddToCanvas}
        onCreateNew={handleCreateCanvas}
        onChooseFull={handleChooseFull}
      />
    </div>
  {/if}
{/if}
