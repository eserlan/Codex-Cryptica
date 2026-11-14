<script lang="ts">
  import type { ArtworkBlobHandle } from "#lib/services/adventure/artwork/ports.js";
  import { loadWhenVisible } from "./lazy-artwork-load.js";
  import { getAdventureLightbox } from "./adventure-artwork-lightbox.svelte.js";

  let {
    kind,
    name,
    alt,
    title,
    subtitle,
    cue,
    preview,
    loadFull,
  }: {
    kind: "location" | "npc";
    name: string;
    alt: string;
    title: string;
    subtitle?: string;
    cue?: string;
    preview: (signal: AbortSignal) => Promise<ArtworkBlobHandle | null>;
    loadFull?: (signal: AbortSignal) => Promise<ArtworkBlobHandle | null>;
  } = $props();

  const lightbox = getAdventureLightbox();

  let container = $state<HTMLElement>();
  let handle = $state<ArtworkBlobHandle | null>(null);

  const lightboxItem = $derived(
    handle
      ? {
          key: `${kind}:${name}:${alt}`,
          src: handle.url,
          alt,
          title,
          subtitle,
          loadFull,
        }
      : null,
  );

  const label = $derived(
    kind === "location"
      ? `Show illustration of ${name}`
      : `Show portrait of ${name}, ${cue}`,
  );

  $effect(() => {
    if (!lightbox || !lightboxItem) return;
    return lightbox.register(lightboxItem);
  });

  $effect(() => {
    const element = container;
    const loader = preview;
    if (!element) return;
    const stop = loadWhenVisible(element, loader, (result) => {
      handle = result;
    });
    return () => {
      stop();
      handle = null;
    };
  });

  function failed() {
    handle?.release();
    handle = null;
  }
</script>

<div bind:this={container} class="contents">
  {#if handle && lightboxItem}
    <button
      type="button"
      class="inline-flex max-w-full cursor-zoom-in items-center gap-2 rounded-lg border border-theme-border bg-theme-surface p-1.5 pr-3 text-left text-xs text-theme-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
      aria-label={label}
      onclick={() => lightbox?.open(lightboxItem)}
    >
      {#if kind === "location"}
        <img
          src={handle.url}
          {alt}
          width="80"
          height="45"
          class="h-11 w-20 shrink-0 rounded object-cover"
          onerror={failed}
        />
        <span class="truncate font-medium">{name}</span>
      {:else}
        <img
          src={handle.url}
          {alt}
          width="36"
          height="36"
          class="h-9 w-9 shrink-0 rounded-full object-cover"
          onerror={failed}
        />
        <span class="truncate">
          <span class="font-medium">{name}</span>
          {cue}
        </span>
      {/if}
    </button>
  {/if}
</div>
