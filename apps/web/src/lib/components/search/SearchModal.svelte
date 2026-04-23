<script lang="ts">
  import { tick } from "svelte";
  import { searchStore } from "$lib/stores/search.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import type { SearchResult } from "schema";
  import { renderMarkdown } from "$lib/utils/markdown";
  import { page } from "$app/state";
  import {
    DEFAULT_SEARCH_ENTITY_ZOOM,
    dispatchSearchEntityFocus,
    resolveSearchResultEntityId,
  } from "./search-focus";

  let inputElement = $state<HTMLInputElement>();
  let resultsContainer = $state<HTMLDivElement>();
  let debounceTimer: ReturnType<typeof setTimeout>;

  const isCanvasPage = $derived(page.url.pathname.startsWith("/canvas"));
  const hasLeftSidebar = $derived(uiStore.leftSidebarOpen);
  const hasEntityPanel = $derived(Boolean(vault.selectedEntityId));
  let overlayClass = $derived(
    `fixed z-[95] flex items-start justify-center bg-black/50 backdrop-blur-sm max-md:inset-x-0 max-md:top-[var(--header-height,65px)] max-md:bottom-14 ${
      hasLeftSidebar ? "md:left-96" : "md:left-0"
    } ${hasEntityPanel ? "md:right-[400px] lg:right-[450px]" : "md:right-0"} md:top-[var(--header-height,65px)] md:bottom-0 ${
      hasLeftSidebar || hasEntityPanel ? "px-4 pt-[12vh]" : "pt-[15vh]"
    }`,
  );
  let dialogClass = $derived(
    "w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-lg shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[70vh] font-body",
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
      searchStore.close();
      event.preventDefault();
      return;
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

    const selectedEntityId = resolveSearchResultEntityId(result);

    if (!selectedEntityId) {
      console.warn("Search result missing ID and path:", result);
      console.error("CRITICAL: Selected a search result with no ID or path!");
      return;
    }

    dispatchSearchEntityFocus(selectedEntityId, DEFAULT_SEARCH_ENTITY_ZOOM);
    vault.selectedEntityId = selectedEntityId;
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

  const handleBackdropClick = (event: MouseEvent) => {
    if (event.target === event.currentTarget) {
      searchStore.close();
    }
  };
</script>

{#if searchStore.isOpen}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class={overlayClass}
    onclick={handleBackdropClick}
    onkeydown={(e) => e.key === "Escape" && searchStore.close()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    data-testid="search-modal"
    data-layout={hasLeftSidebar || hasEntityPanel ? "main" : "global"}
  >
    <div class={dialogClass}>
      <!-- Input Header -->
      <div class="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div class="relative">
          <span
            aria-hidden="true"
            class="absolute left-3 top-1/2 -translate-y-1/2 icon-[heroicons--magnifying-glass] w-5 h-5 text-zinc-400"
          ></span>
          <input
            bind:this={inputElement}
            type="text"
            value={searchStore.query}
            oninput={handleInput}
            onkeydown={handleKeydown}
            placeholder="Search notes..."
            class="w-full pl-10 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-none rounded-md focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={searchStore.results.length > 0
              ? "search-results-list"
              : undefined}
            aria-label="Search notes"
            data-testid="search-modal-input"
            aria-activedescendant={searchStore.results.length > 0
              ? `search-result-${searchStore.selectedIndex}`
              : undefined}
          />
        </div>
      </div>

      <!-- Results List -->
      <div class="flex-1 overflow-y-auto p-2">
        {#if searchStore.results.length === 0 && searchStore.query}
          <div
            class="p-12 flex flex-col items-center justify-center gap-3 text-zinc-500"
            role="status"
          >
            <span
              class="icon-[heroicons--magnifying-glass-minus] w-12 h-12 opacity-50"
            ></span>
            <div class="text-sm">
              We couldn't find any notes matching "<span
                class="font-medium text-zinc-900 dark:text-zinc-100"
                >{searchStore.query}</span
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
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100'}"
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

                  {#if result.status === 'draft'}
                    <span class="ml-2 px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[9px] font-bold uppercase tracking-wider text-zinc-500 border border-zinc-300 dark:border-zinc-700">
                      Draft
                    </span>
                  {/if}

                  {#if isCanvasPage}
                    <button
                      class="ml-auto p-1.5 rounded-md bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all text-[10px] font-bold uppercase font-header tracking-wider flex items-center gap-1 group/btn"
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
                <div class="flex items-center gap-2 text-xs text-zinc-500">
                  {#if result.type}
                    <span
                      class="px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase font-header tracking-wider bg-zinc-100 dark:bg-zinc-800"
                      style="color: {categories.getColor(result.type)}"
                    >
                      {categories.getCategory(result.type)?.label ||
                        result.type}
                    </span>
                  {/if}
                  <span class="truncate">{result.path}</span>
                </div>
                {#if result.excerpt}
                  <p
                    class="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-1"
                  >
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
        class="px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 flex justify-between"
      >
        <span
          ><kbd class="font-body px-1 bg-zinc-200 dark:bg-zinc-800 rounded"
            >↵</kbd
          > to select</span
        >
        <span
          ><kbd class="font-body px-1 bg-zinc-200 dark:bg-zinc-800 rounded"
            >↑↓</kbd
          > to navigate</span
        >
        <span
          ><kbd class="font-body px-1 bg-zinc-200 dark:bg-zinc-800 rounded"
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
    @apply bg-zinc-200 dark:bg-zinc-800 px-1 rounded font-mono text-[0.9em];
  }
  .preview-content :global(strong) {
    @apply font-bold text-zinc-900 dark:text-zinc-100;
  }
  .preview-content :global(em) {
    @apply italic;
  }
</style>
