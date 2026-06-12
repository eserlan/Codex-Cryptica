<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import EntityList from "./EntityList.svelte";

  import {
    dispatchSearchEntityFocus,
    DEFAULT_SEARCH_ENTITY_ZOOM,
  } from "$lib/components/search/search-focus";

  import type { Entity } from "schema";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

  function handleSelect(entity: Entity) {
    modalUIStore.openZenMode(entity.id);
    if (layoutUIStore.isMobile) layoutUIStore.closeSidebar();
  }

  function onDragStart(event: DragEvent, entityId: string) {
    if (event.dataTransfer) {
      event.dataTransfer.setData("application/codex-entity", entityId);
      event.dataTransfer.effectAllowed = "copyMove";
    }
  }

  function handleFindInGraph(entity: Entity, event?: MouseEvent) {
    if (event) {
      layoutUIStore.setLastSelectedNodePosition({
        x: event.clientX,
        y: event.clientY,
      });
    } else {
      layoutUIStore.setLastSelectedNodePosition(null);
    }
    dispatchSearchEntityFocus(entity.id, DEFAULT_SEARCH_ENTITY_ZOOM);
    vault.selectedEntityId = entity.id;
    layoutUIStore.findInGraph();
    if (layoutUIStore.isMobile) layoutUIStore.closeSidebar();
  }

  let explorerTab = $state<"all" | "review">("all");
  const draftCount = $derived.by(() => {
    // ⚡ Bolt Optimization: Replace .reduce() with imperative loop to avoid closure allocation
    // and reduce GC pressure during reactive updates across a large array of entities.
    let count = 0;
    for (const entity of vault.allEntities) {
      if (entity.status === "draft") count++;
    }
    return count;
  });
  const actioningIds = $state(new Set<string>());

  async function handleApproveDraft(entity: Entity) {
    if (actioningIds.has(entity.id)) return;
    actioningIds.add(entity.id);
    try {
      await vault.updateEntity(entity.id, { status: "active" });
    } catch (err: any) {
      notificationStore.notify(`Error: ${err.message}`, "error");
    } finally {
      actioningIds.delete(entity.id);
    }
  }

  async function handleRejectDraft(entity: Entity) {
    if (actioningIds.has(entity.id)) return;
    actioningIds.add(entity.id);
    try {
      await vault.deleteEntity(entity.id);
    } catch (err: any) {
      notificationStore.notify(`Error: ${err.message}`, "error");
    } finally {
      actioningIds.delete(entity.id);
    }
  }
</script>

<div
  class="flex flex-col flex-1 min-h-0 bg-theme-surface font-body"
  style:background-color="var(--theme-panel-fill)"
  style:background-image="var(--bg-texture-overlay)"
  data-testid="entity-explorer-panel"
>
  <!-- Header -->
  <div
    class="p-4 border-b border-theme-border flex items-center justify-between shrink-0"
    style:background-color="var(--theme-panel-fill)"
  >
    <div class="flex items-center gap-2">
      <div
        class="w-8 h-8 rounded-md flex items-center justify-center border"
        style:background-color="var(--theme-selected-bg)"
        style:border-color="var(--theme-selected-border)"
        style:color="var(--theme-icon-active)"
      >
        <span class="icon-[lucide--database] w-4 h-4"></span>
      </div>
      <div>
        <div
          class="text-[9px] font-mono text-theme-muted uppercase tracking-[0.2em] leading-none mb-1"
        >
          Catalog
        </div>
        <h2
          class="text-xs font-bold text-theme-text uppercase font-header tracking-tight"
        >
          Entity Explorer
        </h2>
      </div>
    </div>
    <button
      onclick={() => layoutUIStore.toggleSidebarTool("explorer")}
      class="p-1.5 rounded-md transition-all"
      style:color="var(--theme-icon-default)"
      aria-label="Close Explorer"
    >
      <span class="icon-[lucide--x] w-4 h-4"></span>
    </button>
  </div>

  <div class="flex shrink-0 border-b border-theme-border bg-theme-surface/30">
    <button
      class="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all {explorerTab ===
      'all'
        ? 'border-b-2 border-theme-primary bg-theme-primary/5 text-theme-primary'
        : 'text-theme-muted hover:bg-theme-surface/50 hover:text-theme-text'}"
      onclick={() => (explorerTab = "all")}
    >
      All Entities
    </button>
    <button
      class="relative flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all {explorerTab ===
      'review'
        ? 'border-b-2 border-theme-primary bg-theme-primary/5 text-theme-primary'
        : 'text-theme-muted hover:bg-theme-surface/50 hover:text-theme-text'}"
      onclick={() => (explorerTab = "review")}
    >
      Review
      {#if draftCount > 0}
        <span
          class="ml-1 rounded-full bg-theme-primary px-1.5 py-0.5 text-[8px] text-theme-bg"
          >{draftCount}</span
        >
      {/if}
    </button>
  </div>

  <!-- List -->
  <div class="flex-1 min-h-0 flex flex-col">
    <EntityList
      onSelect={handleSelect}
      onOpenZen={handleSelect}
      onFindInGraph={handleFindInGraph}
      onDragStart={explorerTab === "all" ? onDragStart : undefined}
      showDraftsOnly={explorerTab === "review"}
      onApproveDraft={explorerTab === "review" && !vault.isGuest
        ? handleApproveDraft
        : undefined}
      onRejectDraft={explorerTab === "review" && !vault.isGuest
        ? handleRejectDraft
        : undefined}
    />
  </div>
</div>
