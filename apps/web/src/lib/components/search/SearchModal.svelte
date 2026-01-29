<script lang="ts">
  import { tick } from "svelte";
  import { searchStore } from "$lib/stores/search";
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import { goto } from "$app/navigation";
  import type { SearchResult } from "schema";
  import { marked } from "marked";
  import DOMPurify from "isomorphic-dompurify";

  let inputElement: HTMLInputElement;
  let resultsContainer: HTMLDivElement;
  let debounceTimer: ReturnType<typeof setTimeout>;

  // Auto-focus input when modal opens
  $: if ($searchStore.isOpen && inputElement) {
    tick().then(() => inputElement.focus());
  }

  const handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const value = target.value;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchStore.setQuery(value);
    }, 150); // 150ms debounce
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (!$searchStore.isOpen) return;

    if (event.key === "Escape") {
      searchStore.close();
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowDown") {
      searchStore.setSelectedIndex($searchStore.selectedIndex + 1);
      scrollToSelected();
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowUp") {
      searchStore.setSelectedIndex($searchStore.selectedIndex - 1);
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

    if (!result.id) {
      console.warn(
        "Search result missing ID, falling back to path lookup:",
        result,
      );
      // Fallback: If we have a path, derive an ID from the basename without the .md extension
      if (result.path) {
        const pathSegments = result.path.split("/");
        const basename = pathSegments[pathSegments.length - 1] || result.path;
        const derivedId = basename.replace(/\.md$/, "");
        vault.selectedEntityId = derivedId;
      } else {
        console.error("CRITICAL: Selected a search result with no ID or path!");
        return;
      }
    } else {
      vault.selectedEntityId = result.id;
    }

    searchStore.close();

    // Navigate (optional, but keep for now)
    goto(`?file=${encodeURIComponent(result.path)}`);
  };

  const scrollToSelected = () => {
    if (!resultsContainer) return;
    const selectedEl = resultsContainer.children[
      $searchStore.selectedIndex
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

  const highlightText = (text: string, query: string) => {
    if (!query || !text) return text;
    // Escape regex characters in query (canonical)
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${safeQuery})`, "gi");
    // Note: We don't sanitize here yet, we sanitize the final HTML
    return text.replace(
      regex,
      '<mark class="bg-yellow-200 dark:bg-yellow-900/50 text-inherit rounded-sm px-0.5">$1</mark>',
    );
  };

  const renderMarkdown = (text: string, query: string) => {
    if (!text) return "";

    // 1. Highlight matches (injects <mark> tags into raw text)
    const highlighted = highlightText(text, query);

    // 2. Parse markdown to HTML
    const rawHtml = marked.parseInline(highlighted) as string;

    // 3. Sanitize the resulting HTML, allowing <mark> tags
    // we assume marked might return a promise if async, but parseInline is usually sync.
    // Typescript might complain if marked.async is true, but standard usage is string.
    return DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ["mark"],
      ADD_ATTR: ["class"],
    });
  };
</script>

{#if $searchStore.isOpen}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
    on:click={handleBackdropClick}
    on:keydown={(e) => e.key === "Escape" && searchStore.close()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div
      class="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-lg shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[70vh]"
    >
      <!-- Input Header -->
      <div class="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div class="relative">
          <span
            class="absolute left-3 top-1/2 -translate-y-1/2 icon-[heroicons--magnifying-glass] w-5 h-5 text-zinc-400"
          ></span>
          <input
            bind:this={inputElement}
            type="text"
            value={$searchStore.query}
            on:input={handleInput}
            on:keydown={handleKeydown}
            placeholder="Search notes..."
            class="w-full pl-10 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-none rounded-md focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500"
          />
        </div>
      </div>

      <!-- Results List -->
      <div
        bind:this={resultsContainer}
        class="flex-1 overflow-y-auto p-2 space-y-1"
      >
        {#if $searchStore.results.length === 0 && $searchStore.query}
          <div class="p-8 text-center text-zinc-500">
            No results found for "{$searchStore.query}"
          </div>
        {:else if $searchStore.results.length > 0}
          {#each $searchStore.results as result, index (result.id || `fallback-${index}`)}
            <button
              class="w-full text-left px-4 py-3 rounded-md flex flex-col gap-1 transition-colors preview-content
                {index === $searchStore.selectedIndex
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100'}"
              on:click={(e) => selectResult(result, e)}
              data-testid="search-result"
            >
              <span class="font-medium truncate flex items-center gap-2">
                {#if result.type}
                  <span
                    class="{getIconClass(
                      categories.getCategory(result.type)?.icon,
                    )} w-3.5 h-3.5 shrink-0"
                    style="color: {categories.getColor(result.type)}"
                  ></span>
                {/if}
                {@html renderMarkdown(result.title, $searchStore.query)}
              </span>
              <div class="flex items-center gap-2 text-xs text-zinc-500">
                {#if result.type}
                  <span
                    class="px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800"
                    style="color: {categories.getColor(result.type)}"
                  >
                    {categories.getCategory(result.type)?.label || result.type}
                  </span>
                {/if}
                <span class="truncate">{result.path}</span>
              </div>
              {#if result.excerpt}
                <p
                  class="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-1"
                >
                  {@html renderMarkdown(result.excerpt, $searchStore.query)}
                </p>
              {/if}
            </button>
          {/each}
        {/if}
      </div>

      <!-- Footer -->
      <div
        class="px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 flex justify-between"
      >
        <span
          ><kbd class="font-sans px-1 bg-zinc-200 dark:bg-zinc-800 rounded"
            >↵</kbd
          > to select</span
        >
        <span
          ><kbd class="font-sans px-1 bg-zinc-200 dark:bg-zinc-800 rounded"
            >↑↓</kbd
          > to navigate</span
        >
        <span
          ><kbd class="font-sans px-1 bg-zinc-200 dark:bg-zinc-800 rounded"
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
