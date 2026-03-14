<script lang="ts">
  import { onMount } from "svelte";
  import { vault } from "../../stores/vault.svelte";
  import { fade, scale } from "svelte/transition";
  import type { Entity } from "schema";

  let { onSelect, onCancel } = $props<{
    onSelect: (entityId: string) => void;
    onCancel: () => void;
  }>();

  let query = $state("");
  let inputEl = $state<HTMLInputElement | null>(null);

  let results = $derived.by(() => {
    if (!query) return vault.allEntities.slice(0, 10);

    // ⚡ Bolt Optimization: Replace full array .filter().slice() with an early-exit imperative loop.
    // Cache allEntities once to avoid repeated getter allocations (Object.values) on each iteration.
    const maxResults = 10;
    const lowerQuery = query.toLowerCase();
    const allEntities = vault.allEntities;
    const matches: Entity[] = [];

    for (let i = 0; i < allEntities.length; i++) {
      const e = allEntities[i];
      if (e.title.toLowerCase().includes(lowerQuery)) {
        matches.push(e);
        if (matches.length === maxResults) break;
      }
    }
    return matches;
  });

  onMount(() => {
    inputEl?.focus();
  });
</script>

<div
  class="fixed inset-0 z-[100] bg-theme-bg/60 backdrop-blur-sm flex items-center justify-center p-4"
  transition:fade
>
  <div
    class="w-full max-w-md bg-theme-surface border border-theme-border rounded-xl shadow-2xl overflow-hidden"
    transition:scale
  >
    <header
      class="p-4 border-b border-theme-border flex justify-between items-center bg-theme-bg/20"
    >
      <h3
        class="text-sm font-bold text-theme-text uppercase font-header tracking-widest font-mono"
      >
        Link Lore Pin
      </h3>
      <button
        onclick={onCancel}
        class="text-theme-muted hover:text-theme-primary"
        aria-label="Cancel pin linking"
      >
        <span class="icon-[lucide--x] w-5 h-5"></span>
      </button>
    </header>

    <div class="p-4">
      <input
        bind:this={inputEl}
        type="text"
        bind:value={query}
        placeholder="Search for an entity..."
        class="w-full bg-theme-bg border border-theme-border text-theme-text px-4 py-2 rounded-lg focus:border-theme-primary outline-none transition-colors mb-4 text-sm"
      />

      <div class="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
        {#each results as entity}
          <button
            class="w-full text-left px-4 py-3 rounded-lg hover:bg-theme-primary/10 group transition-colors flex items-center gap-3 border border-transparent hover:border-theme-primary/30"
            onclick={() => onSelect(entity.id)}
          >
            <div
              class="w-8 h-8 rounded bg-theme-bg flex items-center justify-center border border-theme-border group-hover:border-theme-primary/50"
            >
              <span
                class="icon-[lucide--file-text] text-theme-muted group-hover:text-theme-primary"
              ></span>
            </div>
            <div>
              <div
                class="text-xs font-bold text-theme-text group-hover:text-theme-primary"
              >
                {entity.title}
              </div>
              <div
                class="text-[10px] text-theme-muted uppercase tracking-tighter"
              >
                {entity.type}
              </div>
            </div>
          </button>
        {:else}
          <div class="text-center py-8 text-theme-muted text-xs italic">
            No entities found matching "{query}"
          </div>
        {/each}
      </div>
    </div>

    <footer class="p-4 bg-theme-bg/10 flex justify-end gap-3">
      <button
        class="px-4 py-2 text-xs font-bold text-theme-muted hover:text-theme-text transition-colors uppercase font-header tracking-widest"
        onclick={onCancel}
      >
        Skip Linking
      </button>
    </footer>
  </div>
</div>
