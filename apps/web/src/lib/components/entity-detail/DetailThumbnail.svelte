<script lang="ts">
  import type { Entity } from "schema";
  import { isEntityVisible } from "schema";
  import { vault } from "#lib/stores/vault.svelte.js";
  import { oracle } from "#lib/stores/oracle.svelte.js";
  import { modalUIStore } from "#lib/stores/ui/modal-ui.svelte.js";
  import SilhouetteAvatar from "#lib/components/ui/SilhouetteAvatar.svelte";
  import { saveEntityImageFile } from "./entity-image-file.js";

  let { entity }: { entity: Entity } = $props();

  let resolvedImageUrl = $state("");
  let isDraggingOver = $state(false);

  const isVisible = $derived(
    !vault.isGuest ||
      isEntityVisible(entity, {
        sharedMode: vault.isGuest,
        defaultVisibility: vault.defaultVisibility,
      }),
  );
  const showImage = $derived(isVisible && !!entity.image);

  $effect(() => {
    const imagePath = entity.image;
    const thumbnailPath = entity.thumbnail;
    let stale = false;

    const resolveImage = async () => {
      let url = "";
      if (imagePath) url = await vault.resolveImageUrl(imagePath);
      // Fall back to the thumbnail when the full image does not resolve.
      if (!url && thumbnailPath)
        url = await vault.resolveImageUrl(thumbnailPath);
      if (!stale) resolvedImageUrl = url;
    };
    resolveImage();

    return () => {
      stale = true;
    };
  });

  const handleDragOver = (e: DragEvent) => {
    if (vault.isGuest) return;
    if (
      e.dataTransfer?.types.includes("application/codex-image-id") ||
      e.dataTransfer?.types.includes("Files")
    ) {
      e.preventDefault();
      isDraggingOver = true;
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDrop = async (e: DragEvent) => {
    if (vault.isGuest) return;
    e.preventDefault();
    isDraggingOver = false;

    const customId = e.dataTransfer?.getData("application/codex-image-id");
    const message = customId
      ? oracle.messages.find((m) => m.id === customId)
      : null;

    if (message?.imageBlob) {
      await saveEntityImageFile(
        entity.id,
        new File([message.imageBlob], "oracle-image", {
          type: message.imageBlob.type || "image/png",
        }),
      );
      return;
    }

    const file = e.dataTransfer?.files?.[0];
    if (file) await saveEntityImageFile(entity.id, file);
  };

  const enlarge = (e: MouseEvent) => {
    if (!resolvedImageUrl) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    modalUIStore.openLightbox(
      resolvedImageUrl,
      entity.title,
      { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
      entity.image,
    );
  };
</script>

<div
  class="h-16 w-16 shrink-0 overflow-hidden rounded border border-theme-border bg-theme-bg/30 {isDraggingOver
    ? 'ring-2 ring-oracle-primary'
    : ''}"
  data-testid="detail-thumbnail"
  role="presentation"
  ondragover={handleDragOver}
  ondragleave={() => (isDraggingOver = false)}
  ondrop={handleDrop}
>
  {#if showImage}
    <button
      type="button"
      onclick={enlarge}
      disabled={!resolvedImageUrl}
      aria-label="Enlarge image of {entity.title}"
      class="block h-full w-full cursor-pointer transition hover:opacity-90 disabled:cursor-wait"
    >
      {#if resolvedImageUrl}
        <img
          src={resolvedImageUrl}
          alt=""
          decoding="async"
          class="h-full w-full object-cover"
        />
      {/if}
    </button>
  {:else}
    <SilhouetteAvatar {entity} size="full" class="h-full w-full" />
  {/if}
</div>
