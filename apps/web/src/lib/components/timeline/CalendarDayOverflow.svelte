<script lang="ts">
  import type { CalendarEventEntry } from "chronology-engine";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { createEntryClickHandlers } from "./entry-click";

  let {
    entries,
    label,
    onSelect,
    onEntryHover,
    onEntryLeave,
  }: {
    entries: CalendarEventEntry[];
    label: string;
    onSelect: (entry: CalendarEventEntry) => void;
    onEntryHover?: (entityId: string, e: MouseEvent) => void;
    onEntryLeave?: () => void;
  } = $props();

  let isOpen = $state(false);

  const { handleClick: handleEntryClick, handleDblClick: handleEntryDblClick } =
    createEntryClickHandlers(
      (entry) => {
        isOpen = false;
        onSelect(entry);
      },
      (id) => {
        isOpen = false;
        modalUIStore.openZenMode(id);
      },
    );
</script>

<div class="relative">
  <button
    type="button"
    class="rounded-full border border-theme-border bg-theme-bg/60 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-theme-muted transition hover:border-theme-primary hover:text-theme-primary"
    aria-expanded={isOpen}
    aria-label={`Show more events for ${label}`}
    onclick={() => (isOpen = !isOpen)}
  >
    +{entries.length} more
  </button>

  {#if isOpen}
    <div
      class="absolute left-0 top-full z-20 mt-2 min-w-52 rounded-2xl border border-theme-border bg-theme-surface p-2 shadow-2xl"
    >
      <div
        class="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-theme-primary"
      >
        {label}
      </div>
      <div
        class="flex max-h-60 flex-col gap-1 overflow-y-auto overscroll-contain pr-1"
      >
        {#each entries as entry (entry.entityId + entry.title)}
          <button
            type="button"
            class="rounded-xl px-2 py-2 text-left text-xs text-theme-text transition hover:bg-theme-primary/10 hover:text-theme-primary"
            onclick={() => handleEntryClick(entry)}
            ondblclick={() => handleEntryDblClick(entry.entityId)}
            onmouseenter={(e) => onEntryHover?.(entry.entityId, e)}
            onmousemove={(e) => onEntryHover?.(entry.entityId, e)}
            onmouseleave={() => onEntryLeave?.()}
          >
            <span class="block font-bold">{entry.title}</span>
            <span
              class="block text-[10px] uppercase tracking-[0.16em] text-theme-muted"
            >
              {entry.entityType}
            </span>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
