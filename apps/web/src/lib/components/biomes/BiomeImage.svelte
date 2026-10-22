<script lang="ts">
  import { onDestroy } from "svelte";
  import type { ImageRef } from "biome-engine";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import BiomeImageCredit from "./BiomeImageCredit.svelte";

  let {
    image,
    biomeName,
    compact = false,
    clipboard = typeof navigator !== "undefined"
      ? navigator.clipboard
      : undefined,
  }: {
    image: ImageRef;
    biomeName: string;
    compact?: boolean;
    clipboard?: Pick<Clipboard, "writeText"> | undefined;
  } = $props();

  let failed = $state(false);
  let copied = $state(false);
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let destroyed = false;

  onDestroy(() => {
    destroyed = true;
    if (timeoutId) clearTimeout(timeoutId);
  });

  async function copyPrompt() {
    if (image.origin !== "generated" || !image.prompt) return;
    try {
      if (clipboard?.writeText) {
        await clipboard.writeText(image.prompt);
        if (destroyed) return;
        copied = true;
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          copied = false;
        }, 2000);
      }
    } catch {
      // clipboard access denied or unavailable
    }
  }

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

  const wikimediaSearchUrl = $derived(
    `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(biomeName + " landscape")}`,
  );
  const unsplashSearchUrl = $derived(
    `https://unsplash.com/s/photos/${encodeURIComponent(
      biomeName
        .toLowerCase()
        .replace(/\s*\(.*?\)\s*/g, "")
        .trim(),
    )}`,
  );
</script>

<figure class="m-0 flex w-full flex-col gap-2">
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
      class="group relative block w-full cursor-zoom-in overflow-hidden rounded-xl border border-theme-border/60 bg-theme-surface/30 text-left transition duration-200 hover:border-theme-primary/50 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-theme-accent"
      onclick={openLightbox}
      aria-label="Enlarge illustration of {biomeName}"
    >
      <img
        src={image.url}
        alt={image.alt}
        loading="lazy"
        class="aspect-[16/9] max-h-[560px] w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
        onerror={() => (failed = true)}
      />
      <div
        class="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/75 px-3 py-1.5 text-xs font-medium text-white/95 opacity-0 shadow-lg backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <span class="icon-[lucide--maximize-2] h-4 w-4" aria-hidden="true"
        ></span>
        <span>Click to enlarge</span>
      </div>
    </button>
  {/if}

  <figcaption class="flex flex-col gap-1.5">
    <div
      class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs text-theme-muted"
    >
      <BiomeImageCredit {image} {compact} />

      {#if !compact}
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-theme-muted">Visual references:</span>
          <a
            href={wikimediaSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-theme-muted transition-colors hover:text-theme-primary"
            title="Search authentic geographical imagery on Wikimedia Commons"
          >
            <span class="icon-[lucide--camera] h-3.5 w-3.5" aria-hidden="true"
            ></span>
            <span>Wikimedia</span>
            <span
              class="icon-[lucide--external-link] h-3 w-3 opacity-60"
              aria-hidden="true"
            ></span>
          </a>
          <a
            href={unsplashSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-theme-muted transition-colors hover:text-theme-primary"
            title="Search atmospheric landscape imagery on Unsplash"
          >
            <span class="icon-[lucide--image] h-3.5 w-3.5" aria-hidden="true"
            ></span>
            <span>Unsplash</span>
            <span
              class="icon-[lucide--external-link] h-3 w-3 opacity-60"
              aria-hidden="true"
            ></span>
          </a>

          {#if image.origin === "generated" && image.prompt}
            <span class="text-theme-border" aria-hidden="true">|</span>
            <button
              type="button"
              class="inline-flex items-center gap-1 text-theme-muted transition-colors hover:text-theme-primary"
              onclick={copyPrompt}
              title="Copy the image generation prompt to clipboard"
            >
              {#if copied}
                <span
                  class="icon-[lucide--check] h-3.5 w-3.5 text-theme-text"
                  aria-hidden="true"
                ></span>
                <span class="font-medium text-theme-text">Prompt copied!</span>
              {:else}
                <span class="icon-[lucide--copy] h-3.5 w-3.5" aria-hidden="true"
                ></span>
                <span>Copy prompt</span>
              {/if}
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </figcaption>
</figure>
