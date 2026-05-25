<script lang="ts">
  import { untrack } from "svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import { groupEntitiesForExplorer } from "./entityListGrouping";
  import { buildEntityTree, type TreeNode } from "./entityTree";
  import type { Entity } from "schema";
  import { explorerUIStore } from "$lib/stores/ui/explorer-ui.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import EntityListItem from "./EntityListItem.svelte";

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
  let isFocused = $state(false);
  let autocompleteDismissed = $state(false);

  // Unique labels in the current vault
  const uniqueLabels = $derived.by(() => {
    const labelsSet = new Set<string>();
    const entities = vault.allEntities || [];
    for (let i = 0; i < entities.length; i++) {
      const labels = entities[i].labels || [];
      for (let j = 0; j < labels.length; j++) {
        if (labels[j]) {
          labelsSet.add(labels[j]);
        }
      }
    }
    return Array.from(labelsSet).sort((a, b) => a.localeCompare(b));
  });

  const activeWord = $derived.by(() => {
    if (!searchQuery) return "";
    const words = searchQuery.split(/\s+/);
    return words[words.length - 1] || "";
  });

  const isLabelAutocompleteActive = $derived(
    activeWord.startsWith("#") || activeWord.startsWith("@"),
  );

  const autocompletePrefix = $derived(activeWord[0] || "");
  const autocompleteSearch = $derived(activeWord.slice(1).toLowerCase());

  const suggestions = $derived.by(() => {
    if (!isLabelAutocompleteActive) return [];
    return uniqueLabels
      .filter((label) => label.toLowerCase().includes(autocompleteSearch))
      .slice(0, 10);
  });

  // Reset dismissed state when the word being typed changes
  $effect(() => {
    const _word = activeWord; // track dependency
    untrack(() => {
      autocompleteDismissed = false;
    });
  });

  const showAutocomplete = $derived(
    isFocused &&
      isLabelAutocompleteActive &&
      !autocompleteDismissed &&
      suggestions.length > 0,
  );

  let activeIndex = $state(-1);

  $effect(() => {
    if (!showAutocomplete || suggestions.length === 0) {
      activeIndex = -1;
    } else if (activeIndex >= suggestions.length) {
      activeIndex = suggestions.length - 1;
    }
  });

  // 1. Sync from searchQuery to explorerUIStore.labelFilters (extracting fully matched label tokens and stripping them)
  $effect(() => {
    const query = searchQuery; // track dependency
    const tokens = query.split(/\s+/);
    const parsedLabels = new Set<string>();
    const cleanTokens: string[] = [];
    let hasLabelToken = false;

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.startsWith("#") || t.startsWith("@")) {
        const val = t.slice(1);
        if (val) {
          // Find case-insensitive match
          const match = uniqueLabels.find(
            (l) => l.toLowerCase() === val.toLowerCase(),
          );
          if (match) {
            parsedLabels.add(match);
            hasLabelToken = true;
            continue; // Skip adding to cleanTokens (strip it)
          }
        }
      }
      if (t !== "") {
        cleanTokens.push(t);
      }
    }

    if (hasLabelToken) {
      untrack(() => {
        // Add parsed labels to active filters
        const currentFilters = new Set(explorerUIStore.labelFilters);
        let changed = false;
        for (const pl of parsedLabels) {
          if (!currentFilters.has(pl)) {
            currentFilters.add(pl);
            changed = true;
          }
        }
        if (changed) {
          explorerUIStore.labelFilters = currentFilters;
        }

        // Update searchQuery without the label tokens
        searchQuery = cleanTokens.join(" ") + (query.endsWith(" ") ? " " : "");
      });
    }
  });

  function selectLabel(label: string) {
    const words = searchQuery.split(/\s+/);
    if (words.length > 0) {
      words.pop(); // Remove the autocomplete prefix (e.g. #p)
    }
    // Auto-apply selected label to active filters
    if (!explorerUIStore.labelFilters.has(label)) {
      explorerUIStore.toggleLabelFilter(label, true);
    }
    searchQuery = words.join(" ").trim() + (words.length > 0 ? " " : "");
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (showAutocomplete && suggestions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        activeIndex = (activeIndex + 1) % suggestions.length;
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        activeIndex =
          (activeIndex - 1 + suggestions.length) % suggestions.length;
      } else if (event.key === "Enter" || event.key === "Tab") {
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          event.preventDefault();
          selectLabel(suggestions[activeIndex]);
        } else if (event.key === "Tab" && suggestions.length > 0) {
          event.preventDefault();
          selectLabel(suggestions[0]);
        }
      } else if (event.key === "Escape") {
        autocompleteDismissed = true;
      }
    }
  }

  let typeFilters = $state<Set<string>>(new Set());
  const activeVaultId = $derived(vault.activeVaultId);
  const labelFilters = $derived(explorerUIStore.labelFilters);
  const viewMode = $derived(explorerUIStore.explorerViewMode);
  const allowedTypeSet = $derived.by(() =>
    allowedTypes ? new Set(allowedTypes) : null,
  );
  const visibleCategories = $derived.by(() =>
    categories.list.filter(
      (cat) => !allowedTypeSet || allowedTypeSet.has(cat.id),
    ),
  );
  const collapsedLabelGroups = $derived.by(() =>
    explorerUIStore.getCollapsedLabelGroups(activeVaultId),
  );

  // ⚡ Bolt Optimization: Return the Map directly to avoid intermediate array allocations,
  // mapping, and sorting. This also turns an O(N) .find into an O(1) Map .get lookup in the loop.
  const typeCounts = $derived.by(() => {
    const allEntities = vault.allEntities;
    const counts = new Map<string, number>();
    for (let i = 0; i < allEntities.length; i++) {
      const e = allEntities[i];
      if (allowedTypeSet && !allowedTypeSet.has(e.type)) {
        continue;
      }
      if (showDraftsOnly && e.status !== "draft") {
        continue;
      }
      if (!showDraftsOnly && e.status === "draft") {
        continue;
      }
      counts.set(e.type, (counts.get(e.type) || 0) + 1);
    }
    return counts;
  });

  const filteredEntities = $derived.by(() => {
    const allEntities = vault.allEntities;
    const filtered: Entity[] = [];
    const query = searchQuery.trim().toLowerCase();
    const filterAllTypes = typeFilters.size === 0;
    const activeLabels = Array.from(labelFilters);

    // Structured query parsing: #label or @label, and raw text (unified under labels)
    const tokens = query ? query.split(/\s+/) : [];
    const textTokens: string[] = [];
    const labelTokens: string[] = [];

    for (let j = 0; j < tokens.length; j++) {
      const t = tokens[j];
      if (t.startsWith("#") || t.startsWith("@")) {
        const label = t.slice(1);
        if (label) labelTokens.push(label);
      } else {
        textTokens.push(t);
      }
    }
    const remainingTextQuery = textTokens.join(" ");

    for (let i = 0; i < allEntities.length; i++) {
      const e = allEntities[i];

      if (allowedTypeSet && !allowedTypeSet.has(e.type)) {
        continue;
      }

      // Filter by draft status
      if (showDraftsOnly && e.status !== "draft") {
        continue;
      }
      if (!showDraftsOnly && e.status === "draft") {
        continue;
      }

      const matchesType = filterAllTypes || typeFilters.has(e.type);
      if (!matchesType) continue;

      // AND logic for sidebar label pills
      const matchesLabels =
        activeLabels.length === 0 ||
        (e.labels && activeLabels.every((f) => e.labels?.includes(f)));
      if (!matchesLabels) continue;

      // Filter by specified label tokens (#label or @label)
      const matchesLabelTokens = labelTokens.every(
        (l) => e.labels && e.labels.some((label) => label.toLowerCase() === l),
      );
      if (!matchesLabelTokens) continue;

      // Match remaining raw text queries (no longer checking e.tags)
      const matchesText =
        !remainingTextQuery ||
        e.title.toLowerCase().includes(remainingTextQuery) ||
        e.content.toLowerCase().includes(remainingTextQuery) ||
        e.labels?.some((l) => l.toLowerCase().includes(remainingTextQuery)) ||
        e.aliases?.some((a) => a.toLowerCase().includes(remainingTextQuery));

      if (matchesText) {
        filtered.push(e);
      }
    }

    return filtered.sort((a, b) => a.title.localeCompare(b.title));
  });

  const groupedEntities = $derived.by(() => {
    return groupEntitiesForExplorer(filteredEntities, viewMode);
  });

  function toggleTypeFilter(type: string, event: MouseEvent) {
    if (allowedTypeSet && !allowedTypeSet.has(type)) {
      return;
    }

    const isMulti = event.ctrlKey || event.metaKey;

    if (type === "all") {
      typeFilters = new Set();
      explorerUIStore.clearLabelFilters();
      return;
    }

    if (isMulti) {
      const newFilters = new Set(typeFilters);
      if (newFilters.has(type)) {
        newFilters.delete(type);
      } else {
        newFilters.add(type);
      }
      typeFilters = newFilters;
    } else {
      if (typeFilters.has(type)) {
        typeFilters = new Set();
      } else {
        typeFilters = new Set([type]);
      }
    }
  }

  function getIconToggleClasses(active: boolean) {
    return active
      ? "rounded-lg border border-theme-primary bg-theme-primary text-theme-bg shadow-sm transition-all hover:border-theme-secondary hover:bg-theme-secondary"
      : "rounded-lg border border-theme-border bg-theme-bg/50 text-theme-muted transition-all hover:bg-theme-bg hover:text-theme-text";
  }

  $effect(() => {
    if (!allowedTypeSet || typeFilters.size === 0) {
      return;
    }

    const nextFilters = new Set(
      Array.from(typeFilters).filter((type) => allowedTypeSet.has(type)),
    );
    if (nextFilters.size !== typeFilters.size) {
      typeFilters = nextFilters;
    }
  });

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
</script>

<div class="flex flex-col h-full min-h-0 {className}">
  <div class="p-4 border-b border-theme-border shrink-0">
    <div class="relative mb-3">
      <span
        class="absolute left-3 top-1/2 -translate-y-1/2 icon-[lucide--search] w-3.5 h-3.5 text-theme-muted"
      ></span>
      <input
        type="text"
        bind:value={searchQuery}
        onfocus={() => (isFocused = true)}
        onblur={() => setTimeout(() => (isFocused = false), 200)}
        onkeydown={handleKeyDown}
        placeholder="Search entities..."
        aria-label="Search entities"
        class="w-full rounded-lg border border-theme-border bg-theme-bg/50 py-2 pl-9 pr-9 text-sm text-theme-text placeholder-theme-muted transition-all focus:border-theme-accent focus:outline-none focus:ring-2 focus:ring-theme-accent/20"
      />
      {#if searchQuery}
        <button
          onclick={() => (searchQuery = "")}
          class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-theme-muted hover:text-theme-text transition-colors"
          title="Clear search"
          aria-label="Clear search"
        >
          <span class="icon-[lucide--x] w-3.5 h-3.5"></span>
        </button>
      {/if}

      {#if showAutocomplete && suggestions.length > 0}
        <div
          class="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg border border-theme-border bg-theme-surface/95 backdrop-blur-md p-1 shadow-lg"
        >
          {#each suggestions as label, index}
            <button
              type="button"
              onclick={() => selectLabel(label)}
              class="w-full text-left px-3 py-2 text-xs rounded-md hover:bg-theme-primary/10 text-theme-text hover:text-theme-primary font-mono transition-colors flex items-center gap-1.5 {activeIndex ===
              index
                ? 'bg-theme-primary/10 text-theme-primary'
                : ''}"
            >
              <span class="text-theme-primary/60">{autocompletePrefix}</span>
              <span>{label}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div
      class="flex items-center gap-1 rounded-xl border border-theme-border bg-theme-surface/50 px-2 py-1.5 shadow-sm"
    >
      <button
        onclick={(e) => toggleTypeFilter("all", e)}
        title="Show all categories"
        aria-label="Show all categories"
        aria-pressed={typeFilters.size === 0}
        class="flex items-center justify-center p-1.5 {getIconToggleClasses(
          typeFilters.size === 0,
        )}"
      >
        <span class="icon-[lucide--layout-grid] w-3.5 h-3.5"></span>
      </button>

      {#each visibleCategories as cat (cat.id)}
        {@const count = typeCounts.get(cat.id) || 0}
        {#if count > 0 || typeFilters.has(cat.id)}
          <button
            onclick={(e) => toggleTypeFilter(cat.id, e)}
            title={cat.label}
            aria-label={`Filter by ${cat.label}`}
            aria-pressed={typeFilters.has(cat.id)}
            class="relative flex items-center justify-center p-1.5 {getIconToggleClasses(
              typeFilters.has(cat.id),
            )}"
          >
            <span
              class="{getIconClass(cat.icon)} w-3.5 h-3.5"
              style={typeFilters.has(cat.id)
                ? undefined
                : `color: ${cat.color}`}
            ></span>
            {#if count > 0 && !typeFilters.has(cat.id)}
              <span
                class="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-theme-primary/10 text-[7px] font-bold leading-none text-theme-primary"
              >
                {count > 9 ? "9+" : count}
              </span>
            {/if}
          </button>
        {/if}
      {/each}

      <div class="w-px h-3.5 bg-theme-border mx-0.5 opacity-50"></div>

      <button
        onclick={() => explorerUIStore.setExplorerViewMode("list")}
        title="List View"
        aria-label="List View"
        aria-pressed={viewMode === "list"}
        class="flex items-center justify-center p-1.5 {getIconToggleClasses(
          viewMode === 'list',
        )}"
      >
        <span class="icon-[lucide--list] w-3.5 h-3.5"></span>
      </button>

      <button
        onclick={() => explorerUIStore.setExplorerViewMode("label")}
        title="Group by Label"
        aria-label="Group by Label"
        aria-pressed={viewMode === "label"}
        class="flex items-center justify-center p-1.5 {getIconToggleClasses(
          viewMode === 'label',
        )}"
      >
        <span class="icon-[lucide--tag] w-3.5 h-3.5"></span>
      </button>
    </div>

    {#if labelFilters.size > 0}
      <div
        class="mt-3 flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200"
      >
        {#each Array.from(labelFilters).sort() as label}
          <div
            class="flex items-center gap-1 px-2 py-0.5 rounded-md bg-theme-primary/10 border border-theme-primary/20 text-[9px] font-bold text-theme-primary uppercase tracking-wider"
          >
            <span>{label}</span>
            <button
              onclick={() => explorerUIStore.removeLabelFilter(label)}
              class="hover:text-theme-text transition-colors flex items-center justify-center"
              aria-label={`Remove ${label} filter`}
            >
              <span class="icon-[lucide--x] w-2.5 h-2.5"></span>
            </button>
          </div>
        {/each}
        <button
          onclick={() => explorerUIStore.clearLabelFilters()}
          class="px-2 py-0.5 text-[9px] font-bold text-theme-muted hover:text-theme-primary uppercase tracking-wider transition-colors"
        >
          Clear All
        </button>
      </div>
    {/if}
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
          {onSelect}
          onDragStart={(e, entityId) => {
            isDragging = true;
            onDragStart?.(e, entityId);
          }}
          onDragEnd={() => {
            isDragging = false;
            onDragEnd?.();
          }}
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
            class={depth < 5 ? "ml-3 pl-2 border-l border-theme-border/15" : ""}
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
                {#each categories.list as cat}
                  <option value={cat.id}>{cat.label}</option>
                {/each}
              </select>
              <button
                onclick={() => handleCreateChild(entity.id)}
                class="p-1 text-theme-muted hover:text-theme-primary transition-colors flex items-center justify-center shrink-0"
                title="Create child entity"
                aria-label="Create child entity"
                disabled={isCreatingChild}
              >
                <span class="icon-[lucide--check] w-3.5 h-3.5"></span>
              </button>
              <button
                onclick={() => {
                  inlineCreationParentId = null;
                  newChildTitle = "";
                }}
                class="p-1 text-theme-muted hover:text-theme-primary transition-colors flex items-center justify-center shrink-0"
                title="Cancel"
                aria-label="Cancel"
                disabled={isCreatingChild}
              >
                <span class="icon-[lucide--x] w-3.5 h-3.5"></span>
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
            class="space-y-1 {depth < 5
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

    {#if viewMode === "list"}
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
        <div class="text-center py-10 px-4" data-testid="no-entities-found">
          <p class="text-xs text-theme-muted">No entities found</p>
        </div>
      {/each}
    {:else if viewMode === "label" && groupedEntities?.type === "label"}
      {#each groupedEntities.sortedKeys as label}
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
              {onSelect}
              onDragStart={(e, entityId) => {
                isDragging = true;
                onDragStart?.(e, entityId);
              }}
              onDragEnd={() => {
                isDragging = false;
                onDragEnd?.();
              }}
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
            {onSelect}
            onDragStart={(e, entityId) => {
              isDragging = true;
              onDragStart?.(e, entityId);
            }}
            onDragEnd={() => {
              isDragging = false;
              onDragEnd?.();
            }}
            {onOpenZen}
            {onFindInGraph}
            {onApproveDraft}
            {onRejectDraft}
          />
        {/each}
      {/if}
      {#if filteredEntities.length === 0}
        <div class="text-center py-10 px-4" data-testid="no-entities-found">
          <p class="text-xs text-theme-muted">No entities found</p>
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
