<script lang="ts">
  import ZenImageLightbox from "$lib/components/zen/ZenImageLightbox.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import type { SharedTokenImageState } from "../../../types/vtt";

  let { imageState, onClose } = $props<{
    imageState: SharedTokenImageState | null;
    onClose: () => void;
  }>();

  let resolvedImageUrl = $state("");
  let lastResolvedPath = $state<string | null>(null);

  $effect(() => {
    if (!imageState) {
      resolvedImageUrl = "";
      lastResolvedPath = null;
      return;
    }

    if (imageState.imagePath === lastResolvedPath && resolvedImageUrl) {
      return;
    }

    let cancelled = false;
    resolvedImageUrl = "";
    lastResolvedPath = imageState.imagePath;

    void vault
      .resolveImageUrl(imageState.imagePath)
      .then((url) => {
        if (!cancelled) {
          console.log("[VTTSharedImageLightbox] resolved image", {
            imagePath: imageState.imagePath,
            resolvedUrl: url,
          });
          resolvedImageUrl = url;
        }
      })
      .catch((err) => {
        console.error("[VTTSharedImageLightbox] Failed to resolve image", err);
      });

    return () => {
      cancelled = true;
    };
  });

  let show = $state(false);

  $effect(() => {
    show = Boolean(imageState);
  });

  $effect(() => {
    if (!imageState || show) return;
    onClose();
  });
</script>

<ZenImageLightbox
  bind:show
  imageUrl={resolvedImageUrl}
  title={imageState?.title ?? "Shared Token Image"}
/>
