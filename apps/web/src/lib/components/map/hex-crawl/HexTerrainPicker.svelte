<script lang="ts">
  import {
    CUSTOM_TERRAIN_MAX_LENGTH,
    PRESET_TERRAIN_IDS,
    TERRAIN_CATALOGUE,
    parseTerrainInput,
    terrainIcon,
    terrainLabel,
    type Terrain,
  } from "hex-crawl-engine";

  let {
    terrain,
    onChoose,
  }: {
    terrain: Terrain | undefined;
    onChoose: (terrain: Terrain | null) => void;
  } = $props();

  let customOpen = $state(false);
  let customText = $state("");
  let problem = $state("");

  function isCurrent(id: (typeof PRESET_TERRAIN_IDS)[number]) {
    return terrain?.kind === "preset" && terrain.id === id;
  }

  function useCustom() {
    const parsed = parseTerrainInput(customText);
    if (!parsed || parsed.kind !== "custom") {
      problem = `Terrain names must be 1 to ${CUSTOM_TERRAIN_MAX_LENGTH} characters.`;
      return;
    }
    problem = "";
    onChoose(parsed);
  }
</script>

<div class="space-y-2">
  <div class="grid grid-cols-3 gap-1.5">
    {#each PRESET_TERRAIN_IDS as id (id)}
      <button
        type="button"
        aria-pressed={isCurrent(id)}
        onclick={() => onChoose({ kind: "preset", id })}
        class="flex flex-col items-center gap-1 rounded-lg border px-2 py-1.5 text-micro font-bold uppercase tracking-widest text-theme-text {isCurrent(
          id,
        )
          ? 'border-theme-primary bg-theme-primary/10'
          : 'border-theme-border hover:border-theme-primary/40'}"
      >
        <span
          class="{terrainIcon({ kind: 'preset', id })} h-4 w-4"
          aria-hidden="true"
        ></span>
        <span>{TERRAIN_CATALOGUE[id].label}</span>
      </button>
    {/each}
  </div>

  <div class="flex items-stretch gap-2">
    <button
      type="button"
      aria-expanded={customOpen}
      onclick={() => (customOpen = !customOpen)}
      class="flex-1 rounded-lg border border-theme-border px-3 py-1.5 text-micro font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text"
    >
      Custom…
    </button>
    <button
      type="button"
      aria-label="Clear terrain"
      onclick={() => onChoose(null)}
      disabled={!terrain}
      class="rounded-lg border border-theme-border px-3 py-1.5 text-micro font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text disabled:opacity-50"
    >
      Clear
    </button>
  </div>

  {#if customOpen}
    <div class="space-y-1">
      <div class="flex items-stretch gap-2">
        <input
          type="text"
          aria-label="Custom terrain name"
          maxlength={CUSTOM_TERRAIN_MAX_LENGTH + 20}
          bind:value={customText}
          class="min-w-0 flex-1 rounded-lg border border-theme-border bg-theme-bg px-3 py-1.5 text-sm text-theme-text outline-none focus:border-theme-primary"
        />
        <button
          type="button"
          aria-label="Use custom terrain"
          onclick={useCustom}
          class="rounded-lg border border-theme-border px-3 py-1.5 text-micro font-bold uppercase tracking-widest text-theme-text hover:border-theme-primary/40"
        >
          Use
        </button>
      </div>
      <p role="status" class="text-micro text-theme-muted">{problem}</p>
    </div>
  {/if}

  {#if terrain}
    <p class="text-micro text-theme-muted">Current: {terrainLabel(terrain)}</p>
  {/if}
</div>
