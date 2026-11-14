<script lang="ts">
  import AdventureNpcPortrait from "./AdventureNpcPortrait.svelte";

  let {
    name,
    alt,
    aiLabel,
    credits,
    load,
    loadFull,
  }: {
    name: string;
    alt: string;
    aiLabel?: string;
    credits?: string;
    load: (
      signal: AbortSignal,
    ) => Promise<{ url: string; release: () => void } | null>;
    loadFull?: (
      signal: AbortSignal,
    ) => Promise<{ url: string; release: () => void } | null>;
  } = $props();

  let src = $state<string | undefined>(undefined);

  $effect(() => {
    const controller = new AbortController();
    let release: (() => void) | undefined;
    let cancelled = false;

    void load(controller.signal)
      .then((result) => {
        if (!result) return;
        if (cancelled) {
          result.release();
          return;
        }
        release = result.release;
        src = result.url;
      })
      .catch(() => {
        // Inline portrait is optional; skip silently when unavailable.
      });

    return () => {
      cancelled = true;
      controller.abort();
      release?.();
      src = undefined;
    };
  });
</script>

{#if src}
  <AdventureNpcPortrait
    {name}
    {src}
    {alt}
    {aiLabel}
    {credits}
    {loadFull}
    size="inline"
  />
{/if}
