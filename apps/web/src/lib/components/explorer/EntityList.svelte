<script lang="ts">
  import { tick } from "svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { groupEntitiesForExplorer } from "./entityListGrouping";
  import {
    buildEntityTree,
    flattenVisibleEntityTree,
    type TreeNode,
  } from "./entityTree";
  import {
    filterEntities,
    countEntityTypes,
    createEntityTextSearchRunner,
    parseEntitySearchQuery,
  } from "./entityListFiltering";
  import {
    searchService as defaultSearchService,
    type SearchService,
  } from "@codex/search-orchestrator";
  import type { SearchIndexProgress } from "@codex/search-engine";
  import type { Entity } from "schema";
  import { explorerUIStore } from "$lib/stores/ui/explorer-ui.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import EntityListItem from "./EntityListItem.svelte";
  import EntityListSearch from "./EntityListSearch.svelte";
  import EntityListFilterBar from "./EntityListFilterBar.svelte";
    import EntityEmptyState from "./EntityEmptyState.svelte";
  import EntitySearchEmptyState from "./EntitySearchEmptyState.svelte";
  import { sortExplorerEntities } from "./entityListSorting";
  import { browserPerformanceRecorder } from "$lib/services/performance/browser-performance-capture";
  import type { PerformanceOperationHandle } from "@codex/performance-observability";
  import {
    ENTITY_EXPLORER_PAGE_SIZE,
    getExplorerPageCount,
    getExplorerPageItems,
    paginateExplorerGroups,
  } from "./entityExplorerPagination";

  type GroupEntry =
    | {
        kind: "group";
        id: string;
        groupType: "label" | "category" | "unlabeled";
        groupKey: string;
        title: string;
        count: number;
        collapsed: boolean;
      }
    | {
        kind: "entity";
        id: string;
        groupKey: string;
        entity: Entity;
      };

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
    searchService = defaultSearchService,
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
    searchService?: SearchService;
  } = $props();

  let searchQuery = $state("");
  let typeFilters = $state<Set<string>>(new Set());
  let textMatchIds = $state<Set<string> | null>(null);
  let textSearchPending = $state(false);
  let textSearchUnavailable = $state(false);
  let textSearchError = $state<string | null>(null);
  let indexProgress = $state<SearchIndexProgress>({
    status: "idle",
    vaultId: null,
    runId: null,
    indexedCount: 0,
    totalCount: null,
    isPartial: false,
    canRetry: false,
    message: "Search is idle.",
    error: null,
  });
  let latestIndexStatus: SearchIndexProgress["status"] = "idle";
  let indexStatusVersion = $state(0);
  const parsedSearchQuery = $derived(parseEntitySearchQuery(searchQuery));

  $effect(() => {
    const initialProgress = searchService.getIndexProgress();
    latestIndexStatus = initialProgress.status;
    indexProgress = initialProgress;
    const unsubscribe = searchService.subscribeIndexProgress((progress) => {
      if (progress.status !== latestIndexStatus) {
        latestIndexStatus = progress.status;
        indexStatusVersion += 1;
      }
      indexProgress = progress;
    });
    return unsubscribe;
  });

  $effect(() => {
    const query = searchQuery;
    const entityCount = vault.allEntities.length;
    void indexStatusVersion;
    const indexStatus = latestIndexStatus;
    const { textQuery } = parsedSearchQuery;
    if (!textQuery) {
      textMatchIds = null;
      textSearchPending = false;
      textSearchUnavailable = false;
      textSearchError = null;
      return;
    }

    // An idle index has not been opened yet. Keep the UI responsive and use
    // the metadata fallback until the lifecycle reports a usable index.
    if (indexStatus === "idle") {
      textMatchIds = null;
      textSearchPending = false;
      textSearchUnavailable = true;
      textSearchError = null;
      return;
    }

    textMatchIds = null;
    textSearchPending = true;
    textSearchUnavailable = false;
    textSearchError = null;
    const searchRunner = createEntityTextSearchRunner(searchService);
    void searchRunner.search(query, entityCount).then((result) => {
      if (!result) return;
      textSearchPending = false;
      textMatchIds = result.error ? null : result.matchIds;
      textSearchUnavailable = result.error !== null;
      textSearchError = result.error?.message ?? null;
    });

    return () => {
      searchRunner.cancel();
    };
  });

  const activeVaultId = $derived(vault.activeVaultId);
  const labelFilters = $derived(explorerUIStore.labelFilters);
  const viewMode = $derived(explorerUIStore.explorerViewMode);
  const sortKey = $derived(explorerUIStore.explorerSortKey);
  const sortDirection = $derived(explorerUIStore.explorerSortDirection);
  const sortDirectionAction = $derived.by(() => {
    if (sortKey === "name") {
      return sortDirection === "asc"
        ? "Sort names Z to A"
        : "Sort names A to Z";
    }
    return sortDirection === "desc"
      ? "Sort last edited oldest first"
      : "Sort last edited newest first";
  });
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
      textMatchIds,
      textSearchPending,
      textSearchUnavailable,
    }),
  );

  const searchStatusMessage = $derived(
    textSearchPending
      ? "Searching indexed content…"
      : textSearchError
        ? "Content search is temporarily unavailable; matching titles, aliases, and labels."
        : indexProgress.isPartial && parsedSearchQuery.textQuery
          ? "Search is still indexing; results will update as indexing finishes."
          : null,
  );

  const sortedEntities = $derived(
    sortExplorerEntities(filteredEntities, {
      key: sortKey,
      direction: sortDirection,
    }),
  );

  const groupedEntities = $derived(
    groupEntitiesForExplorer(sortedEntities, effectiveViewMode),
  );

  const collapsedEntities = $derived(
    explorerUIStore.getCollapsedEntities(activeVaultId),
  );

  const entityTree = $derived(
    buildEntityTree(vault.allEntities, sortedEntities, {
      key: sortKey,
      direction: sortDirection,
    }),
  );
  const flattenedTree = $derived(
    flattenVisibleEntityTree(
      entityTree,
      collapsedEntities,
      searchQuery.trim() !== "",
    ),
  );
  const groupedEntries = $derived.by((): GroupEntry[] => {
    if (!groupedEntities) return [];
    const entries: GroupEntry[] = [];
    if (groupedEntities.type === "label") {
      for (const label of groupedEntities.sortedKeys) {
        const items = groupedEntities.groups.get(label) ?? [];
        const collapsed = collapsedLabelGroups.has(label);
        entries.push({
          kind: "group",
          id: `label:${label}`,
          groupType: "label",
          groupKey: label,
          title: label,
          count: items.length,
          collapsed,
        });
        if (!collapsed) {
          for (const entity of items) {
            entries.push({
              kind: "entity",
              id: `${entity.id}:${label}`,
              groupKey: label,
              entity,
            });
          }
        }
      }
      if (groupedEntities.unlabeled.length > 0) {
        entries.push({
          kind: "group",
          id: "label:unlabeled",
          groupType: "unlabeled",
          groupKey: "unlabeled",
          title: "Unlabeled",
          count: groupedEntities.unlabeled.length,
          collapsed: false,
        });
        for (const entity of groupedEntities.unlabeled) {
          entries.push({
            kind: "entity",
            id: `${entity.id}:unlabeled`,
            groupKey: "unlabeled",
            entity,
          });
        }
      }
    } else {
      for (const categoryId of groupedEntities.sortedKeys) {
        const items = groupedEntities.groups.get(categoryId) ?? [];
        const collapsed = collapsedCategoryGroups.has(categoryId);
        entries.push({
          kind: "group",
          id: `category:${categoryId}`,
          groupType: "category",
          groupKey: categoryId,
          title: getCategoryLabel(categoryId),
          count: items.length,
          collapsed,
        });
        if (!collapsed) {
          for (const entity of items) {
            entries.push({
              kind: "entity",
              id: `${entity.id}:${categoryId}`,
              groupKey: categoryId,
              entity,
            });
          }
        }
      }
    }
    return entries;
  });

  const pageSize = ENTITY_EXPLORER_PAGE_SIZE;
  let page = $state(1);
  const pagedTreeRows = $derived(
    getExplorerPageItems(flattenedTree, page, pageSize),
  );
  const groupedPages = $derived(
    paginateExplorerGroups(groupedEntries, pageSize),
  );
  const pagedGroupRows = $derived(groupedPages[page - 1] ?? []);
  const totalPageRows = $derived(
    effectiveViewMode === "list" ? flattenedTree.length : groupedEntries.length,
  );
  const pageCount = $derived(
    effectiveViewMode === "list"
      ? getExplorerPageCount(totalPageRows, pageSize)
      : Math.max(1, groupedPages.length),
  );
  const firstPageRow = $derived(
    totalPageRows === 0 ? 0 : (page - 1) * pageSize + 1,
  );
  const lastPageRow = $derived(Math.min(page * pageSize, totalPageRows));

  $effect(() => {
    void searchQuery;
    void typeFilters;
    void labelFilters;
    void effectiveViewMode;
    void sortKey;
    void sortDirection;
    page = 1;
  });
  $effect(() => {
    page = Math.min(Math.max(1, page), pageCount);
  });

  function goToPage(nextPage: number) {
    page = Math.min(Math.max(1, nextPage), pageCount);
  }

  let inlineCreationParentId = $state<string | null>(null);
  let newChildTitle = $state("");
  let newChildType = $state("character");
  let isCreatingChild = $state(false);
  let createChildError = $state<string | null>(null);
  let isDragging = $state(false);
  let draggedEntityId = $state<string | null>(null);
  let explorerHasOpened = false;
  let pendingExplorerSpan: PerformanceOperationHandle | null = null;

  async function completeExplorerRender(span: PerformanceOperationHandle) {
    await tick();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    if (pendingExplorerSpan !== span) return;
    span.complete(() => ({
      entityCount: vault.allEntities.length,
      resultCount: sortedEntities.length,
      domNodeCount: document.querySelectorAll("[data-testid=entity-list-item]")
        .length,
    }));
    pendingExplorerSpan = null;
  }

  $effect(() => {
    void searchQuery;
    void typeFilters;
    void labelFilters;
    void effectiveViewMode;
    void sortKey;
    void sortDirection;
    void showDraftsOnly;
    void sortedEntities.length;
    if (!activeVaultId) return;

    pendingExplorerSpan?.cancel();
    const span = browserPerformanceRecorder.start(
      explorerHasOpened ? "explorer_filter" : "explorer_open",
    );
    explorerHasOpened = true;
    pendingExplorerSpan = span;
    void completeExplorerRender(span);
  });

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
    {#if searchStatusMessage}
      <p class="text-[10px] text-theme-muted" aria-live="polite">
        {searchStatusMessage}
      </p>
    {/if}
    <EntityListFilterBar bind:typeFilters {typeCounts} {allowedTypes} />
    <div class="flex items-center justify-end gap-1.5">
      <label
        for="entity-explorer-sort"
        class="text-[9px] font-bold uppercase tracking-wider text-theme-muted"
      >
        Sort
      </label>
      <select
        id="entity-explorer-sort"
        value={sortKey}
        onchange={(event) =>
          explorerUIStore.setExplorerSortKey(
            event.currentTarget.value as "name" | "updated",
          )}
        class="rounded-lg border border-theme-border/60 bg-theme-surface/40 px-2 py-1 text-[10px] font-mono text-theme-text outline-none transition-colors hover:border-theme-primary/50 focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20"
      >
        <option value="name">Name</option>
        <option value="updated">Last edited</option>
      </select>
      <button
        type="button"
        onclick={() => explorerUIStore.toggleExplorerSortDirection()}
        aria-label={sortDirectionAction}
        title={sortDirectionAction}
        class="flex h-7 w-7 items-center justify-center rounded-lg border border-theme-border/60 bg-theme-surface/40 text-theme-muted transition-colors hover:border-theme-primary/50 hover:text-theme-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/30"
      >
        <span
          class="{sortDirection === 'asc'
            ? 'icon-[lucide--arrow-up]'
            : 'icon-[lucide--arrow-down]'} h-3.5 w-3.5"
          aria-hidden="true"
        ></span>
      </button>
    </div>
  </div>

  <div
    class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar"
    style="touch-action: pan-y;"
  >
    {#snippet treeNode(
      node: TreeNode,
      depth: number,
      includeChildren = true,
      isLast = true,
      ancestorLines: boolean[] = [],
    )}
      {@const entity = node.entity}
      {@const hasChildren = node.children.length > 0}
      {@const isCollapsed =
        searchQuery.trim() !== "" ? false : collapsedEntities.has(entity.id)}
      {@const cappedDepth = Math.min(depth, 8)}
      {@const elbowColumn = depth <= 8 ? cappedDepth - 1 : -1}

      <div
        class="space-y-1 relative"
        style:margin-left={`${cappedDepth * 0.75}rem`}
      >
        {#if depth > 0}
          <div
            class="tree-guides pointer-events-none absolute inset-y-0 flex"
            style:left={`-${cappedDepth * 0.75}rem`}
            style:width={`${cappedDepth * 0.75}rem`}
            data-testid="tree-guides"
            aria-hidden="true"
          >
            {#each Array(cappedDepth) as _, level (level)}
              {#if level === elbowColumn}
                <span class="tree-guide-col tree-guide-elbow-col">
                  <span class="tree-guide-elbow-top"></span>
                  {#if !isLast}
                    <span class="tree-guide-elbow-bottom"></span>
                  {/if}
                  <span class="tree-guide-elbow-arm"></span>
                </span>
              {:else if ancestorLines[level]}
                <span class="tree-guide-col tree-guide-line"></span>
              {:else}
                <span class="tree-guide-col"></span>
              {/if}
            {/each}
          </div>
        {/if}
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
          <div class={depth < 8 ? "tree-guide-bar ml-3 pl-2" : ""}>
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

        {#if includeChildren && hasChildren && !isCollapsed}
          <div class="space-y-1" data-testid="tree-guide-children">
            {#each node.children as child, childIndex (child.entity.id)}
              {@render treeNode(
                child,
                depth + 1,
                true,
                childIndex === node.children.length - 1,
                [...ancestorLines, !isLast],
              )}
            {/each}
          </div>
        {/if}
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
      {#each pagedTreeRows as row (row.node.entity.id)}
        {@render treeNode(
          row.node,
          row.depth,
          false,
          row.isLast,
          row.ancestorLines,
        )}
      {:else}
        {#if vault.allEntities.length === 0}
          <EntityEmptyState isGuest={vault.isGuest} />
        {:else}
          <EntitySearchEmptyState />
        {/if}
      {/each}
    {:else if effectiveViewMode === "label" || effectiveViewMode === "category"}
      {#each pagedGroupRows as entry (entry.id)}
        {#if entry.kind === "group"}
          {@const isToggleable = entry.groupType !== "unlabeled"}
          <button
            type="button"
            onclick={() =>
              entry.groupType === "label"
                ? explorerUIStore.toggleExplorerLabelGroup(
                    activeVaultId,
                    entry.groupKey,
                  )
                : entry.groupType === "category"
                  ? explorerUIStore.toggleExplorerCategoryGroup(
                      activeVaultId,
                      entry.groupKey,
                    )
                  : undefined}
            aria-expanded={isToggleable ? !entry.collapsed : undefined}
            disabled={!isToggleable}
            class="mt-4 first:mt-0 flex w-full items-center justify-between rounded-lg border border-theme-border/30 px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-theme-muted transition-all hover:border-theme-primary/40 hover:bg-theme-primary/5 hover:text-theme-text focus:border-theme-accent focus:outline-none focus:ring-2 focus:ring-theme-accent/20"
          >
            <span class="flex items-center gap-1.5">
              {#if isToggleable}
                <span
                  class="{entry.collapsed
                    ? 'icon-[lucide--chevron-right]'
                    : 'icon-[lucide--chevron-down]'} h-3 w-3"
                ></span>
              {/if}
              <span>{entry.title}</span>
            </span>
            <span class="text-[9px] text-theme-muted/80">{entry.count}</span>
          </button>
        {:else}
          {@render groupedEntityItem(entry.entity, entry.groupKey)}
        {/if}
      {/each}
      {#if sortedEntities.length === 0}
        <EntitySearchEmptyState />
      {/if}
    {/if}

    {#if pageCount > 1}
      <nav
        class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-theme-border/30 pt-2"
        aria-label="Entity explorer pages"
        data-testid="entity-explorer-pagination"
      >
        <span class="text-[10px] text-theme-muted" aria-live="polite">
          Showing {firstPageRow}–{lastPageRow} of {totalPageRows} visible rows
        </span>
        <div class="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous page"
            disabled={page === 1}
            onclick={() => goToPage(page - 1)}
            class="rounded px-2 py-1 text-[10px] text-theme-muted disabled:opacity-40"
            >Previous</button
          >
          <span class="px-1 text-[10px] text-theme-text"
            >Page {page} of {pageCount}</span
          >
          <button
            type="button"
            aria-label="Next page"
            disabled={page === pageCount}
            onclick={() => goToPage(page + 1)}
            class="rounded px-2 py-1 text-[10px] text-theme-muted disabled:opacity-40"
            >Next</button
          >
        </div>
      </nav>
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

  /* Tree hierarchy guides (issue #2361): a vertical bar per active ancestor
     level, with a short horizontal elbow connecting each child row into its
     parent's line, so parent/child structure reads clearly without relying
     on indentation alone. Rendered per-row (rather than as a single wrapping
     border) because rows are flattened for large-vault pagination.
     --tree-guide-color is defined here (the shared list container) rather
     than on .tree-guides so that .tree-guide-bar — used for the inline
     add-child form, which is a sibling of .tree-guides, not a descendant —
     also inherits it. */
  .custom-scrollbar {
    --tree-guide-color: color-mix(
      in srgb,
      var(--color-theme-accent),
      transparent 60%
    );
  }
  .tree-guide-bar {
    border-left: 1px solid var(--tree-guide-color);
    box-shadow: var(--theme-text-glow, none);
  }
  .tree-guide-col {
    position: relative;
    flex: 0 0 0.75rem;
  }
  .tree-guide-line::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 50%;
    width: 1px;
    background: var(--tree-guide-color);
    box-shadow: var(--theme-text-glow, none);
  }
  .tree-guide-elbow-top,
  .tree-guide-elbow-bottom {
    position: absolute;
    left: 50%;
    width: 1px;
    background: var(--tree-guide-color);
  }
  .tree-guide-elbow-top {
    top: 0;
    height: 50%;
  }
  .tree-guide-elbow-bottom {
    bottom: 0;
    height: 50%;
  }
  .tree-guide-elbow-arm {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 50%;
    height: 1px;
    background: var(--tree-guide-color);
  }
</style>
