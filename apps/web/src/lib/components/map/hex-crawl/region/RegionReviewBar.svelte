<script lang="ts">
  import type { HexLabelConfig, HexOrientation } from "map-engine";
  import { onMount } from "svelte";
  import RegionReviewMessage from "./RegionReviewMessage.svelte";
  import RegionReviewBody from "./RegionReviewBody.svelte";
  import type { RegionGenerationStore } from "#lib/stores/hex-crawl/region-generation.svelte.js";

  /**
   * Review a proposed region: change the seed or settings, adjust single hexes,
   * then accept or cancel. Sits at the bottom of the map and can be collapsed so
   * the proposal stays visible on a phone.
   */
  let {
    store,
    selectedKey,
    copy,
    labelConfig,
    orientation,
    onSelect,
  }: {
    store: RegionGenerationStore;
    selectedKey: string | null;
    copy?: (text: string) => Promise<boolean>;
    labelConfig?: HexLabelConfig;
    orientation?: HexOrientation;
    onSelect?: (key: string) => void;
  } = $props();

  let collapsed = $state(false);
  let bar = $state<HTMLElement | null>(null);

  onMount(() => {
    // Move focus into the review, and give it back to where it came from when it closes.
    const opener = document.activeElement;
    bar?.focus();
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  });

  const review = $derived(store.review);
  const count = $derived(
    review ? Object.keys(review.proposal.hexes).length : 0,
  );
  const adjusted = $derived(
    review ? Object.keys(review.adjustments).length : 0,
  );
  const OPERATION_LABEL = {
    area: "Generate area",
    grow: "Grow from hex",
    gaps: "Fill gaps",
    regenerate: "Regenerate area",
  } as const;
</script>

{#if review}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <section
    bind:this={bar}
    tabindex="-1"
    onkeydown={(event) => {
      // Escape inside a field belongs to the field, not to the whole review.
      const inField = (event.target as HTMLElement).closest("input, select");
      if (event.key === "Escape" && !inField) store.cancel();
    }}
    data-testid="region-review-bar"
    aria-label="Review generated region"
    class="pointer-events-auto absolute inset-x-2 bottom-2 z-40 max-h-[50%] md:max-h-[70%] overflow-y-auto rounded-xl border border-theme-border bg-theme-surface p-3 shadow-xl md:left-auto md:right-2 md:w-96"
  >
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-sm font-bold text-theme-text">
        {OPERATION_LABEL[review.operation]}
      </h2>
      <button
        type="button"
        class="min-h-11 min-w-11 rounded-lg text-theme-text hover:text-theme-text"
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand review" : "Collapse review"}
        onclick={() => (collapsed = !collapsed)}
      >
        <span
          class="{collapsed
            ? 'icon-[lucide--chevron-up]'
            : 'icon-[lucide--chevron-down]'} h-4 w-4"
          aria-hidden="true"
        ></span>
      </button>
    </div>

    <p class="text-xs text-theme-text">
      Covers {count + review.proposal.protected} hexes. {count} hexes to generate{review
        .proposal.protected > 0
        ? `, ${review.proposal.protected} protected`
        : ""}{adjusted > 0 ? `, ${adjusted} changed by you` : ""}.
    </p>
    <RegionReviewMessage {store} />
    <p
      data-testid="region-ai-off"
      class="mt-1 flex items-center gap-1 text-xs text-theme-text"
    >
      <span class="icon-[lucide--cpu] h-3.5 w-3.5" aria-hidden="true"></span>
      Generated on this device. No AI is used.
    </p>

    {#if !collapsed}
      <RegionReviewBody
        {store}
        {selectedKey}
        {copy}
        {labelConfig}
        {orientation}
        {onSelect}
      />
    {/if}

    <div
      class="sticky bottom-0 -mx-3 -mb-3 mt-3 flex gap-2 bg-theme-surface px-3 pb-3 pt-2"
    >
      <button
        type="button"
        class="min-h-11 flex-1 rounded-lg border border-theme-border text-sm font-bold text-theme-text"
        onclick={() => store.cancel()}>Cancel</button
      >
      <button
        type="button"
        class="min-h-11 flex-1 rounded-lg bg-theme-primary text-sm font-bold text-theme-on-primary disabled:opacity-50"
        disabled={store.busy || count === 0}
        onclick={() => store.accept()}>Accept</button
      >
    </div>
  </section>
{/if}
