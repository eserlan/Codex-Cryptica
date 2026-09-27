<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";

  let {
    entityId,
    title,
  }: {
    entityId: string;
    title: string;
  } = $props();

  const initial = $derived(
    (title || "?").trim().charAt(0).toUpperCase() || "?",
  );
  let imageUrl = $state<string | null>(null);

  $effect(() => {
    const image = entityId ? vault.entities[entityId]?.image : undefined;
    if (!image) {
      imageUrl = null;
      return;
    }
    let cancelled = false;
    vault.resolveImageUrl(image).then((url) => {
      if (!cancelled) imageUrl = url || null;
    });
    return () => {
      cancelled = true;
    };
  });
</script>

{#if imageUrl}
  <img
    src={imageUrl}
    alt={title}
    {title}
    loading="lazy"
    decoding="async"
    class="h-5 w-5 shrink-0 rounded-full border border-theme-border object-cover"
  />
{:else}
  <span
    {title}
    aria-label={title}
    class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-theme-border bg-theme-primary/15 text-[9px] font-bold text-theme-primary"
  >
    {initial}
  </span>
{/if}
