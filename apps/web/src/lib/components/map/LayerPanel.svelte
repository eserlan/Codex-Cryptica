<script module lang="ts">
  import type { MapLayer } from "map-engine";

  const LAYER_META: Array<{ value: MapLayer; label: string; icon: string }> = [
    { value: "terrain", label: "Terrain", icon: "icon-[lucide--mountain]" },
    { value: "object", label: "Furniture", icon: "icon-[lucide--armchair]" },
    { value: "token", label: "Tokens", icon: "icon-[lucide--swords]" },
  ];
</script>

<script lang="ts">
  import { mapStore } from "$lib/stores/map.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";

  let { onClose }: { onClose: () => void } = $props();
</script>

<div
  role="menu"
  aria-label="Map layers"
  class="w-56 rounded-lg border border-theme-border bg-theme-surface/95 backdrop-blur p-1 shadow-2xl"
>
  <div
    class="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-theme-muted"
  >
    Layers
  </div>
  {#each LAYER_META as layer (layer.value)}
    {@const isActive = mapSession.activeLayer === layer.value}
    {@const isVisible = mapStore.layerVisibility[layer.value] !== false}
    {@const isLocked = mapStore.layerLocked[layer.value] === true}
    <div
      class="flex items-center gap-1 rounded-md px-1 py-1 {isActive
        ? 'bg-theme-primary/15'
        : ''}"
    >
      <button
        type="button"
        role="menuitemradio"
        aria-checked={isActive}
        class="flex flex-1 items-center gap-2 rounded px-1.5 py-1 text-left text-xs transition-colors hover:bg-theme-primary/10 {isActive
          ? 'text-theme-primary font-semibold'
          : 'text-theme-text'}"
        onclick={() => {
          mapSession.activeLayer = layer.value;
          onClose();
        }}
      >
        <span class="{layer.icon} h-3.5 w-3.5" aria-hidden="true"></span>
        {layer.label}
      </button>
      <button
        type="button"
        class="flex h-6 w-6 items-center justify-center rounded text-theme-muted transition-colors hover:bg-theme-primary/10 hover:text-theme-primary"
        aria-label="{isVisible ? 'Hide' : 'Show'} {layer.label} layer"
        title="{isVisible ? 'Hide' : 'Show'} layer"
        onclick={() => {
          mapStore.layerVisibility = {
            ...mapStore.layerVisibility,
            [layer.value]: !isVisible,
          };
        }}
      >
        <span
          class="{isVisible
            ? 'icon-[lucide--eye]'
            : 'icon-[lucide--eye-off]'} h-3.5 w-3.5"
          aria-hidden="true"
        ></span>
      </button>
      <button
        type="button"
        class="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-theme-primary/10 {isLocked
          ? 'text-theme-primary'
          : 'text-theme-muted hover:text-theme-primary'}"
        aria-label="{isLocked ? 'Unlock' : 'Lock'} {layer.label} layer"
        title="{isLocked ? 'Unlock' : 'Lock'} layer"
        onclick={() => {
          mapStore.layerLocked = {
            ...mapStore.layerLocked,
            [layer.value]: !isLocked,
          };
        }}
      >
        <span
          class="{isLocked
            ? 'icon-[lucide--lock]'
            : 'icon-[lucide--lock-open]'} h-3.5 w-3.5"
          aria-hidden="true"
        ></span>
      </button>
    </div>
  {/each}
</div>
