<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
  import EntityList from "../explorer/EntityList.svelte";
  import type { Entity } from "schema";
  import {
    Layout,
    ChevronRight,
    LayoutGrid,
    RefreshCw,
    Plus,
  } from "lucide-svelte";
  import { page } from "$app/state";

  let isRefreshing = $state(false);

  const canvasSlug = $derived(page.params.slug);
  const activeCanvasName = $derived(
    canvasRegistry.allCanvases.find((c) => c.slug === canvasSlug)?.name ||
      "Workspace",
  );

  async function handleRefresh() {
    if (isRefreshing) return;
    isRefreshing = true;
    try {
      await vault.loadFiles(false); // Force a full sync from disk
    } finally {
      isRefreshing = false;
    }
  }

  function onDragStart(event: DragEvent, entityId: string) {
    if (event.dataTransfer) {
      event.dataTransfer.setData("application/codex-entity", entityId);
      event.dataTransfer.effectAllowed = "move";
    }
  }

  function handleSelect(entity: Entity) {
    window.dispatchEvent(
      new CustomEvent("add-to-canvas", {
        detail: { entityId: entity.id },
      }),
    );
  }
</script>

<div
  class="relative h-full bg-theme-surface border-r border-theme-border flex flex-col z-10 shrink-0 font-body transition-all duration-300 ease-in-out {!uiStore.showCanvasPalette
    ? 'w-12'
    : 'w-72'}"
>
  <!-- Collapse Toggle -->
  <button
    onclick={() => (uiStore.showCanvasPalette = !uiStore.showCanvasPalette)}
    class="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-theme-surface border border-theme-border rounded-full flex items-center justify-center text-theme-muted hover:text-theme-primary transition-colors z-20 shadow-md group"
    title={uiStore.showCanvasPalette ? "Collapse Palette" : "Expand Palette"}
  >
    <ChevronRight
      class="w-4 h-4 transition-transform duration-300 {uiStore.showCanvasPalette
        ? 'rotate-180'
        : ''}"
    />
  </button>

  {#if !uiStore.showCanvasPalette}
    <div class="flex-1 flex flex-col items-center py-4 gap-4 overflow-hidden">
      <div
        class="w-8 h-8 rounded-lg bg-theme-primary/10 flex items-center justify-center text-theme-primary mb-4"
      >
        <LayoutGrid class="w-4 h-4" />
      </div>
      <div class="h-px w-6 bg-theme-border/50"></div>
      <div
        class="[writing-mode:vertical-lr] text-[10px] font-bold text-theme-muted uppercase font-header tracking-[0.2em] py-4"
      >
        Entity Palette
      </div>
    </div>
  {:else}
    <!-- Workspace Selector Header -->
    <div class="border-b border-theme-border">
      <button
        onclick={() => (uiStore.showCanvasSelector = true)}
        class="w-full p-4 bg-theme-surface hover:bg-theme-bg/50 transition-all flex items-center gap-3 group text-left"
        aria-label="Switch workspace"
      >
        <div
          class="w-8 h-8 rounded-lg bg-theme-primary/10 flex items-center justify-center text-theme-primary group-hover:scale-110 transition-transform shrink-0"
        >
          <Layout class="w-4 h-4" />
        </div>
        <div class="flex-1 min-w-0">
          <div
            class="text-[9px] font-mono text-theme-muted uppercase tracking-[0.2em] leading-none mb-1"
          >
            Active View
          </div>
          <div
            class="text-xs font-bold text-theme-text truncate uppercase font-header tracking-tight"
          >
            {activeCanvasName}
          </div>
        </div>
        <ChevronRight
          class="w-4 h-4 text-theme-muted group-hover:text-theme-primary transition-colors shrink-0"
        />
      </button>
    </div>

    <div class="p-4 border-b border-theme-border">
      <div class="flex items-center justify-between mb-4">
        <h2
          class="text-xs font-bold text-theme-primary uppercase font-header tracking-[0.2em]"
        >
          Entity Palette
        </h2>
        <div class="flex items-center gap-1">
          <button
            onclick={() => (uiStore.showCanvasSelector = true)}
            class="p-1.5 rounded-md text-theme-muted hover:text-theme-primary hover:bg-theme-primary/10 transition-all active:scale-90"
            title="New Workspace"
          >
            <Plus class="w-4 h-4" />
          </button>
          <button
            onclick={handleRefresh}
            class="p-1.5 rounded-md text-theme-muted hover:text-theme-primary hover:bg-theme-primary/10 transition-all active:scale-90 {isRefreshing
              ? 'animate-spin text-theme-primary'
              : ''}"
            title="Refresh from Disk"
          >
            <RefreshCw class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <EntityList
      onSelect={handleSelect}
      {onDragStart}
      onOpenZen={(entity) => uiStore.openZenMode(entity.id)}
    />
  {/if}
</div>
