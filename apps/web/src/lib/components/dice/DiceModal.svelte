<script lang="ts">
  import { scale } from "svelte/transition";
  import PlayToolsVault, { type PlayToolsTab } from "./PlayToolsVault.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { openDiceWindow } from "$lib/stores/ui/navigation";
  import {
    clampBounds,
    getCenteredBounds,
    getViewportSize,
    loadSavedBounds,
    saveBounds,
    type WindowBounds,
    MIN_WINDOW_WIDTH,
    MIN_WINDOW_HEIGHT,
  } from "./dice-window-bounds";

  let activeTab = $state<PlayToolsTab>("dice");

  let bounds = $state<WindowBounds>({
    x: 100,
    y: 100,
    width: 500,
    height: 620,
  });

  let isDragging = $state(false);
  let isResizing = $state(false);

  let dragStart = { x: 0, y: 0, windowX: 0, windowY: 0 };
  let resizeStart = { x: 0, y: 0, width: 0, height: 0 };

  $effect(() => {
    if (modalUIStore.showDiceModal) {
      bounds = loadSavedBounds();
    }
  });

  const headerInfo = $derived.by(() => {
    switch (activeTab) {
      case "decks":
        return { title: "Decks & Cards", icon: "icon-[lucide--layers]" };
      case "tables":
        return {
          title: "Random Tables",
          icon: "icon-[lucide--table-properties]",
        };
      case "dice":
      default:
        return { title: "Play Tools", icon: "icon-[lucide--dices]" };
    }
  });

  function handleWindowResize() {
    if (modalUIStore.showDiceModal) {
      bounds = clampBounds(bounds, getViewportSize());
      saveBounds(bounds);
    }
  }

  function handleHeaderPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, a, input, select, textarea")) return;

    isDragging = true;
    dragStart = {
      x: e.clientX,
      y: e.clientY,
      windowX: bounds.x,
      windowY: bounds.y,
    };

    const headerEl = e.currentTarget as HTMLElement;
    headerEl.setPointerCapture(e.pointerId);
  }

  function handleHeaderPointerMove(e: PointerEvent) {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    const newBounds = clampBounds(
      {
        ...bounds,
        x: dragStart.windowX + deltaX,
        y: dragStart.windowY + deltaY,
      },
      getViewportSize(),
    );

    bounds.x = newBounds.x;
    bounds.y = newBounds.y;
  }

  function handleHeaderPointerUp(e: PointerEvent) {
    if (isDragging) {
      isDragging = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore if capture was already released
      }
      saveBounds(bounds);
    }
  }

  function handleResizePointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    isResizing = true;
    resizeStart = {
      x: e.clientX,
      y: e.clientY,
      width: bounds.width,
      height: bounds.height,
    };

    const handleEl = e.currentTarget as HTMLElement;
    handleEl.setPointerCapture(e.pointerId);
  }

  function handleResizePointerMove(e: PointerEvent) {
    if (!isResizing) return;
    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;

    const viewport = getViewportSize();
    const maxAvailableWidth = viewport.width - bounds.x - 8;
    const maxAvailableHeight = viewport.height - bounds.y - 8;

    const newWidth = Math.min(
      maxAvailableWidth,
      Math.max(MIN_WINDOW_WIDTH, resizeStart.width + deltaX),
    );
    const newHeight = Math.min(
      maxAvailableHeight,
      Math.max(MIN_WINDOW_HEIGHT, resizeStart.height + deltaY),
    );

    bounds.width = newWidth;
    bounds.height = newHeight;
  }

  function handleResizePointerUp(e: PointerEvent) {
    if (isResizing) {
      isResizing = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore if capture was already released
      }
      saveBounds(bounds);
    }
  }

  function resetPosition() {
    bounds = getCenteredBounds({ width: bounds.width, height: bounds.height });
    saveBounds(bounds);
  }

  function handleGlobalKeydown(e: KeyboardEvent) {
    if (modalUIStore.showDiceModal && e.key === "Escape") {
      modalUIStore.showDiceModal = false;
    }
  }
</script>

<svelte:window onresize={handleWindowResize} onkeydown={handleGlobalKeydown} />

{#if modalUIStore.showDiceModal}
  <!-- Floating Draggable & Resizable Window -->
  <div
    class="fixed z-[100] bg-theme-surface border border-theme-border rounded-xl shadow-2xl overflow-hidden flex flex-col {isDragging ||
    isResizing
      ? 'select-none pointer-events-auto'
      : ''}"
    style="left: {bounds.x}px; top: {bounds.y}px; width: {bounds.width}px; height: {bounds.height}px;"
    transition:scale={{ duration: 150, start: 0.96 }}
    data-testid="dice-modal"
    role="dialog"
    aria-label="Play Tools"
    tabindex="-1"
  >
    <!-- Header / Drag Handle -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="p-3.5 border-b border-theme-border flex justify-between items-center bg-theme-bg/60 cursor-grab active:cursor-grabbing select-none shrink-0 touch-none"
      onpointerdown={handleHeaderPointerDown}
      onpointermove={handleHeaderPointerMove}
      onpointerup={handleHeaderPointerUp}
      onpointercancel={handleHeaderPointerUp}
      data-testid="dice-modal-header"
      title="Drag to move"
    >
      <div class="flex items-center gap-2 pointer-events-none">
        <span class="{headerInfo.icon} w-5 h-5 text-theme-primary"></span>
        <h2
          class="text-sm font-bold font-header tracking-widest text-theme-text uppercase"
        >
          {headerInfo.title}
        </h2>
      </div>

      <div class="flex items-center gap-1">
        <!-- Re-center button -->
        <button
          type="button"
          class="p-1.5 hover:bg-theme-primary/10 rounded-md transition-colors text-theme-muted hover:text-theme-primary"
          onclick={resetPosition}
          title="Center window"
          aria-label="Center window"
        >
          <span aria-hidden="true" class="icon-[lucide--scan] w-4 h-4"></span>
        </button>

        <!-- Popout button -->
        <button
          type="button"
          class="p-1.5 hover:bg-theme-primary/10 rounded-md transition-colors text-theme-muted hover:text-theme-primary"
          onclick={() => openDiceWindow(activeTab)}
          title="Pop out into new window"
          aria-label="Pop out into new window"
        >
          <span aria-hidden="true" class="icon-[lucide--external-link] w-4 h-4"
          ></span>
        </button>

        <!-- Close button -->
        <button
          type="button"
          class="p-1.5 hover:bg-theme-primary/10 rounded-md transition-colors text-theme-muted hover:text-theme-primary"
          onclick={() => {
            modalUIStore.showDiceModal = false;
          }}
          title="Close"
          aria-label="Close"
        >
          <span aria-hidden="true" class="icon-[lucide--x] w-5 h-5"></span>
        </button>
      </div>
    </div>

    <!-- Main Play Tools Content -->
    <div class="flex-1 min-h-0 overflow-hidden relative">
      <PlayToolsVault bind:activeTab />
    </div>

    <!-- Corner Resize Grip -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 text-theme-muted/40 hover:text-theme-primary touch-none transition-colors z-10"
      onpointerdown={handleResizePointerDown}
      onpointermove={handleResizePointerMove}
      onpointerup={handleResizePointerUp}
      onpointercancel={handleResizePointerUp}
      title="Resize window"
      data-testid="dice-modal-resize-handle"
    >
      <span class="icon-[lucide--grip-vertical] w-3 h-3 rotate-45"></span>
    </div>
  </div>
{/if}
