<script lang="ts">
  import {
    LANDSCAPE_PRESET_IDS,
    PRESET_TERRAIN_IDS,
    TERRAIN_CATALOGUE,
    TERRAIN_LEVELS,
    terrainLevel,
    type LandscapePresetId,
    type RegionSettings,
    type TerrainId,
    type TerrainLevel,
  } from "hex-crawl-engine";

  let {
    settings,
    onPreset,
    onLevel,
  }: {
    settings: RegionSettings;
    onPreset: (preset: LandscapePresetId) => void;
    onLevel: (terrain: TerrainId, level: TerrainLevel) => void;
  } = $props();

  const LEVEL_LABEL: Record<TerrainLevel, string> = {
    none: "None",
    less: "Less",
    normal: "Normal",
    more: "More",
  };
  const PRESET_LABEL: Record<LandscapePresetId, string> = {
    temperate: "Temperate",
    coastal: "Coastal",
    highlands: "Highlands",
    arid: "Arid",
    frozen: "Frozen",
  };
</script>

<div class="space-y-3" data-testid="region-settings">
  <label class="block space-y-1">
    <span class="text-micro font-bold uppercase tracking-widest text-theme-text"
      >Landscape</span
    >
    <select
      class="min-h-11 w-full rounded-lg border border-theme-border bg-theme-bg px-2 text-sm text-theme-text"
      value={settings.preset}
      onchange={(event) =>
        onPreset(event.currentTarget.value as LandscapePresetId)}
    >
      {#each LANDSCAPE_PRESET_IDS as id (id)}
        <option value={id}>{PRESET_LABEL[id]}</option>
      {/each}
    </select>
  </label>

  <ul class="space-y-1.5">
    {#each PRESET_TERRAIN_IDS as id (id)}
      <li class="flex items-center justify-between gap-2">
        <span class="text-sm text-theme-text"
          >{TERRAIN_CATALOGUE[id].label}</span
        >
        <select
          aria-label="{TERRAIN_CATALOGUE[id].label} amount"
          class="min-h-11 rounded-lg border border-theme-border bg-theme-bg px-2 text-sm text-theme-text"
          value={terrainLevel(settings, id)}
          onchange={(event) =>
            onLevel(id, event.currentTarget.value as TerrainLevel)}
        >
          {#each TERRAIN_LEVELS as level (level)}
            <option value={level}>{LEVEL_LABEL[level]}</option>
          {/each}
        </select>
      </li>
    {/each}
  </ul>
</div>
