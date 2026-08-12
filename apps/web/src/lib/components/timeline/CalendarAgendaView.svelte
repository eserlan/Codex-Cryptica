<script lang="ts">
  import type { AgendaSection, CalendarEventEntry } from "chronology-engine";
  import { onDestroy, onMount } from "svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { createEntryClickHandlers } from "./entry-click";
  import { browserPerformanceRecorder } from "$lib/services/performance/browser-performance-capture";
  import { getRenderWindow, sliceRenderWindow } from "./utils/render-window";

  type AgendaRenderItem =
    | { kind: "section"; section: AgendaSection }
    | { kind: "entry"; entry: CalendarEventEntry };

  let {
    sections,
    onSelect,
  }: {
    sections: AgendaSection[];
    onSelect: (entry: CalendarEventEntry) => void;
  } = $props();

  const entryHandlers = createEntryClickHandlers(
    (entry) => onSelect(entry),
    (id) => modalUIStore.openZenMode(id),
  );
  const { handleClick: handleEntryClick, handleDblClick: handleEntryDblClick } =
    entryHandlers;
  onDestroy(() => entryHandlers.dispose());

  let container = $state<HTMLDivElement>();
  let scrollTop = $state(0);
  let viewportHeight = $state(900);
  const timelineOpenSpan = browserPerformanceRecorder.start("timeline_open");

  onMount(() => {
    requestAnimationFrame(() => {
      timelineOpenSpan.complete(() => ({
        resultCount: renderItems.length,
        domNodeCount: container?.querySelectorAll("*").length ?? 0,
      }));
    });
  });

  const renderItems = $derived.by<AgendaRenderItem[]>(() =>
    sections.flatMap((section) => [
      { kind: "section", section } as const,
      ...section.entries.map((entry) => ({ kind: "entry", entry }) as const),
    ]),
  );
  const renderWindow = $derived(
    getRenderWindow(renderItems.length, scrollTop, viewportHeight, 84),
  );
  const visibleItems = $derived(sliceRenderWindow(renderItems, renderWindow));

  const handleScroll = () => {
    if (!container) return;
    scrollTop = container.scrollTop;
    viewportHeight = container.clientHeight || viewportHeight;
  };
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  bind:this={container}
  onscroll={handleScroll}
  role="region"
  aria-label="Agenda"
  tabindex="0"
  class="flex h-full flex-col gap-4 overflow-y-auto"
  data-testid="calendar-agenda-view"
>
  {#if sections.length === 0}
    <div
      class="rounded-2xl border border-theme-border bg-theme-surface/60 p-6 text-center text-sm text-theme-muted"
    >
      No events match the current filters.
    </div>
  {:else}
    {#if renderWindow.topSpacer > 0}
      <div
        aria-hidden="true"
        style:height={`${renderWindow.topSpacer}px`}
      ></div>
    {/if}

    {#each visibleItems as item (item.kind === "section" ? `section-${item.section.id}` : `entry-${item.entry.entityId}-${item.entry.title}`)}
      {#if item.kind === "section"}
        <h3
          class="rounded-2xl border border-theme-border bg-theme-surface/60 p-4 text-xs font-bold uppercase tracking-[0.22em] text-theme-primary sm:p-5"
        >
          {item.section.label}
        </h3>
      {:else}
        <button
          type="button"
          class="flex flex-col gap-1 rounded-2xl border border-theme-border bg-theme-bg/40 px-3 py-3 text-left transition hover:border-theme-primary hover:bg-theme-primary/8"
          onclick={() => handleEntryClick(item.entry)}
          ondblclick={() => handleEntryDblClick(item.entry.entityId)}
        >
          <div class="flex items-start justify-between gap-3">
            <span class="text-sm font-bold text-theme-text">
              {item.entry.title}
            </span>
            <span
              class="text-[10px] uppercase tracking-[0.18em] text-theme-muted"
            >
              {item.entry.entityType}
            </span>
          </div>
          <div class="text-xs text-theme-muted">
            {item.entry.displayDateLabel}
          </div>
        </button>
      {/if}
    {/each}

    {#if renderWindow.bottomSpacer > 0}
      <div
        aria-hidden="true"
        style:height={`${renderWindow.bottomSpacer}px`}
      ></div>
    {/if}
  {/if}
</div>
