<script lang="ts">
  import type { BiomeExplorerStore } from "$lib/stores/biome-explorer.svelte";

  type Tab = "library" | "compare";

  let {
    store,
    onSelect,
  }: { store: BiomeExplorerStore; onSelect: (tab: Tab) => void } = $props();

  const tabs = $derived<{ id: Tab; label: string }[]>([
    { id: "library", label: "Library" },
    { id: "compare", label: `Compare (${store.compareIds.length})` },
  ]);

  const isActive = (id: Tab) => store.view === id;
</script>

<nav aria-label="Biome Explorer views" class="flex gap-2">
  {#each tabs as tab (tab.id)}
    <button
      type="button"
      class="rounded-lg border px-4 py-2 text-sm {isActive(tab.id)
        ? 'border-theme-primary bg-theme-primary/15 text-theme-text'
        : 'border-theme-border text-theme-muted hover:border-theme-primary/60'}"
      aria-current={store.view === tab.id ? "page" : undefined}
      onclick={() => onSelect(tab.id)}>{tab.label}</button
    >
  {/each}
</nav>
