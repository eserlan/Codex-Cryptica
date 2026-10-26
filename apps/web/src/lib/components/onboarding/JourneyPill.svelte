<script lang="ts">
  import type { JourneyStore } from "$lib/app/onboarding/journey/journey-store.svelte";

  /** The minimised card: a small pill that reopens guided setup. */
  let {
    store,
    onExpand,
    pillEl = $bindable(),
  }: {
    store: JourneyStore;
    onExpand: () => void;
    pillEl?: HTMLButtonElement;
  } = $props();

  const position = $derived(store.position);
</script>

<button
  bind:this={pillEl}
  type="button"
  class="ml-auto flex min-h-11 items-center gap-2 rounded-full border border-theme-primary/40 bg-theme-surface/95 px-4 text-xs font-bold text-theme-primary shadow-xl backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
  aria-expanded="false"
  data-testid="journey-collapse"
  onclick={onExpand}
>
  <span class="icon-[lucide--map-pin] h-4 w-4" aria-hidden="true"></span>
  Guided setup · {Math.min(position.index + 1, position.total)}/{position.total}
</button>
