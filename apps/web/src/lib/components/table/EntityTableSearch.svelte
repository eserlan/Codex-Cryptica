<script lang="ts">
  import { untrack } from "svelte";
  import { vault } from "$lib/stores/vault.svelte";

  let {
    searchQuery = $bindable(""),
    labelFilters = $bindable<Set<string>>(new Set()),
    placeholder = "Search by name, content, or #label…",
    onSearchChange,
    onLabelFilterChange,
  }: {
    searchQuery?: string;
    labelFilters?: Set<string>;
    placeholder?: string;
    onSearchChange?: (query: string) => void;
    onLabelFilterChange?: (filters: Set<string>) => void;
  } = $props();

  let inputElement = $state<HTMLInputElement | null>(null);
  let isFocused = $state(false);
  let autocompleteDismissed = $state(false);
  let activeIndex = $state(-1);

  // Unique labels in the current vault
  const uniqueLabels = $derived.by(() => {
    const labelsSet = new Set<string>();
    const entities = vault.allEntities || [];
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      const effectiveLabels: string[] = e.labels?.length
        ? e.labels
        : ((e as { tags?: string[] }).tags ?? []);
      for (let j = 0; j < effectiveLabels.length; j++) {
        if (effectiveLabels[j]) {
          labelsSet.add(effectiveLabels[j]);
        }
      }
    }
    return Array.from(labelsSet).sort((a, b) =>
      (a ?? "").localeCompare(b ?? ""),
    );
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
    const result: string[] = [];
    for (const label of uniqueLabels) {
      if (label.toLowerCase().includes(autocompleteSearch)) {
        result.push(label);
        if (result.length >= 10) break;
      }
    }
    return result;
  });

  // Reset dismissed state when the word being typed changes
  $effect(() => {
    const _word = activeWord;
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

  $effect(() => {
    if (!showAutocomplete || suggestions.length === 0) {
      activeIndex = -1;
    } else if (activeIndex >= suggestions.length) {
      activeIndex = suggestions.length - 1;
    }
  });

  // Sync from searchQuery to table's local labelFilters (extracting fully matched label tokens and stripping them)
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
        // Add parsed labels to table's active filters
        const currentFilters = new Set(labelFilters);
        let changed = false;
        for (const pl of parsedLabels) {
          if (!currentFilters.has(pl)) {
            currentFilters.add(pl);
            changed = true;
          }
        }
        if (changed) {
          labelFilters = currentFilters;
          onLabelFilterChange?.(currentFilters);
        }

        // Update searchQuery without the label tokens
        const nextQuery =
          cleanTokens.join(" ") + (query.endsWith(" ") ? " " : "");
        searchQuery = nextQuery;
        onSearchChange?.(nextQuery);
      });
    }
  });

  function selectLabel(label: string) {
    const words = searchQuery.split(/\s+/);
    if (words.length > 0) {
      words.pop();
    }
    // Auto-apply selected label to table's active label filters
    const currentFilters = new Set(labelFilters);
    if (!currentFilters.has(label)) {
      currentFilters.add(label);
      labelFilters = currentFilters;
      onLabelFilterChange?.(currentFilters);
    }
    const nextQuery = words.join(" ").trim() + (words.length > 0 ? " " : "");
    searchQuery = nextQuery;
    onSearchChange?.(nextQuery);
    inputElement?.focus();
  }

  function clearSearch() {
    searchQuery = "";
    onSearchChange?.("");
    inputElement?.focus();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (showAutocomplete && suggestions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        activeIndex = (activeIndex + 1) % suggestions.length;
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        activeIndex =
          (activeIndex - 1 + suggestions.length) % suggestions.length;
      } else if (event.key === "Enter" || event.key === "Tab") {
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          event.preventDefault();
          event.stopPropagation();
          selectLabel(suggestions[activeIndex]);
        } else if (event.key === "Tab" && suggestions.length > 0) {
          event.preventDefault();
          event.stopPropagation();
          selectLabel(suggestions[0]);
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        autocompleteDismissed = true;
      }
    }
  }
</script>

<div class="relative min-w-0 flex-1 max-w-md">
  <span
    class="icon-[lucide--search] pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-muted"
    aria-hidden="true"
  ></span>
  <input
    bind:this={inputElement}
    type="search"
    bind:value={searchQuery}
    oninput={(e) =>
      onSearchChange?.((e.currentTarget as HTMLInputElement).value)}
    onfocus={() => (isFocused = true)}
    onblur={() => setTimeout(() => (isFocused = false), 200)}
    onkeydown={handleKeyDown}
    {placeholder}
    aria-label="Search entities"
    aria-autocomplete="list"
    aria-expanded={showAutocomplete}
    aria-controls={showAutocomplete
      ? "table-search-autocomplete-list"
      : undefined}
    role="combobox"
    data-testid="entity-table-search"
    class="w-full rounded-lg border border-theme-border bg-theme-surface py-1.5 md:py-2 pl-9 pr-9 text-sm text-theme-text placeholder:text-theme-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40"
  />
  {#if searchQuery}
    <button
      type="button"
      onclick={clearSearch}
      class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-theme-muted hover:text-theme-text transition-colors"
      title="Clear search"
      aria-label="Clear search"
      data-testid="entity-table-search-clear"
    >
      <span aria-hidden="true" class="icon-[lucide--x] w-3.5 h-3.5"></span>
    </button>
  {/if}

  {#if showAutocomplete && suggestions.length > 0}
    <div
      id="table-search-autocomplete-list"
      role="listbox"
      aria-label="Label suggestions"
      data-testid="table-search-autocomplete"
      class="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg border border-theme-border bg-theme-surface/95 backdrop-blur-md p-1 shadow-lg"
    >
      {#each suggestions as label, index}
        <button
          type="button"
          role="option"
          aria-selected={activeIndex === index}
          data-testid="table-search-autocomplete-option"
          onmousedown={(e) => e.preventDefault()}
          onclick={() => selectLabel(label)}
          class="w-full text-left px-3 py-2 text-xs rounded-md hover:bg-theme-primary/10 text-theme-text hover:text-theme-primary font-mono transition-colors flex items-center gap-1.5 {activeIndex ===
          index
            ? 'bg-theme-primary/10 text-theme-primary'
            : ''}"
          ><span class="text-theme-primary/60 shrink-0"
            >{autocompletePrefix}</span
          ><span class="truncate min-w-0 uppercase">{label}</span></button
        >
      {/each}
    </div>
  {/if}
</div>
