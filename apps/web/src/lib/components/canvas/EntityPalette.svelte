<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import type { Entity } from "schema";
  import {
    Search,
    Filter,
    Layout,
    ChevronRight,
    LayoutGrid,
  } from "lucide-svelte";
  import { page } from "$app/state";

  let searchQuery = $state("");
  let typeFilters = $state<string[]>(["all"]);

  const canvasSlug = $derived(page.params.slug);
  const activeCanvasName = $derived(
    canvasRegistry.allCanvases.find((c) => c.slug === canvasSlug)?.name ||
      "Workspace",
  );

  const types = $derived.by(() => {
    // ⚡ Bolt Optimization: Use imperative loop to prevent intermediate array allocation from map()
    // Cache vault.allEntities to prevent multiple Object.values() allocations
    const allEntities = vault.allEntities;
    const typesSet = new Set<string>(["all"]);
    for (let i = 0; i < allEntities.length; i++) {
      typesSet.add(allEntities[i].type);
    }
    return Array.from(typesSet);
  });

  const filteredEntities = $derived.by(() => {
    // ⚡ Bolt Optimization: Use imperative loop instead of chained filter().sort()
    // Cache vault.allEntities to prevent multiple Object.values() allocations
    const allEntities = vault.allEntities;
    const filtered: Entity[] = [];
    const query = searchQuery.trim().toLowerCase();
    const filterAll = typeFilters.includes("all");

    // Fast path: Just type filtering and sorting if no search query
    if (!query) {
      for (let i = 0; i < allEntities.length; i++) {
        const e = allEntities[i];
        if (filterAll || typeFilters.includes(e.type)) {
          filtered.push(e);
        }
      }
      return filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    // Full search path
    for (let i = 0; i < allEntities.length; i++) {
      const e = allEntities[i];
      const matchesSearch =
        e.title.toLowerCase().includes(query) ||
        e.content.toLowerCase().includes(query);
      const matchesType = filterAll || typeFilters.includes(e.type);

      if (matchesSearch && matchesType) {
        filtered.push(e);
      }
    }

    return filtered.sort((a, b) => a.title.localeCompare(b.title));
  });

  function onDragStart(event: DragEvent, entityId: string) {
    if (event.dataTransfer) {
      event.dataTransfer.setData("application/codex-entity", entityId);
      event.dataTransfer.effectAllowed = "move";
    }
  }

  function toggleTypeFilter(type: string, event: MouseEvent) {
    const isMulti = event.ctrlKey || event.metaKey;

    if (type === "all") {
      typeFilters = ["all"];
      return;
    }

    if (isMulti) {
      // Remove 'all' if we're adding a specific filter
      let newFilters = typeFilters.filter((f) => f !== "all");

      if (newFilters.includes(type)) {
        newFilters = newFilters.filter((f) => f !== type);
      } else {
        newFilters.push(type);
      }

      // If empty, revert to all
      typeFilters = newFilters.length === 0 ? ["all"] : newFilters;
    } else {
      // Normal click: toggle single filter
      if (typeFilters.length === 1 && typeFilters[0] === type) {
        typeFilters = ["all"];
      } else {
        typeFilters = [type];
      }
    }
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
      <h2
        class="text-xs font-bold text-theme-primary uppercase font-header tracking-[0.2em] mb-4"
      >
        Entity Palette
      </h2>

      <div class="relative mb-3">
        <Search
          class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-theme-muted"
        />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search entities..."
          aria-label="Search entities"
          class="w-full bg-theme-bg border border-theme-border rounded-md pl-9 pr-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary transition-colors"
        />
      </div>

      <div class="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
        <Filter class="w-3 h-3 text-theme-muted shrink-0 mr-1" />
        {#each types as type}
          <button
            onclick={(e) => toggleTypeFilter(type, e)}
            aria-label={`Filter by ${type}`}
            title={type.toUpperCase()}
            class="p-1.5 rounded-md flex items-center justify-center transition-all {typeFilters.includes(
              type,
            )
              ? 'bg-theme-primary text-theme-bg shadow-sm scale-110'
              : 'text-theme-muted hover:text-theme-text hover:bg-theme-primary/10'}"
          >
            {#if type === "all"}
              <LayoutGrid class="w-4 h-4" />
            {:else}
              {@const cat = categories.getCategory(type)}
              <span class="{getIconClass(cat?.icon)} w-4 h-4"></span>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
      {#each filteredEntities as entity}
        <div
          draggable="true"
          ondragstart={(e) => onDragStart(e, entity.id)}
          role="button"
          tabindex="0"
          aria-label={`Drag ${entity.title} to canvas`}
          onkeydown={(e) =>
            e.key === "Enter" &&
            window.dispatchEvent(
              new CustomEvent("add-to-canvas", {
                detail: { entityId: entity.id },
              }),
            )}
          class="p-3 bg-theme-bg border border-theme-border rounded-lg cursor-grab active:cursor-grabbing hover:border-theme-primary transition-all group focus:ring-2 focus:ring-theme-primary focus:outline-none"
        >
          <div class="flex items-center justify-between mb-1">
            <span
              class="text-[9px] font-mono text-theme-muted uppercase tracking-tighter"
            >
              {entity.type}
            </span>
          </div>
          <div
            class="text-xs font-bold text-theme-text group-hover:text-theme-primary transition-colors truncate"
          >
            {entity.title}
          </div>
        </div>
      {:else}
        <div class="text-center py-10 px-4">
          <p class="text-xs text-theme-muted">No entities found</p>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
