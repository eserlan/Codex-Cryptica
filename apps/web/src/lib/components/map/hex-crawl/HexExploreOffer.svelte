<script lang="ts">
  /**
   * A non-blocking prompt shown after the party enters a hex nobody has explored
   * (FR-035). It never starts generation by itself (FR-036).
   */
  let {
    onExplore,
    onDismiss,
  }: {
    onExplore: () => void;
    onDismiss: () => void;
  } = $props();
</script>

<section
  aria-label="Explore this hex"
  class="flex flex-wrap items-center gap-2 rounded-lg border border-theme-primary/40 bg-theme-surface/95 px-3 py-2 shadow-md backdrop-blur"
>
  <span
    class="icon-[lucide--compass] h-4 w-4 text-theme-primary"
    aria-hidden="true"
  ></span>
  <p class="flex-1 text-sm text-theme-text">This hex is new to the party.</p>
  <button
    type="button"
    onclick={onExplore}
    class="rounded-lg bg-theme-primary px-3 py-1.5 text-micro font-bold uppercase tracking-widest text-theme-bg hover:opacity-90"
  >
    Explore
  </button>
  <button
    type="button"
    onclick={onDismiss}
    class="rounded-lg border border-theme-border px-3 py-1.5 text-micro font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text"
  >
    Not now
  </button>
</section>
