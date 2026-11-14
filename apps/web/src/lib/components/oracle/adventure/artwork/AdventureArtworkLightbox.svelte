<script lang="ts">
  import type { AdventureLightboxController } from "./adventure-artwork-lightbox.svelte.js";

  let { controller }: { controller: AdventureLightboxController } = $props();
  let closeButton = $state<HTMLButtonElement>();
  let fullSrc = $state<string | undefined>(undefined);

  $effect(() => {
    if (!controller.show) return;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const frame = requestAnimationFrame(() => closeButton?.focus());
    return () => {
      cancelAnimationFrame(frame);
      if (opener?.isConnected) {
        opener.focus();
      }
    };
  });

  $effect(() => {
    const item = controller.show ? controller.current : null;
    fullSrc = undefined;
    if (!item?.loadFull) return;
    const controllerAbort = new AbortController();
    let release: (() => void) | undefined;
    let cancelled = false;

    void item
      .loadFull(controllerAbort.signal)
      .then((handle) => {
        if (!handle) return;
        if (cancelled) {
          handle.release();
          return;
        }
        release = handle.release;
        fullSrc = handle.url;
      })
      .catch(() => {
        // Keep preview src if full display load fails.
      });

    return () => {
      cancelled = true;
      controllerAbort.abort();
      release?.();
      fullSrc = undefined;
    };
  });

  function handleKeydown(event: KeyboardEvent): void {
    if (!controller.show) return;
    if (event.key === "Escape") {
      event.preventDefault();
      controller.close();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      controller.next();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      controller.prev();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if controller.show && controller.current}
  {@const current = controller.current}
  {@const total = controller.items.length}
  <div
    role="dialog"
    aria-modal="true"
    aria-label={current.title}
    data-testid="adventure-artwork-lightbox"
    class="fixed inset-0 z-[200] flex flex-col items-center justify-between bg-black/90 p-4 text-white"
  >
    <button
      type="button"
      aria-label="Close lightbox backdrop"
      class="absolute inset-0 cursor-zoom-out"
      onclick={() => controller.close()}
    ></button>

    <div
      class="relative z-10 flex w-full max-w-5xl items-center justify-between"
    >
      <span
        class="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90"
        data-testid="adventure-lightbox-counter"
      >
        {controller.activeIndex + 1} / {total}
      </span>
      <button
        bind:this={closeButton}
        type="button"
        aria-label="Close image lightbox"
        class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        onclick={() => controller.close()}
      >
        <span aria-hidden="true" class="icon-[lucide--x] h-5 w-5"></span>
      </button>
    </div>

    <div
      class="relative z-10 flex min-h-0 w-full max-w-6xl flex-1 items-center justify-center gap-3 py-3"
    >
      {#if total > 1}
        <button
          type="button"
          aria-label="Previous image"
          data-testid="adventure-lightbox-prev"
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          onclick={() => controller.prev()}
        >
          <span aria-hidden="true" class="icon-[lucide--chevron-left] h-6 w-6"
          ></span>
        </button>
      {/if}

      <img
        src={fullSrc ?? current.src}
        alt={current.alt}
        class="max-h-[75vh] max-w-[82vw] rounded-lg object-contain shadow-2xl"
      />

      {#if total > 1}
        <button
          type="button"
          aria-label="Next image"
          data-testid="adventure-lightbox-next"
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          onclick={() => controller.next()}
        >
          <span aria-hidden="true" class="icon-[lucide--chevron-right] h-6 w-6"
          ></span>
        </button>
      {/if}
    </div>

    <div class="relative z-10 max-w-2xl space-y-1 text-center">
      <p class="text-sm font-semibold text-white">{current.title}</p>
      <p class="text-xs text-white/80">{current.alt}</p>
      {#if current.subtitle}
        <p class="text-xs text-white/60">{current.subtitle}</p>
      {/if}
    </div>
  </div>
{/if}
