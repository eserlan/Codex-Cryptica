<script lang="ts">
  import type { SessionJournal } from "session-journal-engine";
  import JournalEndedActions from "./JournalEndedActions.svelte";

  /**
   * What the Session Journal shows when no journal is running (#3402 slice 1,
   * #3406): the Start / Resume button. Right after a session ends it also
   * carries the optional offer to keep some of it in the world (slice 4, #3409,
   * FR-043), but only when the session had something in it.
   */
  let {
    label,
    onStart,
    endedJournal,
    onTurnIntoNote,
    onChooseParts,
    onDismiss,
  }: {
    label: string;
    onStart: () => void;
    /** The journal that just ended, if the offer should be shown for it. */
    endedJournal?: SessionJournal;
    onTurnIntoNote: () => void;
    onChooseParts: () => void;
    onDismiss: () => void;
  } = $props();
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-3 text-center">
  {#if endedJournal && endedJournal.entries.length > 0}
    <JournalEndedActions {onTurnIntoNote} {onChooseParts} {onDismiss} />
  {/if}
  <span
    aria-hidden="true"
    class="icon-[lucide--book-open] h-10 w-10 text-theme-accent opacity-50"
  ></span>
  <button
    type="button"
    onclick={onStart}
    class="rounded-lg bg-theme-primary px-4 py-2 font-header text-xs font-bold uppercase tracking-widest text-theme-bg transition-colors hover:bg-theme-secondary"
    data-testid="session-journal-control"
  >
    {label}
  </button>
</div>
