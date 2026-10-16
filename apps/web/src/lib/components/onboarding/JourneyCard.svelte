<script lang="ts">
  import type { JourneyStore } from "$lib/app/onboarding/journey/journey-store.svelte";
  import JourneyFinish from "./JourneyFinish.svelte";
  import JourneyStep from "./JourneyStep.svelte";
  import JourneyPill from "./JourneyPill.svelte";
  import JourneyHeader from "./JourneyHeader.svelte";
  import type { HighlightRect } from "$lib/services/help-assistant/help-highlight.svelte";

  let {
    store,
    highlightRect = () => null,
    viewportHeight = () =>
      typeof window === "undefined" ? 800 : window.innerHeight,
  }: {
    store: JourneyStore;
    /** Where Cif's highlight ring is, so the card never covers it (FR-028). */
    highlightRect?: () => HighlightRect | null;
    viewportHeight?: () => number;
  } = $props();

  let pill = $state<HTMLButtonElement>();
  let expander = $state<HTMLButtonElement>();

  const def = $derived(store.definition);
  const step = $derived(store.step);
  const finished = $derived(store.progress?.outcome === "finished");

  /** A highlight in the lower half moves the card to the top edge. */
  const placeTop = $derived.by(() => {
    const r = highlightRect();
    return !!r && r.top + r.height / 2 > viewportHeight() / 2;
  });

  const placementClass = $derived(
    placeTop
      ? "top-24"
      : "bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-14",
  );

  function collapse() {
    store.collapsed = true;
    queueMicrotask(() => pill?.focus({ preventScroll: true }));
  }

  function expand() {
    store.collapsed = false;
    queueMicrotask(() => expander?.focus({ preventScroll: true }));
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== "Escape" || store.collapsed) return;
    // Escape collapses the card and never exits the journey (FR-026).
    event.preventDefault();
    event.stopPropagation();
    collapse();
  }
</script>

{#if store.active && def && store.progress}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <section
    aria-labelledby="journey-card-title"
    data-testid="journey-card"
    data-placement={placeTop ? "top" : "bottom"}
    onkeydown={handleKeydown}
    class="fixed z-[85] inset-x-2 sm:inset-x-auto sm:right-6 sm:w-[22rem] {placementClass}"
  >
    {#if store.collapsed}
      <JourneyPill bind:pillEl={pill} onExpand={expand} {store} />
    {:else}
      <div
        class="rounded-2xl border border-theme-primary/40 bg-theme-surface/98 p-4 shadow-2xl ring-1 ring-theme-primary/20 backdrop-blur-md"
      >
        <JourneyHeader
          {store}
          bind:expanderEl={expander}
          onCollapse={collapse}
        />

        {#if finished}
          <JourneyFinish {store} />
        {:else if step}
          <JourneyStep {store} />
        {/if}
      </div>
    {/if}
    <p class="sr-only" aria-live="polite">{store.announcement}</p>
  </section>
{/if}
