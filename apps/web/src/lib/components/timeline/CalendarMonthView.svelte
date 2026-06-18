<script lang="ts">
  import type {
    CalendarEventEntry,
    CalendarMonthViewModel,
  } from "chronology-engine";
  import CalendarDayOverflow from "./CalendarDayOverflow.svelte";

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let {
    month,
    onSelect,
  }: {
    month: CalendarMonthViewModel;
    onSelect: (entry: CalendarEventEntry) => void;
  } = $props();

  function dayLabel(year: number, monthNumber: number, day: number): string {
    return new Date(year, monthNumber - 1, day).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
</script>

<div class="flex flex-col gap-3" data-testid="calendar-month-view">
  <div
    class="grid grid-cols-7 gap-2 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-theme-muted"
  >
    {#each weekdayLabels as label (label)}
      <div class="rounded-full px-2 py-1">{label}</div>
    {/each}
  </div>

  <div class="grid grid-cols-7 gap-2 [container-type:inline-size]">
    {#each month.weeks as week, weekIndex (`week-${weekIndex}`)}
      {#each week.days as day (`${day.date.year}-${day.date.month}-${day.date.day}`)}
        <section
          class={[
            "flex min-h-28 flex-col gap-2 rounded-2xl border p-2 align-top sm:min-h-32 sm:p-3",
            day.inCurrentMonth
              ? "border-theme-border bg-theme-surface/70"
              : "border-theme-border/50 bg-theme-bg/35 text-theme-muted/70",
          ]}
          aria-label={dayLabel(day.date.year, day.date.month, day.date.day)}
        >
          <div class="flex items-center justify-between gap-2">
            <span
              class={[
                "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                day.inCurrentMonth
                  ? "bg-theme-primary/12 text-theme-text"
                  : "bg-theme-bg/50 text-theme-muted",
              ]}
            >
              {day.date.day}
            </span>
            {#if day.entries.length + day.hiddenEntries.length > 0}
              <span
                class="text-[9px] uppercase tracking-[0.16em] text-theme-muted"
              >
                {day.entries.length + day.hiddenEntries.length} events
              </span>
            {/if}
          </div>

          <div class="flex flex-1 flex-col gap-1">
            {#each day.entries as entry (entry.entityId + entry.title)}
              <button
                type="button"
                class="rounded-xl border border-theme-primary/18 bg-theme-primary/8 px-2 py-1.5 text-left transition hover:border-theme-primary/45 hover:bg-theme-primary/14"
                onclick={() => onSelect(entry)}
              >
                <span
                  class="block truncate text-[11px] font-bold text-theme-text"
                >
                  {entry.title}
                </span>
                <span
                  class="block truncate text-[9px] uppercase tracking-[0.16em] text-theme-muted"
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
