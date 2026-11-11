<script lang="ts">
  import type { HexLabelConfig, HexOrientation } from "map-engine";
  import type { RegionGenerationStore } from "#lib/stores/hex-crawl/region-generation.svelte.js";
  import RegionAdjustHex from "./RegionAdjustHex.svelte";
  import RegionImpactNotice from "./RegionImpactNotice.svelte";
  import RegionRadius from "./RegionRadius.svelte";
  import RegionSeedControls from "./RegionSeedControls.svelte";
  import RegionSettings from "./RegionSettings.svelte";

  /** The controls under the summary: seed, radius, landscape and single-hex changes. */
  let {
    store,
    selectedKey,
    copy,
    labelConfig,
    orientation,
    onSelect,
  }: {
    store: RegionGenerationStore;
    selectedKey: string | null;
    copy?: (text: string) => Promise<boolean>;
    labelConfig?: HexLabelConfig;
    orientation?: HexOrientation;
    onSelect?: (key: string) => void;
  } = $props();

  let showSettings = $state(false);
  const review = $derived(store.review);
</script>

{#if review}
  {#if review.operation === "regenerate"}
    <RegionImpactNotice proposal={review.proposal} />
  {/if}

  <div class="mt-3"><RegionSeedControls {store} {copy} /></div>

  {#if review.operation !== "grow"}
    <div class="mt-3">
      <RegionRadius
        radius={review.radius}
        onChange={(radius) => store.setRadius(radius)}
      />
    </div>
  {/if}

  <button
    type="button"
    class="mt-2 min-h-11 text-xs font-bold uppercase tracking-widest text-theme-text"
    aria-expanded={showSettings}
    onclick={() => (showSettings = !showSettings)}
  >
    Landscape and amounts
  </button>
  {#if showSettings}
    <RegionSettings
      settings={review.settings}
      onPreset={(preset) => store.setPreset(preset)}
      onLevel={(terrain, level) => store.setLevel(terrain, level)}
    />
  {/if}

  <div class="mt-3">
    <RegionAdjustHex
      {store}
      {selectedKey}
      {labelConfig}
      {orientation}
      {onSelect}
    />
  </div>
{/if}
