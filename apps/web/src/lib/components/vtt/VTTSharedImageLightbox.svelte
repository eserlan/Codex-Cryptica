<script lang="ts">
  import { uiStore } from "$lib/stores/ui.svelte";
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
      uiStore.closeLightbox();
      return;
    }

    if (imageState.imagePath === lastResolvedPath && resolvedImageUrl) {
      uiStore.openLightbox(resolvedImageUrl, imageState.title);
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
          uiStore.openLightbox(url, imageState.title);
        }
      })
      .catch((err) => {
        console.error("[VTTSharedImageLightbox] Failed to resolve image", err);
      });

    return () => {
      cancelled = true;
    };
  });

  // Synchronize store back to onClose if it's closed manually
  $effect(() => {
    if (!uiStore.lightbox.show && imageState) {
      onClose();
    }
  });
</script>
