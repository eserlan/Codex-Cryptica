<script lang="ts">
  import { uiStore } from "$lib/stores/ui.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import EntityList from "./EntityList.svelte";
  import { Database, X } from "lucide-svelte";
  import {
    dispatchSearchEntityFocus,
    DEFAULT_SEARCH_ENTITY_ZOOM,
  } from "$lib/components/search/search-focus";

  import type { Entity } from "schema";

  function handleSelect(entity: Entity) {
    uiStore.openZenMode(entity.id);
  }

  function onDragStart(event: DragEvent, entityId: string) {
    if (event.dataTransfer) {
      event.dataTransfer.setData("application/codex-entity", entityId);
      event.dataTransfer.effectAllowed = "move";
    }
  }

  function handleFindInGraph(entity: Entity) {
    dispatchSearchEntityFocus(entity.id, DEFAULT_SEARCH_ENTITY_ZOOM);
    vault.selectedEntityId = entity.id;
    uiStore.findInGraph();
    if (uiStore.isMobile) uiStore.closeSidebar();
  }

  let explorerTab = $state<"all" | "review">("all");
  let draftCount = $derived(
    vault.allEntities.filter((e) => e.status === "draft").length,
  );

  const actioningIds = $state(new Set<string>());

  async function handleApproveDraft(entity: Entity) {
    if (actioningIds.has(entity.id)) return;
    actioningIds.add(entity.id);
    try {
      await vault.updateEntity(entity.id, { status: "active" });
    } catch (err: any) {
      uiStore.notify(`Error: ${err.message}`, "error");
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
      uiStore.notify(`Error: ${err.message}`, "error");
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
        <Database class="w-4 h-4" />
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
      onclick={() => uiStore.toggleSidebarTool("explorer")}
      class="p-1.5 rounded-md transition-all"
      style:color="var(--theme-icon-default)"
      aria-label="Close Explorer"
    >
      <X class="w-4 h-4" />
    </button>
  </div>

  <!-- Tabs -->
  <div class="flex border-b border-theme-border shrink-0 bg-theme-surface/30">
    <button
      class="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all {explorerTab ===
      'all'
        ? 'text-theme-primary border-b-2 border-theme-primary bg-theme-primary/5'
        : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface/50'}"
      onclick={() => (explorerTab = "all")}
    >
      All Entities
    </button>
    <button
      class="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all relative {explorerTab ===
      'review'
        ? 'text-theme-primary border-b-2 border-theme-primary bg-theme-primary/5'
        : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface/50'}"
      onclick={() => (explorerTab = "review")}
    >
      Review
      {#if draftCount > 0}
        <span
          class="ml-1 px-1.5 py-0.5 rounded-full bg-theme-primary text-theme-bg text-[8px]"
          >{draftCount}</span
        >
      {/if}
    </button>
  </div>

  <!-- List -->
  <div class="flex-1 min-h-0 flex flex-col">
    <EntityList
      onSelect={handleSelect}
      onOpenZen={(entity) => uiStore.openZenMode(entity.id)}
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
