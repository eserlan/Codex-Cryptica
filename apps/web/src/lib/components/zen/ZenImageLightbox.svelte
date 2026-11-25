<script lang="ts">
  import ImageLightboxBase from "#lib/components/ui/ImageLightboxBase.svelte";
  import { modalUIStore } from "#lib/stores/ui/modal-ui.svelte.js";
  import { p2pHost } from "#lib/cloud-bridge/p2p/host-service.svelte.js";
  import { mapSession } from "#lib/stores/map-session.svelte.js";
  import { notificationStore } from "#lib/stores/ui/notification.svelte.js";

  let {
    show = $bindable(false),
    imageUrl,
    title = "",
  }: {
    show: boolean;
    imageUrl: string;
    title?: string;
  } = $props();
</script>

<ImageLightboxBase
  bind:show
  {imageUrl}
  {title}
  originRect={modalUIStore.lightbox.originRect}
>
  {#snippet extraActions()}
    {#if p2pHost.isHosting && modalUIStore.lightbox.imagePath}
      <button
        class="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition focus-visible:ring-2 focus-visible:ring-white outline-none"
        onclick={(e) => {
          e.stopPropagation();
          const originalPath = modalUIStore.lightbox.imagePath;
          if (originalPath) {
            const success = mapSession.showImageToPlayers(title, originalPath);
            if (success) {
              notificationStore.notify("Shared image with guests", "success");
            }
          }
        }}
        aria-label="Share image with guests"
        title="Share with Guests"
        type="button"
      >
        <span aria-hidden="true" class="icon-[lucide--share-2] w-6 h-6"></span>
      </button>
    {/if}
  {/snippet}
</ImageLightboxBase>
