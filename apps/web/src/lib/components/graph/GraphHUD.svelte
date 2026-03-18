<script lang="ts">
  import { fade } from "svelte/transition";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { graph } from "$lib/stores/graph.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import type { Entity } from "schema";
  import LabelFilter from "$lib/components/labels/LabelFilter.svelte";
  import CategoryFilter from "$lib/components/labels/CategoryFilter.svelte";
  import type { Core } from "cytoscape";

  let { selectedEntity, parentEntity, selectedId, isLayoutRunning, cy } =
    $props<{
      selectedEntity: Entity | null;
      parentEntity: Entity | null;
      selectedId: string | null;
      isLayoutRunning: boolean;
      cy: Core | undefined;
    }>();

  const hasActiveFilters = $derived(
    graph.activeCategories.size > 0 || graph.activeLabels.size > 0,
  );

  function addFilteredToCanvas() {
    if (!cy) return;
    const visibleNodes = cy.nodes(
      ":not(.category-filtered-out):not(.label-filtered-out)",
    );
    visibleNodes.forEach((node, index) => {
      const entityId = node.id();
      window.dispatchEvent(
        new CustomEvent("add-to-canvas", {
          detail: {
            entityId,
            position: {
              x: window.innerWidth / 2 + index * 20,
              y: window.innerHeight / 2 + index * 20,
            },
          },
        }),
      );
    });
    ui.notify(
      `Added ${visibleNodes.length} entities to active workspace`,
      "success",
    );
  }
</script>

<div
  class="absolute top-6 left-6 z-20 flex flex-col items-start gap-3 pointer-events-none"
>
  <div
    class="bg-theme-surface/80 backdrop-blur border border-theme-border px-4 py-1.5 flex items-center gap-2 text-[10px] font-mono tracking-widest text-theme-primary shadow-lg uppercase pointer-events-auto"
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

  {#if selectedId}
    <div
      class="flex items-center gap-2 text-[9px] font-bold text-theme-primary animate-pulse bg-theme-surface/40 px-2 py-0.5 border border-theme-primary/20"
    >
      <div class="w-1.5 h-1.5 bg-theme-primary rounded-full"></div>
      ARCHIVE DETAIL MODE
    </div>
  {/if}

  <div class="pointer-events-auto flex items-center gap-2">
    <CategoryFilter
      activeCategories={graph.activeCategories}
      onToggle={(id) => graph.toggleCategoryFilter(id)}
      onClear={() => graph.clearCategoryFilters()}
    />

    {#if hasActiveFilters}
      <button
        onclick={addFilteredToCanvas}
        class="bg-theme-surface/80 backdrop-blur border border-theme-primary/30 p-1.5 rounded text-theme-primary shadow-lg hover:border-theme-primary transition-all active:scale-90"
        title="Add all results to workspace"
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

  {#if graph.timelineMode}
    <div
      class="bg-timeline-dark/40 backdrop-blur border border-timeline-primary/30 px-3 py-1 flex items-center gap-2 text-[9px] font-mono tracking-[0.2em] text-timeline-primary shadow-lg uppercase pointer-events-auto"
      transition:fade
    >
      <span class="icon-[lucide--history] w-3 h-3 animate-pulse"></span>
      Chronological Synchrony Active ({graph.timelineAxis === "x"
        ? "Horizontal"
        : "Vertical"})
    </div>
  {/if}

  {#if ui.sharedMode}
    <div
      class="bg-amber-900/40 backdrop-blur border border-amber-500/30 px-3 py-1 flex items-center gap-2 text-[9px] font-mono tracking-[0.2em] text-amber-300 shadow-lg uppercase pointer-events-auto"
      transition:fade
    >
      <span class="icon-[lucide--eye] w-3 h-3 animate-pulse"></span>
      Shared Mode Active (Player Preview)
    </div>
  {/if}

  {#if isLayoutRunning}
    <div
      class="bg-blue-900/40 backdrop-blur border border-blue-500/30 px-3 py-1 flex items-center gap-2 text-[9px] font-mono tracking-[0.2em] text-blue-300 shadow-lg uppercase pointer-events-auto"
      transition:fade
    >
      <span class="icon-[lucide--cpu] w-3 h-3 animate-spin"></span>
      Neural Layout Synthesis Processing...
    </div>
  {/if}

  {#if ui.isConnecting}
    <div
      class="bg-blue-500/20 border border-blue-500/50 backdrop-blur-md px-4 py-2 rounded flex items-center gap-3 text-[10px] font-bold tracking-[0.2em] text-blue-300 shadow-lg uppercase pointer-events-auto"
      transition:fade
    >
      <span class="icon-[lucide--link] w-3.5 h-3.5 animate-pulse"></span>
      {#if !ui.connectingNodeId}
        Select Source Entity
      {:else}
        Select Target to Connect
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
