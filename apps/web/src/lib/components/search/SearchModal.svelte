<script lang="ts">
  import { tick, untrack } from "svelte";
  import { searchStore } from "$lib/stores/search.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import type { SearchResult } from "schema";
  import { renderMarkdown } from "$lib/utils/markdown";
  import { page } from "$app/state";
  import { base } from "$app/paths";
  import {
    DEFAULT_SEARCH_ENTITY_ZOOM,
    dispatchSearchEntityFocus,
    resolveSearchResultEntityId,
  } from "./search-focus";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { explorerUIStore } from "$lib/stores/ui/explorer-ui.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

  let inputElement = $state<HTMLInputElement>();
  let resultsContainer = $state<HTMLDivElement>();
  let debounceTimer: ReturnType<typeof setTimeout>;

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

  // Autocomplete state
  let isFocused = $state(false);
  let autocompleteDismissed = $state(false);
  let autocompleteActiveIndex = $state(-1);

  const activeWord = $derived.by(() => {
    const query = searchStore.query;
    if (!query) return "";
    const words = query.split(/\s+/);
    return words[words.length - 1] || "";
  });

  const isLabelAutocompleteActive = $derived(
    activeWord.startsWith("#") || activeWord.startsWith("@"),
  );

  const autocompletePrefix = $derived(activeWord[0] || "");
  const autocompleteSearch = $derived(activeWord.slice(1).toLowerCase());

  const suggestions = $derived.by(() => {
    if (!isLabelAutocompleteActive) return [];

    const matches: string[] = [];
    for (const label of uniqueLabels) {
      if (label.toLowerCase().includes(autocompleteSearch)) {
        matches.push(label);
        if (matches.length >= 10) break;
      }
    }
    return matches;
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

  $effect(() => {
    if (!showAutocomplete || suggestions.length === 0) {
      autocompleteActiveIndex = -1;
    } else if (autocompleteActiveIndex >= suggestions.length) {
      autocompleteActiveIndex = suggestions.length - 1;
    }
  });

  function selectLabel(label: string) {
    const query = searchStore.query;
    const words = query.split(/\s+/);
    if (words.length > 0) {
      words.pop(); // Remove the autocomplete prefix (e.g. #p)
    }
    const newQuery = words.join(" ").trim() + (words.length > 0 ? " " : "");
    searchStore.setQuery(newQuery);
    // Keep focus
    inputElement?.focus();

    // Auto-apply selected label to active filters
    if (!explorerUIStore.labelFilters.has(label)) {
      explorerUIStore.toggleLabelFilter(label, true);
    }
  }

  // Match the route segment exactly (not just a prefix) so e.g. `/tablet`
  // doesn't get mistaken for `/table`, and account for a non-empty
  // SvelteKit `base` path.
  const escapedBase = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const isCanvasPage = $derived(
    new RegExp(`^${escapedBase}/canvas(?:/|$)`).test(page.url.pathname),
  );
  const isTablePage = $derived(
    new RegExp(`^${escapedBase}/table(?:/|$)`).test(page.url.pathname),
  );
  const hasLeftSidebar = $derived(layoutUIStore.leftSidebarOpen);
  const hasEntityPanel = $derived(Boolean(vault.selectedEntityId));
  let overlayClass = $derived(
    `fixed z-[95] flex items-start justify-center bg-black/50 backdrop-blur-sm max-md:inset-x-0 max-md:top-[var(--header-height,65px)] max-md:bottom-14 ${
      hasLeftSidebar ? "md:left-96" : "md:left-0"
    } ${hasEntityPanel ? "md:right-[400px] lg:right-[450px]" : "md:right-0"} md:top-[var(--header-height,65px)] md:bottom-0 ${
      hasLeftSidebar || hasEntityPanel ? "px-4 pt-[12vh]" : "pt-[15vh]"
    }`,
  );
  let dialogClass = $derived(
    "w-full max-w-2xl bg-chrome-surface rounded-lg shadow-2xl overflow-hidden border border-chrome-border flex flex-col max-h-[70vh] font-body",
  );

  // Auto-focus input when modal opens; clear pending debounce when closed
  $effect(() => {
    if (searchStore.isOpen) {
      tick().then(() => inputElement?.focus());
    } else {
      clearTimeout(debounceTimer);
    }
  });

  const handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const value = target.value;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchStore.setQuery(value);
    }, 150); // 150ms debounce
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (!searchStore.isOpen) return;

    if (event.key === "Escape") {
      if (showAutocomplete) {
        autocompleteDismissed = true;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      searchStore.close();
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (showAutocomplete && suggestions.length > 0) {
      if (event.key === "ArrowDown") {
        autocompleteActiveIndex =
          (autocompleteActiveIndex + 1) % suggestions.length;
        event.preventDefault();
        return;
      }

      if (event.key === "ArrowUp") {
        autocompleteActiveIndex =
          (autocompleteActiveIndex - 1 + suggestions.length) %
          suggestions.length;
        event.preventDefault();
        return;
      }

      if (event.key === "Enter" || event.key === "Tab") {
        if (
          autocompleteActiveIndex >= 0 &&
          autocompleteActiveIndex < suggestions.length
        ) {
          event.preventDefault();
          selectLabel(suggestions[autocompleteActiveIndex]);
          return;
        } else if (event.key === "Tab" && suggestions.length > 0) {
          event.preventDefault();
          selectLabel(suggestions[0]);
          return;
        }
      }
    }

    if (event.key === "ArrowDown") {
      searchStore.setSelectedIndex(searchStore.selectedIndex + 1);
      scrollToSelected();
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowUp") {
      searchStore.setSelectedIndex(searchStore.selectedIndex - 1);
      scrollToSelected();
      event.preventDefault();
      return;
    }

    if (event.key === "Enter") {
      const selected = searchStore.selectCurrent();
      if (selected) {
        selectResult(selected as SearchResult, event);
      }
      return;
    }
  };

  const selectResult = (result: SearchResult, event?: Event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (event && event instanceof MouseEvent) {
      layoutUIStore.setLastSelectedNodePosition({
        x: event.clientX,
        y: event.clientY,
      });
    } else {
      layoutUIStore.setLastSelectedNodePosition(null);
    }

    if (result.type === "quicknote" || result.id?.startsWith("quicknote-")) {
      const noteIdStr = result.id.replace("quicknote-", "");
      const noteId = parseInt(noteIdStr, 10);
      if (!isNaN(noteId)) {
        import("$lib/stores/quicknote.svelte").then(({ quickNoteStore }) => {
          void quickNoteStore.openNoteById(noteId);
        });
      }
      searchStore.close();
      return;
    }

    const selectedEntityId = resolveSearchResultEntityId(result);

    if (!selectedEntityId) {
      console.warn("Search result missing ID and path:", result);
      console.error("CRITICAL: Selected a search result with no ID or path!");
      return;
    }

    dispatchSearchEntityFocus(selectedEntityId, DEFAULT_SEARCH_ENTITY_ZOOM);
    vault.selectedEntityId = selectedEntityId;
    if (isTablePage) {
      modalUIStore.openZenMode(selectedEntityId);
    }
    searchStore.close();
  };

  const scrollToSelected = () => {
    if (!resultsContainer) return;
    const selectedEl = resultsContainer.children[
      searchStore.selectedIndex
    ] as HTMLElement;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  };
</script>

{#if searchStore.isOpen}
  <div
    class={overlayClass}
    data-testid="search-modal"
    data-layout={hasLeftSidebar || hasEntityPanel ? "main" : "global"}
  >
    <button
      type="button"
      aria-label="Close search"
      class="absolute inset-0 w-full h-full bg-transparent focus-visible:ring-2 focus-visible:ring-inset focus:outline-none cursor-default"
      onclick={searchStore.close}
      onkeydown={(e) => e.key === "Escape" && searchStore.close()}
      tabindex="-1"
    ></button>
    <div
      class="{dialogClass} relative z-10"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onkeydown={handleKeydown}
    >
      <!-- Input Header -->
      <div class="p-4 border-b border-chrome-border">
        <div class="relative">
          <span
            aria-hidden="true"
            class="absolute left-3 top-1/2 -translate-y-1/2 icon-[heroicons--magnifying-glass] w-5 h-5 text-chrome-muted"
          ></span>
          <input
            bind:this={inputElement}
            type="text"
            value={searchStore.query}
            oninput={handleInput}
            onkeydown={handleKeydown}
            onfocus={() => (isFocused = true)}
            onblur={() => setTimeout(() => (isFocused = false), 200)}
            placeholder="Search notes..."
            class="w-full pl-10 pr-4 py-2 bg-chrome-bg border-none rounded-md focus:ring-2 focus:ring-chrome-accent text-chrome-text placeholder-chrome-muted"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={showAutocomplete && suggestions.length > 0
              ? "search-autocomplete-listbox"
              : searchStore.results.length > 0
                ? "search-results-list"
                : undefined}
            aria-label="Search notes"
            data-testid="search-modal-input"
            aria-activedescendant={showAutocomplete &&
            suggestions.length > 0 &&
            autocompleteActiveIndex >= 0
              ? `search-autocomplete-option-${autocompleteActiveIndex}`
              : searchStore.results.length > 0
                ? `search-result-${searchStore.selectedIndex}`
                : undefined}
          />

          {#if showAutocomplete && suggestions.length > 0}
            <div
              id="search-autocomplete-listbox"
              role="listbox"
              aria-label="Autocomplete suggestions"
              class="absolute z-[100] left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg border border-chrome-border bg-chrome-surface/95 backdrop-blur-md p-1 shadow-lg"
            >
              {#each suggestions as label, index}
                <button
                  type="button"
                  id={`search-autocomplete-option-${index}`}
                  role="option"
                  aria-selected={autocompleteActiveIndex === index}
                  onclick={() => selectLabel(label)}
                  class="w-full text-left px-3 py-2 text-xs rounded-md hover:bg-chrome-accent/10 text-chrome-text hover:text-chrome-accent font-mono transition-colors flex items-center gap-1.5 {autocompleteActiveIndex ===
                  index
                    ? 'bg-chrome-accent/10 text-chrome-accent'
                    : ''}"
                >
                  <span class="text-chrome-accent/60">{autocompletePrefix}</span
                  >
                  <span>{label}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>

        {#if explorerUIStore.labelFilters.size > 0}
          <div
            class="flex flex-wrap gap-1.5 mt-3"
            data-testid="active-label-filters"
          >
            {#each Array.from(explorerUIStore.labelFilters) as activeLabel}
              <button
                type="button"
                onclick={() =>
                  explorerUIStore.toggleLabelFilter(activeLabel, true)}
                class="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold font-mono rounded-full bg-chrome-accent/10 text-chrome-accent border border-chrome-accent/20 hover:bg-chrome-accent/20 hover:border-chrome-accent/30 transition-all shadow-sm cursor-pointer"
                title="Click to remove filter"
                aria-label={`Remove ${activeLabel} filter`}
              >
                <span>#{activeLabel}</span>
                <span
                  class="icon-[lucide--x] w-3 h-3 text-chrome-accent/60 hover:text-chrome-accent transition-colors"
                ></span>
              </button>
            {/each}
          </div>
        {/if}
        {#if searchStore.indexProgress.status !== "idle" && searchStore.indexProgress.status !== "ready"}
          <div
            class="mt-3 flex items-center justify-between gap-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-100 dark:border-amber-900"
            role="status"
            data-testid="search-index-progress"
          >
            <span>
              {searchStore.indexProgress.message}
              {#if searchStore.indexProgress.totalCount !== null}
                <span class="font-medium">
                  {searchStore.indexProgress.indexedCount}/{searchStore
                    .indexProgress.totalCount}
                </span>
              {/if}
            </span>
            {#if searchStore.indexProgress.canRetry}
              <button
                type="button"
                class="rounded bg-amber-200 px-2 py-1 font-medium text-amber-950 hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-50 dark:hover:bg-amber-700"
                onclick={() => searchStore.retryIndexing()}
              >
                Retry indexing
              </button>
            {/if}
          </div>
        {:else if searchStore.indexProgress.isPartial}
          <div
            class="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-100 dark:border-amber-900"
            role="status"
            data-testid="search-index-progress"
          >
            Search is still indexing. Results may be incomplete.
          </div>
        {/if}
      </div>

      <!-- Results List -->
      <div class="flex-1 overflow-y-auto p-2">
        {#if searchStore.results.length === 0 && searchStore.query}
          <div
            class="p-12 flex flex-col items-center justify-center gap-3 text-chrome-muted"
            role="status"
          >
            <span
              class="icon-[heroicons--magnifying-glass-minus] w-12 h-12 opacity-50"
            ></span>
            <div class="text-sm">
              We couldn't find any notes matching "<span
                class="font-medium text-chrome-text">{searchStore.query}</span
              >"
            </div>
          </div>
        {:else if searchStore.results.length > 0}
          <div
            bind:this={resultsContainer}
            class="space-y-1"
            role="listbox"
            id="search-results-list"
            aria-label="Search results"
          >
            {#each searchStore.results as result, index (result.id || `fallback-${index}`)}
              <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
              <div
                id="search-result-{index}"
                role="option"
                tabindex="-1"
                aria-selected={index === searchStore.selectedIndex}
                class="w-full text-left px-4 py-3 rounded-md flex flex-col gap-1 transition-colors preview-content cursor-pointer
                  {index === searchStore.selectedIndex
                  ? 'bg-chrome-accent/10 text-chrome-accent'
                  : 'hover:bg-chrome-muted/10 text-chrome-text'}"
                onclick={(e) => selectResult(result, e)}
                onkeydown={(e) => e.key === "Enter" && selectResult(result, e)}
                data-testid="search-result"
              >
                <span class="font-medium truncate flex items-center gap-2">
                  {#if result.type}
                    <span
                      aria-hidden="true"
                      class="{getIconClass(
                        categories.getCategory(result.type)?.icon,
                      )} w-3.5 h-3.5 shrink-0"
                      style="color: {categories.getColor(result.type)}"
                    ></span>
                  {/if}
                  {@html renderMarkdown(result.title, {
                    query: searchStore.query,
                    inline: true,
                  })}

                  {#if result.status === "draft"}
                    <span
                      class="ml-2 px-1.5 py-0.5 rounded bg-chrome-bg text-[9px] font-bold uppercase tracking-wider text-chrome-muted border border-chrome-border"
                    >
                      Draft
                    </span>
                  {/if}

                  {#if isCanvasPage}
                    <button
                      class="ml-auto p-1.5 rounded-md bg-chrome-accent/10 text-chrome-accent hover:bg-chrome-accent hover:text-chrome-surface transition-all text-[10px] font-bold uppercase font-header tracking-wider flex items-center gap-1 group/btn"
                      aria-label={`Add ${result.title} to canvas`}
                      onclick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (result.id) {
                          window.dispatchEvent(
                            new CustomEvent("add-to-canvas", {
                              detail: { entityId: result.id },
                            }),
                          );
                          searchStore.close();
                        }
                      }}
                    >
                      <span class="icon-[heroicons--plus-circle] w-3 h-3"
                      ></span>
                      Add to Canvas
                    </button>
                  {/if}
                </span>
                <div class="flex items-center gap-2 text-xs text-chrome-muted">
                  {#if result.type}
                    <span
                      class="px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase font-header tracking-wider bg-chrome-bg"
                      style="color: {categories.getColor(result.type)}"
                    >
                      {categories.getCategory(result.type)?.label ||
                        result.type}
                    </span>
                  {/if}
                  <span class="truncate">{result.path}</span>
                </div>
                {#if result.excerpt}
                  <p class="text-sm text-chrome-text/80 line-clamp-2 mt-1">
                    {@html renderMarkdown(result.excerpt, {
                      query: searchStore.query,
                      inline: true,
                    })}
                  </p>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div
        class="px-4 py-2 bg-chrome-bg border-t border-chrome-border text-xs text-chrome-muted flex justify-between"
      >
        <span
          ><kbd
            class="font-body px-1 bg-chrome-surface border border-chrome-border rounded"
            >↵</kbd
          > to select</span
        >
        <span
          ><kbd
            class="font-body px-1 bg-chrome-surface border border-chrome-border rounded"
            >↑↓</kbd
          > to navigate</span
        >
        <span
          ><kbd
            class="font-body px-1 bg-chrome-surface border border-chrome-border rounded"
            >esc</kbd
          > to close</span
        >
      </div>
    </div>
  </div>
{/if}

<style>
  @reference "../../../app.css";

  .preview-content :global(code) {
    @apply bg-chrome-bg px-1 rounded font-mono text-[0.9em];
  }
  .preview-content :global(strong) {
    @apply font-bold text-chrome-text;
  }
  .preview-content :global(em) {
    @apply italic;
  }
</style>
