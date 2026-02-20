<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { fade } from "svelte/transition";
  import { untrack } from "svelte";

  let {
    entityId,
    placeholder = "Add label...",
  }: {
    entityId: string;
    placeholder?: string;
  } = $props();

  let inputValue = $state("");
  let showSuggestions = $state(false);
  let selectedIndex = $state(-1);

  let suggestions = $derived.by(() => {
    const query = inputValue.trim().toLowerCase();
    if (!query) return [];
    const currentLabels = (vault.entities[entityId]?.labels || []).map((l) =>
      l.toLowerCase(),
    );
    return vault.labelIndex
      .filter(
        (l) =>
          l.toLowerCase().includes(query) &&
          !currentLabels.includes(l.toLowerCase()),
      )
      .slice(0, 5);
  });

  $effect(() => {
    const trimmed = inputValue.trim();
    untrack(() => {
      if (trimmed) {
        showSuggestions = true;
      }
      selectedIndex = -1;
    });
  });

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const label =
        selectedIndex >= 0 ? suggestions[selectedIndex] : inputValue.trim();
      if (label) {
        vault.addLabel(entityId, label);
        inputValue = "";
        showSuggestions = false;
        selectedIndex = -1;
      }
    } else if (e.key === "Tab") {
      if (showSuggestions && suggestions.length > 0) {
        e.preventDefault();
        // Use selected item or first item if none selected
        const label =
          selectedIndex >= 0 && selectedIndex < suggestions.length
            ? suggestions[selectedIndex]
            : suggestions[0];
        vault.addLabel(entityId, label);
        inputValue = "";
        showSuggestions = false;
        selectedIndex = -1;
      }
    } else if (e.key === "ArrowDown") {
      if (showSuggestions && suggestions.length > 0) {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % suggestions.length;
      }
    } else if (e.key === "ArrowUp") {
      if (showSuggestions && suggestions.length > 0) {
        e.preventDefault();
        selectedIndex =
          (selectedIndex - 1 + suggestions.length) % suggestions.length;
      }
    } else if (e.key === "Escape") {
      showSuggestions = false;
      selectedIndex = -1;
    }
  };

  const selectSuggestion = (label: string) => {
    vault.addLabel(entityId, label);
    inputValue = "";
    showSuggestions = false;
    selectedIndex = -1;
  };
</script>

<div class="relative flex-1">
  <input
    type="text"
    bind:value={inputValue}
    {placeholder}
    onkeydown={handleKeydown}
    onfocus={() => (showSuggestions = true)}
    onblur={() => setTimeout(() => (showSuggestions = false), 200)}
    class="w-full bg-theme-bg/50 border border-theme-border rounded px-2 py-1 text-[10px] text-theme-text outline-none focus:border-theme-primary transition-all font-mono placeholder-theme-muted/50"
  />

  {#if showSuggestions && suggestions.length > 0}
    <div
      class="absolute bottom-full left-0 mb-1 w-full bg-theme-surface border border-theme-border rounded shadow-xl z-30 overflow-hidden"
      transition:fade={{ duration: 100 }}
    >
      {#each suggestions as _label, i}
        <button
          onclick={() => selectSuggestion(_label)}
          class="w-full px-2 py-1.5 text-left text-[10px] font-mono transition-colors border-b border-theme-border/50 last:border-0
            {i === selectedIndex
            ? 'bg-theme-primary/20 text-theme-primary'
            : 'text-theme-muted hover:bg-theme-primary/10 hover:text-theme-primary'}"
        >
          {_label}
        </button>
      {/each}
    </div>
  {/if}
</div>
