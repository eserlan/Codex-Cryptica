<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";

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
  }: {
    path: string | undefined;
    alt: string;
    className?: string;
  } = $props();

  let url = $state("");

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

{#if url}
  <img src={url} {alt} class={className} data-testid="card-image" />
{/if}
