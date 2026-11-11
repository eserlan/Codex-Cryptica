<script lang="ts">
  import {
    parseHexLabel,
    type HexLabelConfig,
    type HexOrientation,
  } from "map-engine";
  import { terrainLabel, toHexKey, type Terrain } from "hex-crawl-engine";
  import type { RegionGenerationStore } from "#lib/stores/hex-crawl/region-generation.svelte.js";
  import HexTerrainPicker from "../HexTerrainPicker.svelte";

  /** Change one proposed hex by hand, or put its proposed terrain back. */
  let {
    store,
    selectedKey,
    labelConfig,
    orientation = "pointy",
    onSelect,
  }: {
    store: RegionGenerationStore;
    selectedKey: string | null;
    labelConfig?: HexLabelConfig;
    orientation?: HexOrientation;
    onSelect?: (key: string) => void;
  } = $props();

  let typed = $state("");
  let problem = $state("");

  /** Pick a proposed hex by its label, as an alternative to tapping it on the map. */
  function pickByLabel(event: Event) {
    event.preventDefault();
    const hex = parseHexLabel(typed, labelConfig, orientation);
    const key = hex ? toHexKey(hex) : null;
    if (!key || !store.review || !(key in store.review.proposal.hexes)) {
      problem = `${typed.trim() || "That hex"} is not in this proposal.`;
      return;
    }
    problem = "";
    onSelect?.(key);
  }

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
  <h3 class="text-micro font-bold uppercase tracking-widest text-theme-text">
    Adjust a hex
  </h3>
  <form class="flex items-end gap-2" onsubmit={pickByLabel}>
    <label class="min-w-0 flex-1 space-y-1">
      <span class="text-xs text-theme-text">Hex label</span>
      <input
        type="text"
        class="min-h-11 w-full rounded-lg border border-theme-border bg-theme-bg px-2 text-sm text-theme-text"
        placeholder="e.g. C04"
        bind:value={typed}
      />
    </label>
    <button
      type="submit"
      class="min-h-11 rounded-lg border border-theme-border px-3 text-sm text-theme-text"
      >Select</button
    >
  </form>
  {#if problem}
    <p role="alert" class="text-xs text-theme-danger">{problem}</p>
  {/if}
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
        class="min-h-11 text-xs text-theme-text underline"
        onclick={() => store.adjust(selectedKey, null)}
        >Put back the proposed terrain</button
      >
    {/if}
  {:else}
    <p class="text-xs text-theme-text">
      Tap a proposed hex on the map to change it.
    </p>
  {/if}
</div>
