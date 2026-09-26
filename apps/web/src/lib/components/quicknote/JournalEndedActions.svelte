<script lang="ts">
  /**
   * Shown right after a session ends (#3402 slice 4, #3409, FR-043): a gentle
   * offer to keep some of it in the world. Nothing here is required; ending
   * the session has already happened, and the same choices stay available on
   * the ended journal afterwards.
   */
  let {
    onTurnIntoNote,
    onChooseParts,
    onDismiss,
  }: {
    onTurnIntoNote: (event: MouseEvent) => void;
    onChooseParts: (event: MouseEvent) => void;
    onDismiss: () => void;
  } = $props();
</script>

<div
  role="region"
  aria-label="Session ended"
  class="flex flex-col gap-2 rounded border border-theme-accent/40 bg-theme-accent/5 p-3"
  data-testid="journal-ended-actions"
>
  <p class="text-xs text-theme-text">
    Session ended. Would you like to keep any of it in your world?
  </p>
  <div class="flex flex-wrap gap-2">
    <button
      type="button"
      onclick={onTurnIntoNote}
      class="rounded bg-theme-primary px-3 py-1.5 font-header text-[10px] font-bold uppercase text-theme-bg transition-colors hover:bg-theme-secondary"
      data-testid="ended-turn-into-note"
    >
      Turn into a Note
    </button>
    <button
      type="button"
      onclick={onChooseParts}
      class="rounded border border-theme-border px-3 py-1.5 font-header text-[10px] font-bold uppercase text-theme-text transition-colors hover:border-theme-primary hover:text-theme-primary"
      data-testid="ended-choose-parts"
    >
      Choose parts
    </button>
    <button
      type="button"
      onclick={onDismiss}
      class="px-2 py-1.5 text-[10px] text-theme-muted transition-colors hover:text-theme-text"
      data-testid="ended-dismiss"
    >
      Leave it as it is
    </button>
  </div>
</div>
