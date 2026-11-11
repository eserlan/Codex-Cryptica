<script lang="ts">
  import type { HexCoord } from "map-engine";
  import type { RegionOperation } from "hex-crawl-engine";
  import { HINT_KEYS } from "#lib/config/help-content.js";
  import type { StorageLike } from "#lib/stores/ui/persistence.js";
  import { browserStorage } from "#lib/utils/runtime-deps.js";
  import type { RegionGenerationStore } from "#lib/stores/hex-crawl/region-generation.svelte.js";

  /** Start a region from the selected hex. The preview opens on the map. */
  let {
    store,
    mapId,
    hex,
    storage = browserStorage,
  }: {
    store: RegionGenerationStore;
    mapId: string;
    hex: HexCoord;
    storage?: StorageLike | null;
  } = $props();

  const HINT_TEXT =
    "Proposes terrain on this device with no AI. You review it on the map before anything is saved.";

  function seen(): boolean {
    try {
      return storage?.getItem(HINT_KEYS.HEX_REGION_HINT) === "1";
    } catch {
      return false;
    }
  }
  let hintVisible = $state(!seen());

  function dismissHint() {
    hintVisible = false;
    try {
      storage?.setItem(HINT_KEYS.HEX_REGION_HINT, "1");
    } catch {
      // The hint will show again next time, which is harmless.
    }
  }

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
  {#if hintVisible}
    <div
      data-testid="region-hint"
      class="flex items-start gap-2 rounded-lg border border-theme-border p-2 text-xs text-theme-text"
    >
      <p class="flex-1">{HINT_TEXT}</p>
      <button
        type="button"
        class="min-h-11 min-w-11 rounded-lg"
        aria-label="Dismiss hint"
        onclick={dismissHint}
      >
        <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
      </button>
    </div>
  {/if}
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
