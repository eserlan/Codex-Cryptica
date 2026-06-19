<script lang="ts">
  import type {
    CalendarEventEntry,
    CalendarMonthViewModel,
  } from "chronology-engine";
  import { calendarEngine } from "chronology-engine";
  import CalendarDayOverflow from "./CalendarDayOverflow.svelte";
  import GraphTooltip from "$lib/components/graph/GraphTooltip.svelte";
  import { calendarStore } from "$lib/stores/calendar.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { onDestroy } from "svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { createEntryClickHandlers } from "./entry-click";

  const CELL_DBLCLICK_DELAY = 260;

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let {
    month,
    onSelect,
    onDropEntity,
    onCreateAtDate,
    onNextMonth,
    onPrevMonth,
  }: {
    month: CalendarMonthViewModel;
    onSelect: (entry: CalendarEventEntry) => void;
    onDropEntity?: (
      entityId: string,
      date: { year: number; month: number; day: number },
    ) => void;
    onCreateAtDate?: (date: {
      year: number;
      month: number;
      day: number;
    }) => void;
    onNextMonth?: () => void;
    onPrevMonth?: () => void;
  } = $props();

  let dragOverDay = $state<string | null>(null);

  let touchStartX = $state(0);
  let touchStartY = $state(0);
  let touchEndX = $state(0);
  let touchEndY = $state(0);

  function handleTouchStart(e: TouchEvent) {
    const touch = e.changedTouches[0];
    touchStartX = touch?.clientX ?? 0;
    touchStartY = touch?.clientY ?? 0;
  }

  function handleTouchEnd(e: TouchEvent) {
    const touch = e.changedTouches[0];
    touchEndX = touch?.clientX ?? 0;
    touchEndY = touch?.clientY ?? 0;
    handleSwipe();
  }

  function handleSwipe() {
    const minSwipeDistance = 50;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    if (
      Math.abs(deltaX) <= minSwipeDistance ||
      Math.abs(deltaX) <= Math.abs(deltaY)
    ) {
      return;
    }

    if (deltaX > 0) {
      onPrevMonth?.();
    } else {
      onNextMonth?.();
    }
  }

  /** True when this day cell matches the FR-012 resolved current date (all three fields). */
  function isToday(year: number, monthNum: number, day: number): boolean {
    const cur = calendarStore.calendarCurrentDate;
    if (!cur || cur.date.day === undefined) return false;
    return (
      cur.date.year === year &&
      cur.date.month === monthNum &&
      cur.date.day === day
    );
  }

  function dayLabel(year: number, monthNumber: number, day: number): string {
    const months = calendarStore.config
      ? calendarEngine.getMonths(calendarStore.config)
      : null;
    const monthName = months?.[monthNumber - 1]?.name ?? `Month ${monthNumber}`;
    return `${monthName} ${day}, ${year}`;
  }

  let hoveredEntityId = $state<string | null>(null);
  let hoverPos = $state<{ x: number; y: number } | null>(null);
  const hoveredEntity = $derived(
    hoveredEntityId ? (vault.entities[hoveredEntityId] ?? null) : null,
  );

  function setHover(entityId: string, e: MouseEvent) {
    hoveredEntityId = entityId;
    hoverPos = { x: e.clientX, y: e.clientY };
  }
  function clearHover() {
    hoveredEntityId = null;
    hoverPos = null;
  }

  function dayKey(year: number, month: number, day: number): string {
    return `${year}-${month}-${day}`;
  }

  const entryHandlers = createEntryClickHandlers(
    (entry) => onSelect(entry),
    (id) => modalUIStore.openZenMode(id),
  );
  const { handleClick: handleEntryClick, handleDblClick: handleEntryDblClick } =
    entryHandlers;
  onDestroy(() => entryHandlers.dispose());

  // Per-cell click counters for reliable double-click detection on <section>
  // elements (native ondblclick is unreliable on non-interactive elements).
  const cellTimers = new Map<string, ReturnType<typeof setTimeout>>();
  onDestroy(() => cellTimers.forEach(clearTimeout));

  function handleCellClick(
    e: MouseEvent,
    key: string,
    date: { year: number; month: number; day: number },
  ) {
    if (!onCreateAtDate) return;
    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest("[data-entry]") || target?.closest("[data-overflow]"))
      return;
    if (cellTimers.has(key)) {
      clearTimeout(cellTimers.get(key)!);
      cellTimers.delete(key);
      onCreateAtDate(date);
    } else {
      const t = setTimeout(() => cellTimers.delete(key), CELL_DBLCLICK_DELAY);
      cellTimers.set(key, t);
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="flex flex-col gap-0 sm:gap-3"
  data-testid="calendar-month-view"
  ontouchstart={handleTouchStart}
  ontouchend={handleTouchEnd}
>
  <div
    class="grid grid-cols-7 gap-0 sm:gap-2 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-theme-muted"
  >
    {#each weekdayLabels as label (label)}
      <div class="px-1 py-1 sm:rounded-full sm:px-2">{label}</div>
    {/each}
  </div>

  <div class="grid grid-cols-7 gap-0 sm:gap-2 [container-type:inline-size]">
    {#each month.weeks as week, weekIndex (`week-${weekIndex}`)}
      {#each week.days as day (`${day.date.year}-${day.date.month}-${day.date.day}`)}
        {@const key = dayKey(day.date.year, day.date.month, day.date.day ?? 0)}
        {@const isDropTarget = dragOverDay === key && !!onDropEntity}
        <section
          class={[
            "relative flex min-h-16 flex-col gap-1 border p-1 align-top rounded-none sm:rounded-2xl sm:min-h-32 sm:gap-2 sm:p-3 transition-all duration-150",
            isDropTarget
              ? "border-theme-primary bg-theme-primary/15 ring-2 ring-theme-primary/50 scale-[1.02] shadow-lg shadow-theme-primary/20"
              : day.inCurrentMonth
                ? "border-theme-border bg-theme-surface/70"
                : "border-theme-border/50 bg-theme-bg/35 text-theme-muted/70",
          ]}
          aria-label={dayLabel(day.date.year, day.date.month, day.date.day)}
          ondragover={(e) => {
            if (!onDropEntity) return;
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
          }}
          ondragenter={(e) => {
            if (!onDropEntity) return;
            e.preventDefault();
            dragOverDay = key;
          }}
          ondragleave={(e) => {
            if (dragOverDay !== key) return;
            if ((e.currentTarget as Element).contains(e.relatedTarget as Node))
              return;
            dragOverDay = null;
          }}
          ondrop={(e) => {
            dragOverDay = null;
            if (!onDropEntity || !day.date.day) return;
            e.preventDefault();
            const entityId =
              e.dataTransfer?.getData("application/x-codex-entity-id") ||
              e.dataTransfer?.getData("text/plain");
            if (entityId) {
              onDropEntity(entityId, {
                year: day.date.year,
                month: day.date.month,
                day: day.date.day,
              });
            }
          }}
          onclick={day.date.day && day.inCurrentMonth
            ? (e) =>
                handleCellClick(e, key, {
                  year: day.date.year,
                  month: day.date.month,
                  day: day.date.day!,
                })
            : undefined}
        >
          {#if isDropTarget}
            <div
              class="absolute inset-0 flex items-center justify-center rounded-none sm:rounded-2xl pointer-events-none z-10"
            >
              <div
                class="flex items-center gap-1.5 rounded-full bg-theme-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-theme-bg shadow-lg animate-pulse"
              >
                <span class="icon-[lucide--calendar-plus] h-3.5 w-3.5"></span>
                Set date
              </div>
            </div>
          {/if}

          <div class="flex items-center justify-between gap-1">
            <span
              class={[
                "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors sm:h-7 sm:w-7 sm:text-xs",
                isToday(day.date.year, day.date.month, day.date.day)
                  ? "bg-theme-primary text-theme-bg ring-2 ring-theme-primary/40"
                  : day.inCurrentMonth
                    ? "bg-theme-primary/12 text-theme-text"
                    : "bg-theme-bg/50 text-theme-muted",
              ]}
              aria-current={isToday(day.date.year, day.date.month, day.date.day)
                ? "date"
                : undefined}
            >
              {day.date.day}
            </span>
            {#if day.entries.length + day.hiddenEntries.length > 0}
              <span
                class="hidden text-[9px] uppercase tracking-[0.16em] text-theme-muted sm:inline"
              >
                {day.entries.length + day.hiddenEntries.length} events
              </span>
            {/if}
          </div>

          <div class="flex flex-1 flex-col gap-0.5 sm:gap-1">
            {#each day.entries as entry (entry.entityId + entry.title)}
              <button
                type="button"
                data-entry
                class="rounded-none border border-theme-primary/18 bg-theme-primary/8 px-1 py-0.5 text-left transition hover:border-theme-primary/45 hover:bg-theme-primary/14 sm:rounded-xl sm:px-2 sm:py-1.5"
                onclick={() => handleEntryClick(entry)}
                ondblclick={() => handleEntryDblClick(entry.entityId)}
                onmouseenter={(e) => setHover(entry.entityId, e)}
                onmousemove={(e) => setHover(entry.entityId, e)}
                onmouseleave={clearHover}
              >
                <span
                  class="block truncate text-[9px] font-bold text-theme-text sm:text-[11px]"
                >
                  {entry.title}
                </span>
                <span
                  class="hidden truncate text-[9px] uppercase tracking-[0.16em] text-theme-muted sm:block"
                >
                  {entry.entityType}
                </span>
              </button>
            {/each}

            {#if day.hiddenEntries.length > 0}
              <CalendarDayOverflow
                entries={day.hiddenEntries}
                label={dayLabel(day.date.year, day.date.month, day.date.day)}
                {onSelect}
                onEntryHover={setHover}
                onEntryLeave={clearHover}
              />
            {/if}
          </div>
        </section>
      {/each}
    {/each}
  </div>
</div>

<GraphTooltip {hoveredEntity} hoverPosition={hoverPos} />
