<script lang="ts">
  import type {
    CalendarEventEntry,
    CalendarMonthViewModel,
  } from "chronology-engine";
  import { calendarEngine } from "chronology-engine";
  import CalendarDayOverflow from "./CalendarDayOverflow.svelte";
  import { calendarStore } from "$lib/stores/calendar.svelte";

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let {
    month,
    onSelect,
    onDropEntity,
  }: {
    month: CalendarMonthViewModel;
    onSelect: (entry: CalendarEventEntry) => void;
    onDropEntity?: (
      entityId: string,
      date: { year: number; month: number; day: number },
    ) => void;
  } = $props();

  let dragOverDay = $state<string | null>(null);

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

  function dayKey(year: number, month: number, day: number): string {
    return `${year}-${month}-${day}`;
  }
</script>

<div class="flex flex-col gap-0 sm:gap-3" data-testid="calendar-month-view">
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
            "flex min-h-16 flex-col gap-1 border p-1 align-top rounded-none sm:rounded-2xl sm:min-h-32 sm:gap-2 sm:p-3 transition-colors",
            day.inCurrentMonth
              ? "border-theme-border bg-theme-surface/70"
              : "border-theme-border/50 bg-theme-bg/35 text-theme-muted/70",
            isDropTarget
              ? "border-theme-primary/60 bg-theme-primary/10 ring-2 ring-theme-primary/30"
              : "",
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
          ondragleave={() => {
            if (dragOverDay === key) dragOverDay = null;
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
        >
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
                class="rounded-none border border-theme-primary/18 bg-theme-primary/8 px-1 py-0.5 text-left transition hover:border-theme-primary/45 hover:bg-theme-primary/14 sm:rounded-xl sm:px-2 sm:py-1.5"
                onclick={() => onSelect(entry)}
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
              />
            {/if}
          </div>
        </section>
      {/each}
    {/each}
  </div>
</div>
