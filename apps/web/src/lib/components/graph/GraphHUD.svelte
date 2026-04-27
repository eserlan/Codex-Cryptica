<script lang="ts">
  import { fade } from "svelte/transition";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { graph } from "$lib/stores/graph.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
  import type { Entity } from "schema";
  import LabelFilter from "$lib/components/labels/LabelFilter.svelte";
  import CategoryFilter from "$lib/components/labels/CategoryFilter.svelte";
  import type { Core, NodeSingular } from "cytoscape";

  let { selectedEntity, parentEntity, selectedId, isLayoutRunning, cy } =
    $props<{
      selectedEntity: Entity | null;
      parentEntity: Entity | null;
      selectedId: string | null;
      isLayoutRunning: boolean;
      cy: Core | undefined;
    }>();

  const hasActiveFilters = $derived(
    graph.activeCategories.size > 0 ||
      graph.activeLabels.size > 0 ||
      graph.timelineMode,
  );

  function addFilteredToCanvas() {
    if (!cy) return;
    // Use :visible to correctly catch all display:none filtering (labels, categories, timeline)
    const visibleNodes = cy.nodes(":visible");
    const entitiesToQueue = visibleNodes.map(
      (node: NodeSingular, index: number) => ({
        id: node.id(),
        // Send screenPosition so CanvasWorkspace can convert correctly
        screenPosition: {
          x: window.innerWidth / 2 + index * 20,
          y: window.innerHeight / 2 + index * 20,
        },
      }),
    );

    // ⚡ Optimization: Use canvasRegistry.queueEntities for batch spawning in CanvasWorkspace
    canvasRegistry.queueEntities(
      entitiesToQueue.map(
        (e: { id: string; screenPosition: { x: number; y: number } }) => ({
          id: e.id,
          position: e.screenPosition,
        }),
      ),
    );

    ui.notify(
      `${entitiesToQueue.length} entities queued. Open a canvas to place them.`,
      "info",
    );
  }

  let isFiltersExpanded = $state(false);
</script>

<div class="absolute inset-4 md:inset-6 z-20 pointer-events-none">
  <div class="flex flex-col items-start gap-2 md:gap-3">
    <!-- Breadcrumbs: Hidden on very small screens -->
    <div
      class="bg-theme-surface/80 backdrop-blur border border-theme-border px-4 py-1.5 hidden sm:flex items-center gap-2 text-xs font-mono tracking-widest text-theme-primary shadow-lg uppercase pointer-events-auto"
    >
      {#if selectedEntity}
        {#if parentEntity}
          <span class="text-theme-muted"
            >{parentEntity.title || parentEntity.id}</span
          >
          <span class="text-theme-muted">/</span>
        {/if}
        <span class="font-bold text-theme-primary"
          >{selectedEntity.title || selectedEntity.id}</span
        >
      {:else}
        <span class="text-theme-muted"
          >{themeStore.jargon.vault.toUpperCase()}</span
        >
        <span class="text-theme-muted">/</span>
        <span class="font-bold text-theme-primary">OVERVIEW</span>
      {/if}
    </div>

    <!-- Active Entity Title: Simplified for mobile -->
    {#if selectedEntity}
      <div
        class="bg-theme-surface/80 backdrop-blur border border-theme-border px-3 py-1 flex sm:hidden items-center gap-2 text-[11px] font-mono tracking-widest text-theme-primary shadow-lg uppercase pointer-events-auto"
      >
        <span class="font-bold"
          >{selectedEntity.title || selectedEntity.id}</span
        >
      </div>
    {/if}

    {#if selectedId}
      <div
        class="hidden sm:flex items-center gap-2 text-[10px] font-bold text-theme-primary animate-pulse bg-theme-surface/40 px-2 py-0.5 border border-theme-primary/20"
      >
        <div class="w-1.5 h-1.5 bg-theme-primary rounded-full"></div>
        ARCHIVE DETAIL MODE
      </div>
    {/if}

    <div class="pointer-events-auto flex flex-col items-start gap-2">
      <!-- Filter Toggle for Mobile -->
      <button
        type="button"
        onclick={() => (isFiltersExpanded = !isFiltersExpanded)}
        class="flex md:hidden items-center gap-2 px-3 py-1.5 bg-theme-surface/80 backdrop-blur border border-theme-border rounded text-xs font-mono tracking-widest text-theme-primary shadow-lg uppercase transition-all hover:border-theme-primary active:scale-95"
      >
        <span class="icon-[lucide--filter] w-3.5 h-3.5"></span>
        <span>Filters</span>
        {#if hasActiveFilters}
          <span class="w-1.5 h-1.5 rounded-full bg-theme-primary animate-pulse"
          ></span>
        {/if}
      </button>

      <!-- Desktop Filters / Expanded Mobile Filters -->
      <div
        class="flex flex-col items-start gap-2 {isFiltersExpanded
          ? 'flex'
          : 'hidden md:flex'}"
      >
        <div class="flex items-center gap-2">
          <CategoryFilter
            activeCategories={graph.activeCategories}
            onToggle={(id) => graph.toggleCategoryFilter(id)}
            onClear={() => graph.clearCategoryFilters()}
          />

          {#if hasActiveFilters}
            <button
              type="button"
              onclick={addFilteredToCanvas}
              class="bg-theme-surface/80 backdrop-blur border border-theme-primary/30 p-1.5 rounded text-theme-primary shadow-lg hover:border-theme-primary transition-all active:scale-90"
              title="Add all results to workspace"
              aria-label="Add all filtered results to active workspace"
            >
              <span class="icon-[lucide--layout-grid] w-4 h-4"></span>
            </button>
          {/if}
        </div>

        <div class="pointer-events-auto">
          <LabelFilter
            activeLabels={graph.activeLabels}
            filterMode={graph.labelFilterMode}
            onToggle={(l) => graph.toggleLabelFilter(l)}
            onToggleMode={() => graph.toggleLabelFilterMode()}
            onClear={() => graph.clearLabelFilters()}
          />
        </div>
      </div>
    </div>
  </div>

  {#if ui.sharedMode}
    <div
      class="absolute bottom-0 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 max-w-[calc(100vw-3rem)] mb-12 sm:mb-0"
    >
      <div
        class="bg-amber-900/40 backdrop-blur border border-amber-500/30 px-3 py-1 flex items-center gap-2 text-[11px] font-mono tracking-[0.2em] text-amber-300 shadow-lg uppercase pointer-events-auto"
        transition:fade
      >
        <span class="icon-[lucide--eye] w-3 h-3 animate-pulse"></span>
        Shared Mode Active (Player Preview)
      </div>
    </div>
  {/if}

  <div
    class="absolute bottom-0 left-0 flex flex-col items-start gap-2 md:gap-3"
  >
    {#if graph.timelineMode}
      <div
        class="bg-timeline-dark/40 backdrop-blur border border-timeline-primary/30 px-3 py-1 flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] text-timeline-primary shadow-lg uppercase pointer-events-auto mb-10 md:mb-0"
        transition:fade
      >
        <span class="icon-[lucide--history] w-3 h-3 animate-pulse"></span>
        <span class="hidden md:inline"
          >Chronological Synchrony Active ({graph.timelineAxis === "x"
            ? "Horizontal"
            : "Vertical"})</span
        >
        <span class="md:hidden">Timeline Active</span>
      </div>
    {/if}

    {#if isLayoutRunning}
      <div
        class="bg-blue-900/40 backdrop-blur border border-blue-500/30 px-3 py-1 flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] text-blue-300 shadow-lg uppercase pointer-events-auto mb-10 md:mb-0"
        transition:fade
      >
        <span class="icon-[lucide--cpu] w-3 h-3 animate-spin"></span>
        <span class="hidden md:inline"
          >Neural Layout Synthesis Processing...</span
        >
        <span class="md:hidden">Processing Layout...</span>
      </div>
    {/if}

    {#if ui.isConnecting}
      <div
        class="bg-blue-500/20 border border-blue-500/50 backdrop-blur-md px-4 py-2 rounded flex items-center gap-3 text-xs font-bold tracking-[0.2em] text-blue-300 shadow-lg uppercase pointer-events-auto mb-10 md:mb-0"
        transition:fade
      >
        <span class="icon-[lucide--link] w-3.5 h-3.5 animate-pulse"></span>
        {#if !ui.connectingNodeId}
          <span class="hidden md:inline">Select Source Entity</span>
          <span class="md:hidden">Select Source</span>
        {:else}
          <span class="hidden md:inline">Select Target to Connect</span>
          <span class="md:hidden">Select Target</span>
        {/if}
        <button
          onclick={() => ui.toggleConnectMode()}
          class="ml-2 hover:text-white transition-colors"
          title="Cancel (Esc)"
        >
          [ESC]
        </button>
      </div>
    {/if}
  </div>
</div>
