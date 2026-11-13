<script lang="ts">
  let {
    name,
    src,
    alt,
    aiLabel,
    credits,
  }: {
    name: string;
    src: string | null | undefined;
    alt: string;
    aiLabel?: string;
    credits?: string;
  } = $props();
</script>

{#if src}
  <figure
    class="inline-flex items-center gap-2.5 rounded-lg border border-theme-border bg-theme-surface p-2"
  >
    <img
      {src}
      {alt}
      width="64"
      height="80"
      loading="lazy"
      class="h-20 w-16 shrink-0 rounded object-cover"
    />
    <figcaption class="min-w-0 space-y-0.5 text-xs">
      <p class="truncate font-medium text-theme-text">{name}</p>
      {#if aiLabel}
        <p class="text-theme-text">{aiLabel}</p>
      {/if}
      {#if credits}
        <p class="truncate text-theme-text">{credits}</p>
      {/if}
    </figcaption>
  </figure>
{/if}
