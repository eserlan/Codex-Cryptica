<script lang="ts">
  import type { ImageRef } from "biome-engine";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import BiomeImageCredit from "./BiomeImageCredit.svelte";

  let {
    image,
    biomeName,
    compact = false,
  }: { image: ImageRef; biomeName: string; compact?: boolean } = $props();

  let failed = $state(false);

  function openLightbox(event: MouseEvent) {
    if (failed) return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    modalUIStore.openLightbox(image.url, image.alt || biomeName, {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    });
  }
</script>

<figure class="m-0 flex flex-col gap-1.5 w-full">
  {#if failed}
    <div
      role="img"
      aria-label="{biomeName}: image unavailable"
      class="flex aspect-[16/9] w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-theme-border bg-theme-surface/50 text-center text-theme-muted"
    >
      <span class="icon-[lucide--image-off] h-6 w-6" aria-hidden="true"></span>
      <span class="text-xs">Image unavailable</span>
    </div>
  {:else}
    <button
      type="button"
      class="group relative block w-full overflow-hidden rounded-xl border border-theme-border/60 bg-theme-surface/30 text-left transition duration-200 hover:border-theme-primary/50 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-theme-accent cursor-zoom-in"
      onclick={openLightbox}
      aria-label="Enlarge illustration of {biomeName}"
    >
      <img
        src={image.url}
        alt={image.alt}
        loading="lazy"
        class="aspect-[16/9] w-full max-h-[560px] object-cover transition-transform duration-300 group-hover:scale-[1.01]"
        onerror={() => (failed = true)}
      />
      <div
        class="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/75 px-3 py-1.5 text-xs font-medium text-white/95 backdrop-blur-md opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <span class="icon-[lucide--maximize-2] h-4 w-4" aria-hidden="true"
        ></span>
        <span>Click to enlarge</span>
      </div>
    </button>
  {/if}
  <figcaption><BiomeImageCredit {image} {compact} /></figcaption>
</figure>
