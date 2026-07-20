<script lang="ts">
  import { fade } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { p2pHost } from "$lib/cloud-bridge/p2p/host-service.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

  let {
    show = $bindable(false),
    imageUrl,
    title = "",
  } = $props<{
    show: boolean;
    imageUrl: string;
    title?: string;
  }>();

  let lightboxBackdrop = $state<HTMLDivElement>();

  function zoomFrom(_node: HTMLElement) {
    const origin = modalUIStore.lightbox.originRect;
    if (!origin) {
      // Fallback: scale up from center with fade
      return {
        duration: 350,
        easing: quintOut,
        css: (t: number) => {
          const scale = 0.9 + 0.1 * t;
          return `transform: scale(${scale}); opacity: ${t};`;
        },
      };
    }

    // Capture precise rendered bounding box of the full-screen image
    const rect = _node.getBoundingClientRect();
    const finalWidth = rect.width || 800;
    const finalHeight = rect.height || 600;

    // Center of the clicked element (origin rect)
    const originCenterX = origin.x + origin.width / 2;
    const originCenterY = origin.y + origin.height / 2;

    // Center of the final rendered full-screen image
    const finalCenterX =
      (rect.left ??
        (typeof window !== "undefined" ? window.innerWidth / 2 : 960)) +
      finalWidth / 2;
    const finalCenterY =
      (rect.top ??
        (typeof window !== "undefined" ? window.innerHeight / 2 : 540)) +
      finalHeight / 2;

    // Translation required to match click origin center
    const startX = originCenterX - finalCenterX;
    const startY = originCenterY - finalCenterY;

    // Mathematically exact starting scale relative to the final rendered image size
    const startScale = Math.min(Math.max(origin.width / finalWidth, 0.05), 1.0);

    return {
      duration: 600,
      easing: quintOut,
      css: (t: number) => {
        const scale = startScale + (1 - startScale) * t;
        const x = startX * (1 - t);
        const y = startY * (1 - t);
        return `transform: translate3d(${x}px, ${y}px, 0) scale(${scale}); opacity: ${t};`;
      },
    };
  }

  let isLoaded = $state(false);
  let loadedUrl = $state("");

  $effect(() => {
    if (show && imageUrl) {
      if (loadedUrl !== imageUrl) {
        isLoaded = false;
        loadedUrl = "";
      }
      if (typeof window !== "undefined" && import.meta.env.MODE === "test") {
        loadedUrl = imageUrl;
        isLoaded = true;
      } else {
        const img = new Image();
        img.src = imageUrl;
        img.onload = () => {
          loadedUrl = imageUrl;
          isLoaded = true;
        };
      }
    } else if (!show) {
      // Reset loading states after exit transitions complete (600ms) to ensure next opening morphs dynamically
      const timer = setTimeout(() => {
        isLoaded = false;
        loadedUrl = "";
      }, 650);
      return () => clearTimeout(timer);
    }
  });

  let closeLightboxBtn = $state<HTMLButtonElement>();

  function openInStandaloneWindow(event: MouseEvent) {
    event.stopPropagation();
    if (!imageUrl || typeof window === "undefined") return;
    window.open(imageUrl, "_blank", "noopener,noreferrer");
  }

  // Focus Management
  $effect(() => {
    if (show) {
      const prevFocus = document.activeElement as HTMLElement;
      // Wait for next paint/animation frame to allow DOM to update and focus
      const frame = requestAnimationFrame(() => {
        closeLightboxBtn?.focus();
      });

      return () => {
        cancelAnimationFrame(frame);
        prevFocus?.focus();
      };
    }
  });

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      show = false;
    } else if (e.key === "Tab") {
      // Focus trap
      const selector =
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const focusable = lightboxBackdrop?.querySelectorAll(selector);
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };
</script>

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={lightboxBackdrop}
    role="dialog"
    aria-modal="true"
    aria-label="Image View"
    tabindex="-1"
    class="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 cursor-zoom-out w-full h-full outline-none"
    onclick={() => (show = false)}
    onkeydown={handleKeydown}
    transition:fade={{ duration: 500 }}
  >
    <div class="absolute top-4 right-4 flex items-center gap-2">
      <!-- Pop out button -->
      <button
        class="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition focus-visible:ring-2 focus-visible:ring-white outline-none disabled:opacity-40 disabled:cursor-not-allowed"
        onclick={openInStandaloneWindow}
        aria-label="Open image in standalone window"
        title="Open image in standalone window"
        disabled={!imageUrl}
        type="button"
      >
        <span aria-hidden="true" class="icon-[lucide--external-link] w-6 h-6"
        ></span>
      </button>

      {#if p2pHost.isHosting && modalUIStore.lightbox.imagePath}
        <button
          class="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition focus-visible:ring-2 focus-visible:ring-white outline-none"
          onclick={(e) => {
            e.stopPropagation();
            const originalPath = modalUIStore.lightbox.imagePath;
            if (originalPath) {
              const success = mapSession.showImageToPlayers(
                title,
                originalPath,
              );
              if (success) {
                notificationStore.notify("Shared image with guests", "success");
              }
            }
          }}
          aria-label="Share image with guests"
          title="Share with Guests"
          type="button"
        >
          <span aria-hidden="true" class="icon-[lucide--share-2] w-6 h-6"
          ></span>
        </button>
      {/if}

      <!-- Explicit Close Button -->
      <button
        bind:this={closeLightboxBtn}
        class="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition focus-visible:ring-2 focus-visible:ring-white outline-none"
        onclick={(e) => {
          e.stopPropagation();
          show = false;
        }}
        aria-label="Close image view"
        type="button"
      >
        <span aria-hidden="true" class="icon-[lucide--x] w-8 h-8"></span>
      </button>
    </div>

    {#if isLoaded && loadedUrl}
      <img
        src={loadedUrl}
        alt={title}
        loading="lazy"
        decoding="async"
        class="max-w-full max-h-full object-contain shadow-2xl rounded pointer-events-none"
        transition:zoomFrom
      />
    {:else}
      <div class="flex flex-col items-center gap-4 text-white/50">
        <span class="icon-[lucide--loader-2] w-12 h-12 animate-spin"></span>
        <span class="text-sm font-mono tracking-widest uppercase"
          >Resolving Neural Visual...</span
        >
      </div>
    {/if}
  </div>
{/if}
