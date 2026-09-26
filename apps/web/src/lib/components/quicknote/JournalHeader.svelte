<script lang="ts">
  import type { Snippet } from "svelte";

  /**
   * The title row of an open journal (#3402 slice 1, #3406): the journal's
   * title, with End Session while it is running or Back when looking at a past
   * one. Ending stays a single action with no dialog (spec 163, FR-043).
   */
  let {
    title,
    active,
    isEnding,
    onEnd,
    onBack,
    extras,
  }: {
    title: string;
    active: boolean;
    isEnding: boolean;
    onEnd: () => void;
    onBack: () => void;
    /** Small controls shown beside the title (the Make entity toggle). */
    extras?: Snippet;
  } = $props();
</script>

<div
  class="flex items-center justify-between border-b border-theme-border/40 pb-2"
>
  <h4
    class="font-header text-xs font-bold uppercase tracking-widest text-theme-primary"
  >
    {title}
  </h4>
  <div class="flex items-center gap-3">
    {@render extras?.()}
    {#if active}
      <button
        type="button"
        onclick={onEnd}
        disabled={isEnding}
        class="text-[10px] font-bold uppercase tracking-wider text-theme-danger transition-colors hover:underline"
        data-testid="end-session"
      >
        End Session
      </button>
    {:else}
      <button
        type="button"
        onclick={onBack}
        class="text-[10px] text-theme-muted transition-colors hover:text-theme-primary"
        data-testid="back-to-current-journal"
      >
        Back
      </button>
    {/if}
  </div>
</div>
