<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { groupEntitiesForExplorer } from "./entityListGrouping";
  import { buildEntityTree, type TreeNode } from "./entityTree";
  import { filterEntities, countEntityTypes } from "./entityListFiltering";
  import type { Entity } from "schema";
  import { explorerUIStore } from "$lib/stores/ui/explorer-ui.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import EntityListItem from "./EntityListItem.svelte";
  import EntityListSearch from "./EntityListSearch.svelte";
  import EntityListFilterBar from "./EntityListFilterBar.svelte";
  import EmptyState from "$lib/components/ui/EmptyState.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

  let {
    onSelect,
    onDragStart,
    onDragEnd,
    onOpenZen,
    onFindInGraph,
    onApproveDraft,
    onRejectDraft,
    allowedTypes = null,
    showDraftsOnly = false,
    class: className = "",
  }: {
    onSelect?: (entity: Entity) => void;
    onDragStart?: (event: DragEvent, entityId: string) => void;
    onDragEnd?: () => void;
    onOpenZen?: (entity: Entity) => void;
    onFindInGraph?: (entity: Entity, event?: MouseEvent) => void;
    onApproveDraft?: (entity: Entity) => void;
    onRejectDraft?: (entity: Entity) => void;
    allowedTypes?: string[] | null;
    showDraftsOnly?: boolean;
    class?: string;
  } = $props();

  let searchQuery = $state("");
  let typeFilters = $state<Set<string>>(new Set());

  const activeVaultId = $derived(vault.activeVaultId);
  const labelFilters = $derived(explorerUIStore.labelFilters);
  const viewMode = $derived(explorerUIStore.explorerViewMode);
  const effectiveViewMode = $derived(
    viewMode === "category" && typeFilters.size === 1 ? "list" : viewMode,
  );
  const collapsedCategoryGroups = $derived(
    explorerUIStore.getCollapsedCategoryGroups(activeVaultId),
  );
  const collapsedLabelGroups = $derived(
    explorerUIStore.getCollapsedLabelGroups(activeVaultId),
  );

  const typeCounts = $derived(
    countEntityTypes(vault.allEntities, {
      allowedTypes,
      showDraftsOnly,
    }),
  );

  const filteredEntities = $derived(
    filterEntities(vault.allEntities, {
      searchQuery,
      typeFilters,
      labelFilters,
      allowedTypes,
      showDraftsOnly,
    }),
  );

  const groupedEntities = $derived(
    groupEntitiesForExplorer(filteredEntities, effectiveViewMode),
  );

  const collapsedEntities = $derived(
    explorerUIStore.getCollapsedEntities(activeVaultId),
  );

  const entityTree = $derived(
    buildEntityTree(vault.allEntities, filteredEntities),
  );

  let inlineCreationParentId = $state<string | null>(null);
  let newChildTitle = $state("");
  let newChildType = $state("character");
  let isCreatingChild = $state(false);
  let createChildError = $state<string | null>(null);
  let isDragging = $state(false);
  let draggedEntityId = $state<string | null>(null);

  $effect(() => {
    if (inlineCreationParentId && categories.list.length > 0) {
      const currentIsValid = categories.list.some((c) => c.id === newChildType);
      if (!currentIsValid) {
        newChildType = categories.list[0].id;
      }
    }
  });

  async function handleCreateChild(parentId: string) {
    if (!newChildTitle.trim() || isCreatingChild) return;
    isCreatingChild = true;
    createChildError = null;
    try {
      const id = await vault.createEntity(newChildType, newChildTitle, {
        parent: parentId,
      });
      newChildTitle = "";
      inlineCreationParentId = null;

      const newEntity = vault.allEntities.find((e) => e.id === id);
      if (newEntity && onSelect) {
        onSelect(newEntity);
      }
    } catch (err: any) {
      createChildError = err.message || String(err);
    } finally {
      isCreatingChild = false;
    }
  }

  function getCategoryLabel(categoryId: string) {
    return categories.getCategory(categoryId)?.label ?? categoryId;
  }
</script>

<div class="flex flex-col h-full min-h-0 {className}">
  <div class="p-4 border-b border-theme-border shrink-0 space-y-3">
    <EntityListSearch bind:searchQuery />
    <EntityListFilterBar bind:typeFilters {typeCounts} {allowedTypes} />
  </div>

  <div
    class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar"
    style="touch-action: pan-y;"
  >
    {#snippet treeNode(node: TreeNode, depth: number)}
      {@const entity = node.entity}
      {@const hasChildren = node.children.length > 0}
      {@const isCollapsed =
        searchQuery.trim() !== "" ? false : collapsedEntities.has(entity.id)}

      <div class="space-y-1">
        <EntityListItem
          {entity}
          isMatching={node.isMatchingQuery}
          {hasChildren}
          {isCollapsed}
          {isDragging}
          isDragSource={entity.id === draggedEntityId}
          draggable={!!onDragStart}
          {onSelect}
          onDragStart={onDragStart
            ? (e, entityId) => {
                draggedEntityId = entityId;
                requestAnimationFrame(() => {
                  if (draggedEntityId === entityId) {
                    isDragging = true;
                  }
                });
                onDragStart?.(e, entityId);
              }
            : undefined}
          onDragEnd={onDragStart
            ? () => {
                isDragging = false;
                draggedEntityId = null;
                onDragEnd?.();
              }
            : undefined}
          {onOpenZen}
          {onFindInGraph}
          {onApproveDraft}
          {onRejectDraft}
          onAddChild={(pId) => {
            if (inlineCreationParentId === pId) {
              inlineCreationParentId = null;
              newChildTitle = "";
            } else {
              inlineCreationParentId = pId;
              newChildTitle = "";
              if (categories.list.length > 0) {
                newChildType = categories.list[0].id;
              }
            }
          }}
        />

        {#if inlineCreationParentId === entity.id}
          <div
            class={depth < 8 ? "ml-3 pl-2 border-l border-theme-border/15" : ""}
          >
            <div
              class="flex items-center gap-2 p-2 border border-theme-border/50 bg-theme-surface/30 rounded-xl"
            >
              <span class="icon-[lucide--plus] w-3 h-3 text-theme-muted"></span>
              <input
                type="text"
                bind:value={newChildTitle}
                placeholder="New entity name..."
                onkeydown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateChild(entity.id);
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    inlineCreationParentId = null;
                    newChildTitle = "";
                  }
                }}
                class="flex-1 bg-transparent border-none text-xs text-theme-text placeholder-theme-muted/50 focus:outline-none focus:ring-0 p-0"
                aria-label="New entity name"
                disabled={isCreatingChild}
              />
              <select
                bind:value={newChildType}
                class="bg-theme-bg/50 border border-theme-border/50 text-[10px] text-theme-muted uppercase tracking-wider rounded px-1.5 py-0.5 focus:outline-none focus:ring-0"
                aria-label="New entity category"
                disabled={isCreatingChild}
              >
                {#each categories.list as cat (cat.id)}
                  <option value={cat.id}>{cat.label}</option>
                {/each}
              </select>
              <button
                type="button"
                onclick={() => handleCreateChild(entity.id)}
                class="p-1 text-theme-muted hover:text-theme-primary transition-colors flex items-center justify-center shrink-0"
                title="Create child entity"
                aria-label="Create child entity"
                disabled={isCreatingChild}
              >
                <span
                  aria-hidden="true"
                  class="icon-[lucide--check] w-3.5 h-3.5"
                ></span>
              </button>
              <button
                type="button"
                onclick={() => {
                  inlineCreationParentId = null;
                  newChildTitle = "";
                }}
                class="p-1 text-theme-muted hover:text-theme-primary transition-colors flex items-center justify-center shrink-0"
                title="Cancel"
                aria-label="Cancel"
                disabled={isCreatingChild}
              >
                <span aria-hidden="true" class="icon-[lucide--x] w-3.5 h-3.5"
                ></span>
              </button>
            </div>
            {#if createChildError}
              <div class="text-[10px] text-red-500/80 px-2.5 mt-1 font-mono">
                {createChildError}
              </div>
            {/if}
          </div>
        {/if}

        {#if hasChildren && !isCollapsed}
          <div
            class="space-y-1 {depth < 8
              ? 'border-l border-theme-border/15 ml-3 pl-2'
              : ''}"
          >
            {#each node.children as child (child.entity.id)}
              {@render treeNode(child, depth + 1)}
            {/each}
          </div>
        {/if}
      </div>
    {/snippet}

    {#snippet sectionHeader(title: string)}
      <div
        class="py-1 px-2 mt-4 first:mt-0 text-[10px] font-bold text-theme-muted uppercase tracking-[0.2em] border-b border-theme-border/30 mb-1"
      >
        {title}
      </div>
    {/snippet}

    {#snippet groupedEntityItem(entity: Entity, _keySuffix: string)}
      <EntityListItem
        {entity}
        {isDragging}
        isDragSource={entity.id === draggedEntityId}
        draggable={!!onDragStart}
        {onSelect}
        onDragStart={onDragStart
          ? (e, entityId) => {
              draggedEntityId = entityId;
              requestAnimationFrame(() => {
                if (draggedEntityId === entityId) {
                  isDragging = true;
                }
              });
              onDragStart?.(e, entityId);
            }
          : undefined}
        onDragEnd={onDragStart
          ? () => {
              isDragging = false;
              draggedEntityId = null;
              onDragEnd?.();
            }
          : undefined}
        {onOpenZen}
        {onFindInGraph}
        {onApproveDraft}
        {onRejectDraft}
      />
    {/snippet}

    {#if effectiveViewMode === "list"}
      {#if isDragging}
        <div
          class="border-2 border-dashed border-theme-border rounded-xl p-3 text-center text-xs text-theme-muted hover:border-theme-primary hover:text-theme-primary transition-all mb-2"
          role="none"
          ondragover={(e) => {
            if (!sessionModeStore.isGuestMode) {
              e.preventDefault();
            }
          }}
          ondrop={async (e) => {
            if (sessionModeStore.isGuestMode) return;
            e.preventDefault();
            const draggedId =
              e.dataTransfer?.getData("application/x-codex-entity-id") ||
              e.dataTransfer?.getData("text/plain");
            if (draggedId) {
              await vault.updateEntity(draggedId, { parent: undefined });
            }
          }}
        >
          Move to Root
        </div>
      {/if}
      {#each entityTree as node (node.entity.id)}
        {@render treeNode(node, 0)}
      {:else}
        <div data-testid="no-entities-found">
          {#if vault.allEntities.length === 0}
            <EmptyState
              icon="icon-[lucide--ghost]"
              headline="No entities yet"
              body={vault.isGuest
                ? "Nothing has been shared with you yet."
                : "Create your first entity to start building your vault."}
              cta={vault.isGuest ? undefined : "＋ Create your first entity"}
              onCta={vault.isGuest
                ? undefined
                : () => modalUIStore.requestCreateEntity()}
            />
          {:else}
            <EmptyState
              icon="icon-[lucide--search-x]"
              headline="No entities found"
              body="Try adjusting your search or filters."
            />
          {/if}
        </div>
      {/each}
    {:else if effectiveViewMode === "label" && groupedEntities?.type === "label"}
      {#each groupedEntities.sortedKeys as label (label)}
        {@const labelEntities = groupedEntities.groups.get(label) ?? []}
        {@const isCollapsed = collapsedLabelGroups.has(label)}
        <button
          type="button"
          onclick={() =>
            explorerUIStore.toggleExplorerLabelGroup(activeVaultId, label)}
          aria-expanded={!isCollapsed}
          class="mt-4 first:mt-0 flex w-full items-center justify-between rounded-lg border border-theme-border/30 px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-theme-muted transition-all hover:border-theme-primary/40 hover:bg-theme-primary/5 hover:text-theme-text focus:border-theme-accent focus:outline-none focus:ring-2 focus:ring-theme-accent/20"
        >
          <span class="flex items-center gap-1.5">
            {#if isCollapsed}
              <span class="icon-[lucide--chevron-right] h-3 w-3"></span>
            {:else}
              <span class="icon-[lucide--chevron-down] h-3 w-3"></span>
            {/if}
            <span>{label}</span>
          </span>
          <span class="text-[9px] text-theme-muted/80"
            >{labelEntities.length}</span
          >
        </button>
        {#if !isCollapsed}
          {#each labelEntities as entity (`${entity.id}:${label}`)}
            <EntityListItem
              {entity}
              {isDragging}
              isDragSource={entity.id === draggedEntityId}
              draggable={!!onDragStart}
              {onSelect}
              onDragStart={onDragStart
                ? (e, entityId) => {
                    draggedEntityId = entityId;
                    requestAnimationFrame(() => {
                      if (draggedEntityId === entityId) {
                        isDragging = true;
                      }
                    });
                    onDragStart?.(e, entityId);
                  }
                : undefined}
              onDragEnd={onDragStart
                ? () => {
                    isDragging = false;
                    draggedEntityId = null;
                    onDragEnd?.();
                  }
                : undefined}
              {onOpenZen}
              {onFindInGraph}
              {onApproveDraft}
              {onRejectDraft}
            />
          {/each}
        {/if}
      {/each}
      {#if groupedEntities.unlabeled && groupedEntities.unlabeled.length > 0}
        {@render sectionHeader("Unlabeled")}
        {#each groupedEntities.unlabeled as entity (entity.id)}
          <EntityListItem
            {entity}
            {isDragging}
            isDragSource={entity.id === draggedEntityId}
            draggable={!!onDragStart}
            {onSelect}
            onDragStart={onDragStart
              ? (e, entityId) => {
                  draggedEntityId = entityId;
                  requestAnimationFrame(() => {
                    if (draggedEntityId === entityId) {
                      isDragging = true;
                    }
                  });
                  onDragStart?.(e, entityId);
                }
              : undefined}
            onDragEnd={onDragStart
              ? () => {
                  isDragging = false;
                  draggedEntityId = null;
                  onDragEnd?.();
                }
              : undefined}
            {onOpenZen}
            {onFindInGraph}
            {onApproveDraft}
            {onRejectDraft}
          />
        {/each}
      {/if}
      {#if filteredEntities.length === 0}
        <div data-testid="no-entities-found">
          <EmptyState
            icon="icon-[lucide--search-x]"
            headline="No entities found"
            body="Try adjusting your search or filters."
          />
        </div>
      {/if}
    {:else if effectiveViewMode === "category" && groupedEntities?.type === "category"}
      {#each groupedEntities.sortedKeys as categoryId (categoryId)}
        {@const categoryEntities = groupedEntities.groups.get(categoryId) ?? []}
        {@const isCollapsed = collapsedCategoryGroups.has(categoryId)}
        <button
          type="button"
          onclick={() =>
            explorerUIStore.toggleExplorerCategoryGroup(
              activeVaultId,
              categoryId,
            )}
          aria-expanded={!isCollapsed}
          class="mt-4 first:mt-0 flex w-full items-center justify-between rounded-lg border border-theme-border/30 px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-theme-muted transition-all hover:border-theme-primary/40 hover:bg-theme-primary/5 hover:text-theme-text focus:border-theme-accent focus:outline-none focus:ring-2 focus:ring-theme-accent/20"
        >
          <span class="flex items-center gap-1.5">
            {#if isCollapsed}
              <span class="icon-[lucide--chevron-right] h-3 w-3"></span>
            {:else}
              <span class="icon-[lucide--chevron-down] h-3 w-3"></span>
            {/if}
            <span>{getCategoryLabel(categoryId)}</span>
          </span>
          <span class="text-[9px] text-theme-muted/80"
            >{categoryEntities.length}</span
          >
        </button>
        {#if !isCollapsed}
          {#each categoryEntities as entity (`${entity.id}:${categoryId}`)}
            {@render groupedEntityItem(entity, categoryId)}
          {/each}
        {/if}
      {/each}
      {#if filteredEntities.length === 0}
        <div data-testid="no-entities-found">
          <EmptyState
            icon="icon-[lucide--search-x]"
            headline="No entities found"
            body="Try adjusting your search or filters."
          />
        </div>
      {/if}
    {/if}
  </div>
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
