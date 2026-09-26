<script lang="ts">
  /**
   * The small "Make entity" toggle beside the journal title (#3402 slice 4,
   * #3409). The whole-journal, choose-parts and section controls sit behind it
   * so they do not take room from the entry list in the fixed-height panel.
   */
  let { expanded, onToggle }: { expanded: boolean; onToggle: () => void } =
    $props();
</script>

<button
  type="button"
  onclick={onToggle}
  aria-expanded={expanded}
  aria-controls="journal-promote-panel"
  class="flex items-center gap-1 font-header text-[10px] font-bold uppercase tracking-wider text-theme-muted transition-colors hover:text-theme-primary"
  data-testid="promote-toggle"
>
  Make entity
  <span aria-hidden="true" class="icon-[lucide--chevron-down] h-3 w-3"></span>
</button>
