<script lang="ts">
  import type { ReferenceBiome } from "biome-engine";
  import BiomeImage from "./BiomeImage.svelte";

  let {
    biome,
    onOpen,
    comparing = false,
    onToggleCompare,
  }: {
    biome: ReferenceBiome;
    onOpen: (id: string) => void;
    comparing?: boolean;
    onToggleCompare?: (id: string) => void;
  } = $props();
</script>

<article
  class="flex h-full flex-col gap-2 rounded-xl border border-theme-border bg-theme-surface p-3 transition-colors hover:border-theme-primary/60"
>
  <BiomeImage image={biome.images[0]} biomeName={biome.name} compact />
  <button
    type="button"
    class="rounded text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
    onclick={() => onOpen(biome.id)}
  >
    <span class="block font-header text-base text-theme-text">{biome.name}</span
    >
    <span class="block text-sm text-theme-muted">{biome.summary}</span>
  </button>
  {#if onToggleCompare}
    <button
      type="button"
      class="mt-auto inline-flex items-center gap-1 self-start rounded border border-theme-border px-2 py-1 text-xs text-theme-text hover:border-theme-primary"
      aria-pressed={comparing}
      aria-label="Compare {biome.name}"
      onclick={() => onToggleCompare(biome.id)}
    >
      <span
        class={comparing
          ? "icon-[lucide--check] h-3 w-3"
          : "icon-[lucide--columns-2] h-3 w-3"}
        aria-hidden="true"
      ></span>
      {comparing ? "In comparison" : "Compare"}
    </button>
  {/if}
</article>
