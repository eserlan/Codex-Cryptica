<script lang="ts">
  import type { Snippet } from "svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

  /**
   * A card's picture, resolved through the vault's own asset handling (#2247,
   * FR-026).
   *
   * Cards reuse `AssetManager` rather than storing images of their own, so they
   * inherit its size limits, its WebP conversion, and its export behaviour — a
   * deck's art travels with the vault exactly as an entity's portrait does.
   */
  let {
    path,
    alt,
    className = "h-16 w-16 rounded object-cover",
    zoomable = false,
    autoZoom = false,
    badge = true,
    title,
    children,
  }: {
    path: string | undefined;
    alt: string;
    className?: string;
    /** Click to open the picture full size, through the app's own lightbox. */
    zoomable?: boolean;
    /** Open the lightbox by itself once this picture arrives — the reveal. */
    autoZoom?: boolean;
    /** The hover "enlarge" icon — off for a thumbnail too small to hold it. */
    badge?: boolean;
    /** Caption for the lightbox — the card's name. */
    title?: string;
    /**
     * Something other than the picture itself to open the lightbox — a card's
     * name in a list, say, where the art is too small to read as art but the
     * click to see it is still worth having. Rendered plainly, with no button
     * wrapper, when there is no picture to open.
     */
    children?: Snippet;
  } = $props();

  let url = $state("");
  /** The picture already revealed, so a re-render never re-opens the lightbox. */
  let revealed = $state<string | undefined>();

  function openLightbox(rect?: DOMRect) {
    if (!url) return;
    modalUIStore.openLightbox(
      url,
      title ?? alt,
      rect
        ? { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
        : null,
      path,
    );
  }

  $effect(() => {
    if (!autoZoom || !url || revealed === path) return;
    revealed = path;
    openLightbox();
  });

  $effect(() => {
    const current = path;
    if (!current) {
      url = "";
      return;
    }

    let released = false;
    void vault.resolveImageUrl(current).then((resolved) => {
      if (!released) url = resolved;
    });

    // Blob URLs are ref-counted, so every resolve needs its release.
    return () => {
      released = true;
      vault.releaseImageUrl(current);
    };
  });
</script>

{#if children}
  {#if url && zoomable}
    <!-- The same lightbox an entity portrait opens, wrapping whatever stands
         in for the art here rather than the art itself. -->
    <button
      type="button"
      class="block w-full cursor-zoom-in rounded text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
      onclick={(e) => openLightbox(e.currentTarget.getBoundingClientRect())}
      aria-label="See the picture on {title ?? alt}"
      data-testid="card-image-zoom"
    >
      {@render children()}
    </button>
  {:else}
    {@render children()}
  {/if}
{:else if url}
  {#if zoomable}
    <!-- The same lightbox an entity portrait opens, so a card's art enlarges
         the way every other picture in the app does. -->
    <button
      type="button"
      class="group relative block cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
      onclick={(e) => openLightbox(e.currentTarget.getBoundingClientRect())}
      aria-label="Enlarge {title ?? alt}"
      data-testid="card-image-zoom"
    >
      <img src={url} {alt} class={className} data-testid="card-image" />
      {#if badge}
        <span
          aria-hidden="true"
          class="pointer-events-none absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <span class="icon-[lucide--maximize-2] h-3.5 w-3.5"></span>
        </span>
      {/if}
    </button>
  {:else}
    <img src={url} {alt} class={className} data-testid="card-image" />
  {/if}
{/if}
