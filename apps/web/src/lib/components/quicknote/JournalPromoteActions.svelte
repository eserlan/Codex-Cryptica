<script lang="ts">
  import type { PromotionScope, SessionJournal } from "session-journal-engine";
  import type { JournalPromotionState } from "./journal-promotion.svelte";
  import JournalPromoteSections from "./JournalPromoteSections.svelte";

  /**
   * The controls for turning journal content into entities (#3402 slice 4,
   * #3409): the whole journal, chosen parts, or one section. They work the same
   * for an active journal and an ended one (FR-042). A control with nothing to
   * make is disabled and says why (FR-044).
   */
  let {
    journal,
    promotion,
    onOpenForm,
  }: {
    journal: SessionJournal;
    promotion: JournalPromotionState;
    onOpenForm: (scope: PromotionScope, event: MouseEvent) => void;
  } = $props();

  const hasEntries = $derived(journal.entries.length > 0);

  const button =
    "rounded border border-theme-border px-2 py-1 font-header text-[9px] font-bold uppercase tracking-wider text-theme-text transition-colors hover:border-theme-primary hover:text-theme-primary disabled:opacity-40 disabled:hover:border-theme-border disabled:hover:text-theme-text";
</script>

<div
  id="journal-promote-panel"
  class="flex flex-col gap-2"
  data-testid="journal-promote-actions"
>
  <div class="flex flex-wrap items-center gap-2">
    {#if promotion.selecting}
      <button
        type="button"
        class={button}
        disabled={!promotion.hasSelection}
        onclick={(e) => onOpenForm(promotion.selectionScope(), e)}
        data-testid="promote-chosen"
      >
        Make entity from chosen parts
      </button>
      <button
        type="button"
        class={button}
        onclick={() => promotion.stopSelecting()}
        data-testid="promote-stop-choosing"
      >
        Cancel
      </button>
      {#if !promotion.hasSelection}
        <span class="text-[10px] text-theme-muted" data-testid="promote-reason">
          Choose at least one entry or section.
        </span>
      {/if}
    {:else}
      <button
        type="button"
        class={button}
        disabled={!hasEntries}
        onclick={(e) => onOpenForm({ kind: "journal" }, e)}
        data-testid="promote-journal"
      >
        Turn journal into a Note
      </button>
      <button
        type="button"
        class={button}
        disabled={!hasEntries}
        onclick={() => promotion.startSelecting()}
        data-testid="promote-choose-parts"
      >
        Choose parts
      </button>
      {#if !hasEntries}
        <span class="text-[10px] text-theme-muted" data-testid="promote-reason">
          Nothing to turn into an entity yet.
        </span>
      {/if}
    {/if}
  </div>

  {#if journal.sections.length > 0}
    <JournalPromoteSections {journal} {promotion} {onOpenForm} />
  {/if}
</div>
