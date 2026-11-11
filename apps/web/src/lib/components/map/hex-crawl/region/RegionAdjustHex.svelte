<script lang="ts">
  import { terrainLabel, type Terrain } from "hex-crawl-engine";
  import type { RegionGenerationStore } from "#lib/stores/hex-crawl/region-generation.svelte.js";
  import HexTerrainPicker from "../HexTerrainPicker.svelte";

  /** Change one proposed hex by hand, or put its proposed terrain back. */
  let {
    store,
    selectedKey,
  }: { store: RegionGenerationStore; selectedKey: string | null } = $props();

  const current = $derived<Terrain | undefined>(
    store.review && selectedKey && selectedKey in store.review.proposal.hexes
      ? (store.review.adjustments[selectedKey] ?? {
          kind: "preset",
          id: store.review.proposal.hexes[selectedKey],
        })
      : undefined,
  );
</script>

<div class="space-y-2">
  <h3 class="text-micro font-bold uppercase tracking-widest text-theme-muted">
    Adjust a hex
  </h3>
  {#if selectedKey && current}
    <p class="text-xs text-theme-text">
      {selectedKey}: {terrainLabel(current)}
    </p>
    <HexTerrainPicker
      terrain={current}
      onChoose={(terrain) => store.adjust(selectedKey, terrain)}
    />
    {#if store.review && selectedKey in store.review.adjustments}
      <button
        type="button"
        class="min-h-11 text-xs text-theme-muted underline"
        onclick={() => store.adjust(selectedKey, null)}
        >Put back the proposed terrain</button
      >
    {/if}
  {:else}
    <p class="text-xs text-theme-muted">
      Tap a proposed hex on the map to change it.
    </p>
  {/if}
</div>
