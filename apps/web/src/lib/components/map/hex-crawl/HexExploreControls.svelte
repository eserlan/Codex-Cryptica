<script lang="ts">
  /**
   * The Explore action for one hex: Explore or Review discovery, the drafting
   * status line, and Cancel while drafting (contracts/ui-and-privacy.md).
   */
  let {
    draftPending,
    explored,
    generating,
    exploreBlocked = false,
    onReview,
    onExplore,
    onCancel,
  }: {
    draftPending: boolean;
    explored: boolean;
    generating: boolean;
    exploreBlocked?: boolean;
    onReview: () => void;
    onExplore: () => void;
    onCancel: () => void;
  } = $props();
</script>

<div class="space-y-2">
  {#if draftPending}
    <button
      type="button"
      onclick={onReview}
      class="w-full rounded-lg bg-theme-primary px-3 py-2 text-micro font-bold uppercase tracking-widest text-theme-bg"
    >
      Review discovery
    </button>
  {:else}
    <button
      type="button"
      onclick={onExplore}
      disabled={generating || exploreBlocked}
      class={explored
        ? "w-full rounded-lg border border-theme-border px-3 py-2 text-micro font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text disabled:opacity-50"
        : "w-full rounded-lg bg-theme-primary px-3 py-2 text-micro font-bold uppercase tracking-widest text-theme-bg disabled:opacity-50"}
    >
      Explore
    </button>
  {/if}
  <p role="status" aria-live="polite" class="text-micro text-theme-muted">
    {#if generating}Drafting…{/if}
  </p>
  {#if generating}
    <button
      type="button"
      onclick={onCancel}
      class="rounded-lg border border-theme-border px-3 py-1.5 text-micro font-bold uppercase tracking-widest text-theme-text"
    >
      Cancel
    </button>
  {/if}
</div>
