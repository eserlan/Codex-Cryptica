<script lang="ts">
  import { timelineStore } from "$lib/stores/timeline.svelte";
  import { graph } from "$lib/stores/graph.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import VerticalTimeline from "$lib/components/timeline/VerticalTimeline.svelte";
  import HorizontalTimeline from "$lib/components/timeline/HorizontalTimeline.svelte";
  import TimelineLayoutToggle from "$lib/components/timeline/TimelineLayoutToggle.svelte";
  import TimelineFilterBar from "$lib/components/timeline/TimelineFilterBar.svelte";
  import CalendarMonthView from "$lib/components/timeline/CalendarMonthView.svelte";
  import CalendarAgendaView from "$lib/components/timeline/CalendarAgendaView.svelte";
  import YearWheelPicker from "$lib/components/timeline/YearWheelPicker.svelte";
  import { onMount } from "svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { calendarStore } from "$lib/stores/calendar.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";

  let EntityDetailPanel = $state<any>(null);
  let showYearPicker = $state(false);

  onMount(() => {
    void graph.init();
    void calendarStore.init().then(() => timelineStore.init());
    import("../../../lib/components/EntityDetailPanel.svelte")
      .then((m) => (EntityDetailPanel = m?.default))
      .catch(() => {});
  });

  const selectedEntity = $derived.by(() => {
    const id = vault.selectedEntityId;
    return id ? vault.entities[id] : null;
  });

  const handleSelectEntry = (entry: { entityId: string }) => {
    if (window.innerWidth < 768) {
      modalUIStore.openZenMode(entry.entityId);
    } else {
      vault.selectedEntityId =
        vault.selectedEntityId === entry.entityId ? null : entry.entityId;
    }
  };

  function cmpDate(
    a: { year: number; month?: number; day?: number },
    b: { year: number; month?: number; day?: number },
  ): number {
    if (a.year !== b.year) return a.year - b.year;
    if ((a.month ?? 0) !== (b.month ?? 0))
      return (a.month ?? 0) - (b.month ?? 0);
    return (a.day ?? 0) - (b.day ?? 0);
  }

  const handleDropEntity = async (
    entityId: string,
    date: { year: number; month: number; day: number },
  ) => {
    const entity = vault.entities[entityId];
    if (!entity) return;

    const start = entity.start_date;
    const end = entity.end_date;

    if (!start) {
      await vault.updateEntity(entityId, { start_date: date });
    } else if (!end) {
      await vault.updateEntity(entityId, { end_date: date });
    } else if (cmpDate(date, start) < 0) {
      await vault.updateEntity(entityId, { start_date: date });
    } else if (cmpDate(date, end) > 0) {
      await vault.updateEntity(entityId, { end_date: date });
    }
  };
</script>

<svelte:head>
  <title>World Timeline | Codex Cryptica</title>
  <meta
    name="description"
    content="Browse your world history in a month-grid calendar, agenda list, or classic timeline views powered by local-first data."
  />
</svelte:head>

<div class="h-full flex flex-col bg-theme-bg overflow-hidden">
  <!-- Header / Controls -->
  <div
    class="p-4 border-b border-green-900/30 bg-[#0c0c0c] flex flex-wrap items-center justify-between gap-4"
  >
    <div class="flex items-center gap-3">
      <span class="icon-[lucide--calendar-days] text-green-500 w-6 h-6"></span>
      <h2
        class="text-xl font-bold text-gray-100 font-mono tracking-wider uppercase font-header"
      >
        World Chronology
      </h2>
    </div>

    <div class="flex items-center gap-4">
      <TimelineFilterBar />
      <div class="h-6 w-px bg-green-900/30 mx-2"></div>
      <TimelineLayoutToggle />
    </div>
  </div>

  <!-- Main View + Entity Panel -->
  <div class="flex flex-1 overflow-hidden">
    <!-- Calendar / Timeline content -->
    <div class="flex-1 overflow-hidden relative">
      {#if timelineStore.isLoading}
        <div
          class="absolute inset-0 flex items-center justify-center bg-theme-bg/50 backdrop-blur-sm z-10"
        >
          <div class="flex flex-col items-center gap-3">
            <span
              class="icon-[lucide--loader-2] w-10 h-10 text-green-500 animate-spin"
            ></span>
            <span
              class="text-xs font-mono text-green-700 uppercase tracking-[0.2em]"
              >Synchronizing Timeline...</span
            >
          </div>
        </div>
      {/if}

      {#if timelineStore.filteredCalendarEntries.length === 0 && !timelineStore.isLoading}
        <div
          class="h-full flex flex-col items-center justify-center text-center p-8 space-y-4"
        >
          <span class="icon-[lucide--calendar-search] w-16 h-16 text-zinc-800"
          ></span>
          <h3
            class="text-zinc-500 font-bold uppercase font-header tracking-widest"
          >
            No Matching Events
          </h3>
          <p class="text-xs text-zinc-600 max-w-sm leading-relaxed">
            Add dated events or clear your filters to see the calendar fill in.
            Approximate and undated entries appear in agenda mode when
            available.
          </p>
        </div>
      {:else}
        <div class="h-full overflow-y-auto p-4 sm:p-6">
          {#if timelineStore.viewMode === "calendar"}
            <div class="mx-auto flex max-w-7xl flex-col gap-4">
              <div
                class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-theme-border bg-theme-surface/60 p-4"
              >
                <div class="relative">
                  <p
                    class="text-[10px] uppercase tracking-[0.22em] text-theme-muted"
                  >
                    Active month
                  </p>
                  <button
                    type="button"
                    class="group flex items-center gap-1.5 text-lg font-bold text-theme-text hover:text-theme-primary transition-colors"
                    onclick={() => (showYearPicker = !showYearPicker)}
                    title="Jump to year"
                  >
                    {timelineStore.calendarMonthView.title}
                    <span
                      class="icon-[lucide--chevrons-up-down] h-4 w-4 text-theme-muted group-hover:text-theme-primary transition-colors"
                    ></span>
                  </button>

                  {#if showYearPicker}
                    <div
                      class="fixed inset-0 z-40"
                      role="presentation"
                      onclick={() => (showYearPicker = false)}
                    ></div>
                    <div class="absolute left-0 top-full mt-2 z-50">
                      <YearWheelPicker
                        bind:year={timelineStore.activeYear}
                        onClose={() => (showYearPicker = false)}
                      />
                    </div>
                  {/if}
                </div>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="rounded-full border border-theme-border bg-theme-bg/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-theme-text transition hover:border-theme-primary hover:text-theme-primary"
                    onclick={() => timelineStore.previousMonth()}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    class="rounded-full border border-theme-border bg-theme-bg/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-theme-text transition hover:border-theme-primary hover:text-theme-primary"
                    onclick={() => timelineStore.nextMonth()}
                  >
                    Next
                  </button>
                </div>
              </div>

              <CalendarMonthView
                month={timelineStore.calendarMonthView}
                onSelect={handleSelectEntry}
                onDropEntity={handleDropEntity}
              />
            </div>
          {:else if timelineStore.viewMode === "agenda"}
            <div class="mx-auto max-w-5xl">
              <CalendarAgendaView
                sections={timelineStore.agendaSections}
                onSelect={handleSelectEntry}
              />
            </div>
          {:else if timelineStore.viewMode === "vertical"}
            <VerticalTimeline />
          {:else if timelineStore.viewMode === "horizontal"}
            <div class="hidden md:block h-full"><HorizontalTimeline /></div>
            <div class="md:hidden h-full"><VerticalTimeline /></div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Entity detail panel — pushes calendar left, not overlay -->
    {#if EntityDetailPanel && selectedEntity}
      <div
        class="relative shrink-0 overflow-hidden"
        style:width="{layoutUIStore.rightSidebarWidth}px"
      >
        <EntityDetailPanel
          entity={selectedEntity}
          onClose={() => (vault.selectedEntityId = null)}
          onDateClick={(year: number, month: number) => {
            timelineStore.activeYear = year;
            timelineStore.activeMonth = month;
          }}
        />
      </div>
    {/if}
  </div>
</div>
