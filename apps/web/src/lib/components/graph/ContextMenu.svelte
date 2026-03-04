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
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = (idx + 1) % items.length;
      items[nextIdx]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      // If nothing is focused (idx === -1), go to last item.
      // Otherwise, cycle backwards.
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
</script>

{#if contextMenuOpen}
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
  </div>
{/if}
