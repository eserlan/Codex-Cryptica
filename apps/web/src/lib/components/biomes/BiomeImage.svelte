<script lang="ts">
  import type { ImageRef } from "biome-engine";
  import BiomeImageCredit from "./BiomeImageCredit.svelte";

  let {
    image,
    biomeName,
    compact = false,
  }: { image: ImageRef; biomeName: string; compact?: boolean } = $props();

  let failed = $state(false);
</script>

<figure class="m-0">
  {#if failed}
    <div
      role="img"
      aria-label="{biomeName}: image unavailable"
      class="flex aspect-[16/10] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-theme-border bg-theme-surface text-center text-theme-muted"
    >
      <span class="icon-[lucide--image-off] h-6 w-6" aria-hidden="true"></span>
      <span class="text-xs">Image unavailable</span>
    </div>
  {:else}
    <img
      src={image.url}
      alt={image.alt}
      loading="lazy"
      class="aspect-[16/10] w-full rounded-lg border border-theme-border object-cover"
      onerror={() => (failed = true)}
    />
  {/if}
  <figcaption><BiomeImageCredit {image} {compact} /></figcaption>
</figure>
