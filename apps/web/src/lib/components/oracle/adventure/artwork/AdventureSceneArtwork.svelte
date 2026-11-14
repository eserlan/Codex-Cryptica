<script lang="ts">
  import type { ArtworkBlobHandle } from "#lib/services/adventure/artwork/ports.js";
  import { loadWhenVisible } from "./lazy-artwork-load.js";
  import { getAdventureLightbox } from "./adventure-artwork-lightbox.svelte.js";

  let {
    subjectKey,
    alt,
    credit,
    title = "Scene illustration",
    aiIllustration = true,
    load,
    loadFull,
  }: {
    subjectKey: string;
    alt: string;
    credit?: string;
    title?: string;
    aiIllustration?: boolean;
    load: (signal: AbortSignal) => Promise<ArtworkBlobHandle | null>;
    loadFull?: (signal: AbortSignal) => Promise<ArtworkBlobHandle | null>;
  } = $props();

  const lightbox = getAdventureLightbox();

  let container = $state<HTMLElement>();
  let handle = $state<ArtworkBlobHandle | null>(null);
  let pending = $state(true);

  const lightboxItem = $derived(
    handle
      ? {
          key: `scene:${subjectKey}:${alt}`,
          src: handle.url,
          alt,
          title,
          subtitle: `${aiIllustration ? "AI illustration" : "Vault image"}${credit ? ` · ${credit}` : ""}`,
          loadFull,
        }
      : null,
  );

  $effect(() => {
    if (!lightbox || !lightboxItem) return;
    return lightbox.register(lightboxItem);
  });

  $effect(() => {
    const _subjectKey = subjectKey;
    const element = container;
    const loader = load;
    if (!element) return;
    handle = null;
    pending = true;
    return loadWhenVisible(element, loader, (result) => {
      handle = result;
      pending = false;
    });
  });

  function failed() {
    handle?.release();
    handle = null;
    pending = false;
  }
</script>

<div bind:this={container}>
  {#if pending || handle}
    <figure
      class="mx-auto w-full max-w-xl overflow-hidden rounded-lg border border-theme-border bg-theme-surface"
    >
      <div class="aspect-video w-full overflow-hidden">
        {#if handle && lightboxItem}
          <button
            type="button"
            class="block h-full w-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
            aria-label={`Enlarge scene illustration: ${alt}`}
            onclick={() => lightbox?.open(lightboxItem)}
          >
            <img
              src={handle.url}
              {alt}
              width="1280"
              height="720"
              class="h-full w-full object-cover"
              onerror={failed}
            />
          </button>
        {/if}
      </div>
      {#if handle}<figcaption class="px-3 py-2 text-xs text-theme-text">
          {aiIllustration ? "AI illustration" : "Vault image"}{credit
            ? ` · ${credit}`
            : ""}
        </figcaption>{/if}
    </figure>
  {/if}
</div>
