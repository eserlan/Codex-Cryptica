<script lang="ts">
  import { fade, scale } from "svelte/transition";

  let {
    introTitle,
    faqs,
  }: {
    introTitle: string;
    faqs: {
      question: string;
      answer: string;
      image?: string;
      imageAlt?: string;
      inlineImage?: string;
      inlineImageAlt?: string;
    }[];
  } = $props();

  let lightboxImage = $state<{ src: string; alt: string } | null>(null);
  let closeLightboxBtn = $state<HTMLButtonElement>();

  function openLightbox(src: string, alt: string) {
    lightboxImage = { src, alt };
  }

  function closeLightbox() {
    lightboxImage = null;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") closeLightbox();
  }

  $effect(() => {
    if (lightboxImage) {
      const prevFocus = document.activeElement as HTMLElement | null;
      const frame = requestAnimationFrame(() => closeLightboxBtn?.focus());
      return () => {
        cancelAnimationFrame(frame);
        prevFocus?.focus();
      };
    }
  });
</script>

{#if faqs.length > 0}
  <section class="border-t border-theme-border/60 px-6 py-12">
    <div class="max-w-4xl mx-auto">
      <h2
        class="font-header font-bold text-xl uppercase tracking-wider text-theme-primary mb-6"
      >
        {introTitle} FAQ
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        {#each faqs as faq (faq.question)}
          {#if faq.image}
            <article
              class="md:col-span-2 border border-theme-primary/30 bg-theme-surface/30 rounded-xl overflow-hidden"
            >
              <div
                class="flex items-center gap-2 px-4 py-2.5 bg-theme-primary/15 border-b border-theme-primary/25"
              >
                <span
                  class="icon-[lucide--sparkles] w-3.5 h-3.5 text-theme-primary shrink-0"
                  aria-hidden="true"
                ></span>
                <p
                  class="text-[10px] font-bold uppercase tracking-widest font-header text-theme-primary"
                >
                  Codex Cryptica exclusive — generate full Delve Canvases and
                  Dossiers inside the app
                </p>
              </div>
              <button
                type="button"
                onclick={() =>
                  openLightbox(faq.image ?? "", faq.imageAlt ?? "")}
                class="w-full cursor-zoom-in group relative block"
                aria-label="View larger image: {faq.imageAlt ?? faq.question}"
              >
                <img
                  src={faq.image}
                  alt={faq.imageAlt ?? ""}
                  loading="lazy"
                  class="w-full h-auto block border-b border-theme-primary/20"
                />
                <span
                  class="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest font-header text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span
                    class="icon-[lucide--zoom-in] w-3 h-3"
                    aria-hidden="true"
                  ></span>
                  View larger
                </span>
              </button>
              <div class="p-6">
                <h3
                  class="font-header font-bold text-sm uppercase tracking-wider mb-2"
                >
                  {faq.question}
                </h3>
                <p class="text-sm text-theme-muted leading-relaxed">
                  {faq.answer}
                </p>
                {#if faq.inlineImage}
                  <div class="mt-4 inline-flex flex-col gap-1.5">
                    <img
                      src={faq.inlineImage}
                      alt={faq.inlineImageAlt ?? ""}
                      loading="lazy"
                      class="rounded-lg border border-theme-primary/25 max-w-full h-auto"
                    />
                    <span
                      class="text-[9px] uppercase tracking-widest font-header text-theme-muted/70"
                    >
                      The Build Delve Canvas button on any generated result
                    </span>
                  </div>
                {/if}
              </div>
            </article>
          {:else}
            <article
              class="border border-theme-border/60 bg-theme-surface/30 rounded-xl p-5"
            >
              <h3
                class="font-header font-bold text-sm uppercase tracking-wider mb-2"
              >
                {faq.question}
              </h3>
              <p class="text-sm text-theme-muted leading-relaxed">
                {faq.answer}
              </p>
            </article>
          {/if}
        {/each}
      </div>
    </div>
  </section>
{/if}

{#if lightboxImage}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    role="dialog"
    aria-modal="true"
    aria-label="Image view"
    tabindex="-1"
    class="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 cursor-zoom-out outline-none"
    onclick={closeLightbox}
    onkeydown={handleKeydown}
    transition:fade={{ duration: 200 }}
  >
    <button
      bind:this={closeLightboxBtn}
      type="button"
      class="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition focus-visible:ring-2 focus-visible:ring-white outline-none"
      onclick={(e) => {
        e.stopPropagation();
        closeLightbox();
      }}
      aria-label="Close image view"
    >
      <span aria-hidden="true" class="icon-[lucide--x] w-8 h-8"></span>
    </button>
    <img
      src={lightboxImage.src}
      alt={lightboxImage.alt}
      class="max-w-full max-h-full object-contain shadow-2xl rounded pointer-events-none"
      transition:scale={{ duration: 200, start: 0.95 }}
    />
  </div>
{/if}
