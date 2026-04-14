<script lang="ts">
  import { fade } from "svelte/transition";

  let {
    show = $bindable(false),
    imageUrl,
    title,
  } = $props<{
    show: boolean;
    imageUrl: string;
    title: string;
  }>();

  let lightboxBackdrop = $state<HTMLDivElement>();
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
      // Small delay to allow DOM to update
      setTimeout(() => {
        closeLightboxBtn?.focus();
      }, 0);

      return () => {
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
    transition:fade={{ duration: 200 }}
  >
    <div class="absolute top-4 right-4 flex items-center gap-2">
      <button
        class="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition focus-visible:ring-2 focus-visible:ring-white outline-none disabled:opacity-40 disabled:cursor-not-allowed"
        onclick={openInStandaloneWindow}
        aria-label="Open image in standalone window"
        title="Open image in standalone window"
        disabled={!imageUrl}
        type="button"
      >
        <span class="icon-[lucide--external-link] w-6 h-6"></span>
      </button>

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
        <span class="icon-[lucide--x] w-8 h-8"></span>
      </button>
    </div>

    {#if imageUrl}
      <img
        src={imageUrl}
        alt={title}
        class="max-w-full max-h-full object-contain shadow-2xl rounded pointer-events-none"
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
