<script lang="ts">
  import type { PromotionScope, SessionJournal } from "session-journal-engine";
  import type { JournalPromotionState } from "./journal-promotion.svelte";

  /**
   * The journal's sections as chips, each with "Make entity" or, while
   * choosing parts, a checkbox (#3402 slice 4, #3409). A section with no
   * entries is disabled and says so (FR-044). Ticking a section never ticks
   * its entries (FR-036).
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

  function sectionHasEntries(sectionId: string): boolean {
    return journal.entries.some((entry) => entry.sectionId === sectionId);
  }
</script>

<ul class="flex flex-wrap gap-2" aria-label="Sections">
  {#each journal.sections as section (section.id)}
    <li
      class="flex items-center gap-1.5 rounded-full border border-theme-border/40 px-2 py-0.5 text-[10px] text-theme-text"
      data-testid="promote-section"
    >
      {#if promotion.selecting}
        <label class="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={promotion.isSectionSelected(section.id)}
            onchange={() => promotion.toggleSection(section.id)}
            aria-label={`Choose section: ${section.name}`}
          />
          {section.name}
        </label>
      {:else}
        <span>{section.name}</span>
        {#if !sectionHasEntries(section.id)}
          <span class="text-theme-muted">no entries yet</span>
        {/if}
        <button
          type="button"
          class="font-header text-[9px] font-bold uppercase tracking-wider text-theme-muted transition-colors hover:text-theme-primary disabled:opacity-40 disabled:hover:text-theme-muted"
          disabled={!sectionHasEntries(section.id)}
          title={sectionHasEntries(section.id)
            ? undefined
            : "This section has no entries yet."}
          aria-label={`Make entity from section: ${section.name}`}
          onclick={(e) =>
            onOpenForm({ kind: "section", sectionId: section.id }, e)}
          data-testid="promote-section-button"
        >
          Make entity
        </button>
      {/if}
    </li>
  {/each}
</ul>
