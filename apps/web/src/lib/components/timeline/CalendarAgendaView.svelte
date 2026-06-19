<script lang="ts">
  import type { AgendaSection, CalendarEventEntry } from "chronology-engine";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { createEntryClickHandlers } from "./entry-click";

  let {
    sections,
    onSelect,
  }: {
    sections: AgendaSection[];
    onSelect: (entry: CalendarEventEntry) => void;
  } = $props();

  const { handleClick: handleEntryClick, handleDblClick: handleEntryDblClick } =
    createEntryClickHandlers(
      (entry) => onSelect(entry),
      (id) => modalUIStore.openZenMode(id),
    );
</script>

<div class="flex flex-col gap-4" data-testid="calendar-agenda-view">
  {#if sections.length === 0}
    <div
      class="rounded-2xl border border-theme-border bg-theme-surface/60 p-6 text-center text-sm text-theme-muted"
    >
      No events match the current filters.
    </div>
  {:else}
    {#each sections as section (section.id)}
      <section
        class="rounded-2xl border border-theme-border bg-theme-surface/60 p-4 sm:p-5"
      >
        <h3
          class="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-theme-primary"
        >
          {section.label}
        </h3>

        <div class="flex flex-col gap-2">
          {#each section.entries as entry (entry.entityId + entry.title)}
            <button
              type="button"
              class="flex flex-col gap-1 rounded-2xl border border-theme-border bg-theme-bg/40 px-3 py-3 text-left transition hover:border-theme-primary hover:bg-theme-primary/8"
              onclick={() => handleEntryClick(entry)}
              ondblclick={() => handleEntryDblClick(entry.entityId)}
            >
              <div class="flex items-start justify-between gap-3">
                <span class="text-sm font-bold text-theme-text">
                  {entry.title}
                </span>
                <span
                  class="text-[10px] uppercase tracking-[0.18em] text-theme-muted"
                >
                  {entry.entityType}
                </span>
              </div>
              <div class="text-xs text-theme-muted">
                {entry.displayDateLabel}
              </div>
            </button>
          {/each}
        </div>
      </section>
    {/each}
  {/if}
</div>
