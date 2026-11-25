<script lang="ts">
  import { getAdventureLightbox } from "./adventure-artwork-lightbox.svelte.js";

  let {
    name,
    src,
    alt,
    aiLabel,
    credits,
    description,
    size = "compact",
    loadFull,
  }: {
    name: string;
    src: string | null | undefined;
    alt: string;
    aiLabel?: string;
    credits?: string;
    description?: string;
    size?: "compact" | "inline";
    loadFull?: (
      signal: AbortSignal,
    ) => Promise<{ url: string; release: () => void } | null>;
  } = $props();

  const imgWidth = $derived(size === "inline" ? 112 : 96);
  const imgHeight = $derived(size === "inline" ? 144 : 128);
  const imgClass = $derived(
    size === "inline"
      ? "h-36 w-28 rounded object-cover"
      : "h-32 w-24 rounded object-cover",
  );

  const lightbox = getAdventureLightbox();
  const subtitle = $derived(
    [aiLabel, credits].filter((part) => Boolean(part)).join(" · ") || undefined,
  );
  const lightboxItem = $derived(
    src
      ? {
          key: `npc:${name}:${alt}`,
          src,
          alt,
          title: name,
          subtitle,
          description,
          loadFull,
        }
      : null,
  );

  $effect(() => {
    if (!lightbox || !lightboxItem) return;
    return lightbox.register(lightboxItem);
  });
</script>

{#if src}
  <figure
    class="inline-flex max-w-xs items-center gap-2.5 rounded-lg border border-theme-border bg-theme-surface p-2"
  >
    <button
      type="button"
      class="shrink-0 cursor-zoom-in rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
      aria-label={`Enlarge portrait of ${name}`}
      onclick={() => lightboxItem && lightbox?.open(lightboxItem)}
    >
      <img
        {src}
        {alt}
        width={imgWidth}
        height={imgHeight}
        loading="lazy"
        class={imgClass}
      />
    </button>
    <figcaption class="min-w-0 space-y-0.5 text-xs">
      <p class="truncate font-medium text-theme-text">{name}</p>
      {#if description}
        <p
          class="line-clamp-3 text-xs text-theme-text"
          data-testid="adventure-npc-portrait-description"
        >
          {description}
        </p>
      {/if}
    </figcaption>
  </figure>
{/if}
