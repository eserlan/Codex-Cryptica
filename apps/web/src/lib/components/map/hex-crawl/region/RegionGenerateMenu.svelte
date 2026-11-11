<script lang="ts">
  import type { HexCoord } from "map-engine";
  import type { RegionOperation } from "hex-crawl-engine";
  import type { RegionGenerationStore } from "#lib/stores/hex-crawl/region-generation.svelte.js";

  /** Start a region from the selected hex. The preview opens on the map. */
  let {
    store,
    mapId,
    hex,
  }: { store: RegionGenerationStore; mapId: string; hex: HexCoord } = $props();

  const ENTRIES: { operation: RegionOperation; label: string; hint: string }[] =
    [
      {
        operation: "grow",
        label: "Grow from this hex",
        hint: "This hex and its empty neighbours",
      },
      {
        operation: "area",
        label: "Generate area",
        hint: "Empty hexes around this one",
      },
      {
        operation: "gaps",
        label: "Fill gaps",
        hint: "Empty hexes between mapped areas",
      },
      {
        operation: "regenerate",
        label: "Regenerate generated terrain",
        hint: "Replaces only terrain this tool made",
      },
    ];
</script>

<div class="space-y-2" data-testid="region-generate-menu">
  <h3 class="text-micro font-bold uppercase tracking-widest text-theme-text">
    Generate region
  </h3>
  <div class="grid gap-1.5">
    {#each ENTRIES as entry (entry.operation)}
      <button
        type="button"
        class="min-h-11 rounded-lg border border-theme-border px-3 py-1.5 text-left text-theme-text hover:border-theme-primary/40"
        onclick={() => store.open(mapId, entry.operation, hex)}
      >
        <span class="block text-sm font-bold">{entry.label}</span>
        <span class="block text-xs text-theme-text">{entry.hint}</span>
      </button>
    {/each}
  </div>
</div>
