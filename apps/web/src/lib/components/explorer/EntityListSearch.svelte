<script lang="ts">
  import { untrack } from "svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { explorerUIStore } from "$lib/stores/ui/explorer-ui.svelte";

  let {
    searchQuery = $bindable(""),
  }: {
    searchQuery: string;
  } = $props();

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
    // ⚡ Bolt Optimization: Replace chained .filter().slice() with a bounded imperative loop
    // to avoid intermediate array allocations and reduce GC overhead during rapid keystrokes.
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

  // Sync from searchQuery to explorerUIStore.labelFilters (extracting fully matched label tokens and stripping them)
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
</script>

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
