<script module lang="ts">
  import type { MapLayer } from "map-engine";

  export const LAYER_OPTIONS: Array<{
    value: MapLayer;
    label: string;
    icon: string;
  }> = [
    { value: "terrain", label: "Terrain", icon: "icon-[lucide--mountain]" },
    { value: "object", label: "Furniture", icon: "icon-[lucide--armchair]" },
    { value: "token", label: "Tokens", icon: "icon-[lucide--swords]" },
  ];
</script>

<script lang="ts">
  let {
    value,
    onSelect,
  }: {
    value: MapLayer | undefined;
    onSelect: (layer: MapLayer) => void;
  } = $props();
</script>

{#each LAYER_OPTIONS as option (option.value)}
  <button
    type="button"
    class="w-full text-left px-4 py-2 text-xs hover:bg-theme-bg/50 transition-colors flex items-center gap-2"
    role="menuitemradio"
    aria-checked={(value ?? "token") === option.value}
    onclick={() => onSelect(option.value)}
  >
    <span class="{option.icon} w-3.5 h-3.5" aria-hidden="true"></span>
    <span class="flex-1">{option.label}</span>
    {#if (value ?? "token") === option.value}
      <span aria-hidden="true">✓</span>
    {/if}
  </button>
{/each}
