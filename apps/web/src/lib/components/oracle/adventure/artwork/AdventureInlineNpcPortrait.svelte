<script lang="ts">
  import AdventureNpcPortrait from "./AdventureNpcPortrait.svelte";
  import { loadWhenVisible } from "./lazy-artwork-load.js";

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
  let container = $state<HTMLElement>();

  $effect(() => {
    const element = container;
    if (!element) return;
    const stop = loadWhenVisible(element, load, (result) => {
      src = result?.url;
    });
    return () => {
      stop();
      src = undefined;
    };
  });
</script>

<div bind:this={container}>
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
</div>
