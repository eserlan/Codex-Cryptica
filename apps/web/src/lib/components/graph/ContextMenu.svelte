<script lang="ts">
  import { graph } from "$lib/stores/graph.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { revisionService } from "$lib/services/RevisionService.svelte";
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import CanvasPicker from "$lib/components/canvas/CanvasPicker.svelte";
  import type { Core } from "cytoscape";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { connectionModeStore } from "$lib/stores/ui/connection-mode.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
  import { GraphContextMenuController } from "./graph-context-menu-controller.svelte";

  let { cy } = $props<{ cy: Core }>();

  const controller = new GraphContextMenuController(() => cy, {
    graph,
    vault,
    oracle,
    revisionService,
    canvasRegistry,
    modalUIStore,
    connectionModeStore,
    notificationStore,
  });

  $effect(() => {
    return controller.setupEvents();
  });

  let menuEl = $state<HTMLDivElement>();

  // Focus first menu item when menu opens
  $effect(() => {
    if (controller.contextMenuOpen && menuEl) {
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
      controller.clearPickerTimeout();
      controller.contextMenuOpen = false;
      controller.canvasPickerOpen = false;
      controller.categoryPickerOpen = false;
      controller.imagePickerOpen = false;
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
</script>

{#if controller.contextMenuOpen}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    bind:this={menuEl}
    role="menu"
    aria-label="Node actions"
    tabindex="-1"
    class="absolute z-50 bg-theme-surface border border-theme-border shadow-2xl rounded overflow-hidden w-max flex flex-col"
    style:top="{controller.position.y}px"
    style:left="{controller.position.x}px"
    onkeydown={handleMenuKeydown}
  >
    <button
      role="menuitem"
      class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition whitespace-nowrap"
      onclick={controller.setCentralNode}
      aria-label="Set as Central Node"
    >
      Set as Central Node
    </button>
    {#if !vault.isGuest}
      {#if controller.selectedNodes.length === 2}
        <button
          role="menuitem"
          class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition border-t border-theme-border whitespace-nowrap"
          onclick={controller.handleConnectSelection}
          aria-label="Connect 2 Nodes"
        >
          Connect 2 Nodes
        </button>
      {/if}
      {#if controller.selectedNodes.length > 1}
        <button
          role="menuitem"
          class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition border-t border-theme-border whitespace-nowrap"
          onclick={controller.handleMerge}
          aria-label="Merge {controller.selectedNodes.length} Nodes"
        >
          Merge {controller.selectedNodes.length} Nodes
        </button>
      {/if}
      <button
        role="menuitem"
        class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition border-t border-theme-border whitespace-nowrap"
        onclick={controller.handleBulkLabel}
        aria-label="Apply / Remove Label"
      >
        {controller.selectedNodes.length > 1
          ? `Label ${controller.selectedNodes.length} Nodes…`
          : "Label…"}
      </button>

      <button
        type="button"
        role="menuitem"
        class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition border-t border-theme-border whitespace-nowrap flex items-center gap-2"
        onclick={controller.handleMarkImportant}
        aria-label={controller.importantActionLabel}
      >
        <span
          aria-hidden="true"
          class="icon-[lucide--star] h-3.5 w-3.5 opacity-70"
        ></span>
        <span>{controller.importantActionLabel}</span>
      </button>

      {#if controller.selectedNodes.length === 1}
        <button
          type="button"
          bind:this={controller.imagePickerAnchor}
          role="menuitem"
          class="group w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition border-t border-theme-border flex items-center justify-between gap-4 whitespace-nowrap"
          onmouseenter={controller.showImagePicker}
          onmouseleave={controller.hideImagePicker}
          onclick={controller.handleImageMainClick}
          aria-label="Image actions"
          aria-expanded={controller.imagePickerOpen}
          aria-haspopup="true"
        >
          <span>Image</span>
          <div class="flex items-center gap-2">
            {#if controller.hasImage}
              <span
                class="text-[10px] text-theme-muted opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none italic"
              >
                click to view
              </span>
            {/if}
            <span
              aria-hidden="true"
              class="icon-[lucide--chevron-right] h-3.5 w-3.5 opacity-50"
            ></span>
          </div>
        </button>
      {/if}

      <button
        type="button"
        bind:this={controller.categoryPickerAnchor}
        role="menuitem"
        class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition border-t border-theme-border flex items-center justify-between gap-4 whitespace-nowrap"
        onmouseenter={controller.showCategoryPicker}
        onmouseleave={controller.hideCategoryPicker}
        onclick={controller.toggleCategoryPicker}
        aria-label="Change Category"
        aria-expanded={controller.categoryPickerOpen}
        aria-haspopup="true"
      >
        Change Category
        <span
          aria-hidden="true"
          class="icon-[lucide--chevron-right] h-3.5 w-3.5 opacity-50"
        ></span>
      </button>

      <button
        bind:this={controller.pickerAnchor}
        role="menuitem"
        data-testid="add-to-canvas-button"
        class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition border-t border-theme-border flex items-center justify-between gap-4 whitespace-nowrap"
        onmouseenter={controller.showCanvasPicker}
        onmouseleave={controller.hideCanvasPicker}
        onclick={() =>
          (controller.canvasPickerOpen = !controller.canvasPickerOpen)}
        aria-label="Add to Canvas"
        aria-expanded={controller.canvasPickerOpen}
        aria-haspopup="true"
      >
        Add to Canvas
        <span class="icon-[lucide--chevron-right] h-3.5 w-3.5 opacity-50"
        ></span>
      </button>
    {:else if controller.hasImage}
      <!-- Guest view only image action -->
      <button
        role="menuitem"
        class="w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition border-t border-theme-border whitespace-nowrap"
        onclick={controller.handleViewImage}
        aria-label="View Image"
      >
        View Image
      </button>
    {/if}

    {#if !vault.isGuest}
      <button
        role="menuitem"
        class="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition border-t border-theme-border whitespace-nowrap"
        onclick={controller.deleteNodes}
        aria-label="Delete {controller.selectedNodes.length > 1
          ? `${controller.selectedNodes.length} Nodes`
          : 'Node'}"
      >
        Delete {controller.selectedNodes.length > 1
          ? `${controller.selectedNodes.length} Nodes`
          : "Node"}
      </button>
    {/if}
  </div>

  {#if controller.categoryPickerOpen}
    <div
      role="menu"
      aria-label="Select category"
      tabindex="-1"
      class="fixed z-[100] bg-theme-surface border border-theme-border shadow-2xl rounded overflow-hidden w-max flex flex-col p-1"
      style:top="{controller.categoryPickerPosition.y}px"
      style:left="{controller.categoryPickerPosition.x}px"
      onmouseenter={controller.showCategoryPicker}
      onmouseleave={controller.hideCategoryPicker}
      onkeydown={handleMenuKeydown}
    >
      {#each categories.list as cat (cat.id)}
        <button
          role="menuitem"
          class="w-full text-left px-3 py-1.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition flex items-center gap-2 rounded-sm"
          onclick={() => controller.handleSetCategory(cat.id)}
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

  {#if controller.imagePickerOpen}
    <div
      role="menu"
      aria-label="Image actions"
      tabindex="-1"
      class="fixed z-[100] bg-theme-surface border border-theme-border shadow-2xl rounded overflow-hidden w-max flex flex-col p-1"
      style:top="{controller.imagePickerPosition.y}px"
      style:left="{controller.imagePickerPosition.x}px"
      onmouseenter={controller.showImagePicker}
      onmouseleave={controller.hideImagePicker}
      onkeydown={handleMenuKeydown}
    >
      {#if !discoveryPolicyStore.aiDisabled && !vault.isGuest}
        <button
          role="menuitem"
          class="w-full text-left px-3 py-1.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition flex items-center gap-2 rounded-sm"
          onclick={controller.handleGenerateImage}
        >
          <span class="icon-[lucide--image-plus] h-3.5 w-3.5 opacity-70"></span>
          {controller.imageActionLabel}
        </button>
        <button
          role="menuitem"
          class="w-full text-left px-3 py-1.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition flex items-center gap-2 rounded-sm"
          onclick={controller.handleReviseContent}
        >
          <span class="icon-[lucide--sparkles] h-3.5 w-3.5 opacity-70"></span>
          Revise Content
        </button>
      {/if}
    </div>
  {/if}

  {#if controller.canvasPickerOpen}
    <div
      role="none"
      class="fixed z-[100] bg-theme-surface border border-theme-border shadow-2xl rounded overflow-hidden w-max"
      style:top="{controller.pickerPosition.y}px"
      style:left="{controller.pickerPosition.x}px"
      onmouseenter={controller.showCanvasPicker}
      onmouseleave={controller.hideCanvasPicker}
    >
      <CanvasPicker
        onSelect={controller.handleAddToCanvas}
        onCreateNew={controller.handleCreateCanvas}
        onChooseFull={controller.handleChooseFull}
      />
    </div>
  {/if}
{/if}
