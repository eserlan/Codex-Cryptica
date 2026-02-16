<script lang="ts">
  import { searchService } from "$lib/services/search";
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import type { SearchResult } from "schema";
  import { isEntityVisible } from "schema";
  import { ui } from "$lib/stores/ui.svelte";
  import { onDestroy } from "svelte";

  let {
    value = $bindable(""),
    selectedId = $bindable<string | null>(null),
    placeholder = "Search entities...",
    minChars = 3,
  } = $props<{
    value?: string;
    selectedId?: string | null;
    placeholder?: string;
    minChars?: number;
  }>();

  let results = $state<SearchResult[]>([]);
  let selectedIndex = $state(0);
  let showResults = $state(false);
  let isLoading = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  onDestroy(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  const handleInput = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const query = target.value;
    value = query;
    selectedId = null;

    clearTimeout(debounceTimer);
    if (query.length < minChars) {
      results = [];
      showResults = false;
      return;
    }

    debounceTimer = setTimeout(async () => {
      isLoading = true;
      try {
        const rawResults = await searchService.search(query, { limit: 10 });

        // Filter results based on visibility settings (same as searchStore)
        const settings = {
          sharedMode: ui.sharedMode,
          defaultVisibility: vault.defaultVisibility,
        };

        results = rawResults.filter((result) => {
          const entity = vault.entities[result.id];
          if (!entity) return false;
          return isEntityVisible(entity, settings);
        });

        showResults = results.length > 0;
        selectedIndex = 0;
      } catch (err) {
        console.error("Autocomplete search failed:", err);
        results = [];
      } finally {
        isLoading = false;
      }
    }, 200);
  };

  const selectResult = (result: SearchResult) => {
    value = result.title;
    selectedId = result.id;
    showResults = false;
    results = [];
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!showResults) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % results.length;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + results.length) % results.length;
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectResult(results[selectedIndex]);
    } else if (e.key === "Escape") {
      showResults = false;
    }
  };
</script>

<div class="relative w-full">
  <input
    type="text"
    {value}
    {placeholder}
    oninput={handleInput}
    onkeydown={handleKeyDown}
    onblur={() => setTimeout(() => (showResults = false), 200)}
    onfocus={() => {
      if (results.length > 0) showResults = true;
    }}
    class="w-full bg-theme-bg/50 border border-theme-border rounded px-3 py-2 text-sm text-theme-text placeholder-theme-text/40 focus:outline-none focus:border-theme-primary transition-all font-mono"
  />

  {#if showResults}
    <div
      class="absolute z-50 w-full mt-1 bg-theme-surface border border-theme-border rounded shadow-xl max-h-60 overflow-y-auto"
    >
      {#each results as result, i}
        <button
          class="w-full text-left px-3 py-2 flex items-center gap-2 transition-colors
            {i === selectedIndex
            ? 'bg-theme-primary/20 text-theme-primary'
            : 'hover:bg-theme-bg/50 text-theme-text'}"
          onclick={() => selectResult(result)}
        >
          {#if result.type}
            <span
              class="{getIconClass(
                categories.getCategory(result.type)?.icon,
              )} w-3.5 h-3.5 shrink-0"
              style="color: {categories.getColor(result.type)}"
            ></span>
          {/if}
          <span class="truncate text-xs">{result.title}</span>
          {#if result.type}
            <span
              class="ml-auto text-[9px] uppercase opacity-50 font-bold tracking-widest"
            >
              {categories.getCategory(result.type)?.label || result.type}
            </span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}

  {#if isLoading}
    <div class="absolute right-3 top-1/2 -translate-y-1/2">
      <div
        class="w-3 h-3 border-2 border-theme-primary/30 border-t-theme-primary rounded-full animate-spin"
      ></div>
    </div>
  {/if}
</div>
