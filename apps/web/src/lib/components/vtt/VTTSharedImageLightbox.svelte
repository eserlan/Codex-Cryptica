<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import type { SharedTokenImageState } from "../../../types/vtt";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

  let { imageState, onClose } = $props<{
    imageState: SharedTokenImageState | null;
    onClose: () => void;
  }>();

  let resolvedImageUrl = $state("");
  let lastResolvedPath = $state<string | null>(null);

  $effect(() => {
    if (!imageState) {
      if (resolvedImageUrl) {
        modalUIStore.closeLightbox();
      }
      resolvedImageUrl = "";
      lastResolvedPath = null;
      return;
    }

    if (imageState.imagePath === lastResolvedPath && resolvedImageUrl) {
      modalUIStore.openLightbox(resolvedImageUrl, imageState.title);
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
          modalUIStore.openLightbox(url, imageState.title);
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
    if (!modalUIStore.lightbox.show && imageState && resolvedImageUrl) {
      onClose();
    }
  });
</script>
