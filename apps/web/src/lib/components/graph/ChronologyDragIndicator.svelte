<script lang="ts">
  import { calendarStore } from "$lib/stores/calendar.svelte";
  import { chronologyEdit } from "$lib/stores/chronology-edit.svelte";

  let {
    service = chronologyEdit,
    x = 0,
    y = 0,
  }: {
    service?: typeof chronologyEdit;
    x?: number;
    y?: number;
  } = $props();

  const label = $derived.by(() => {
    const year = service.drag?.targetYear;
    if (year === undefined) return "";
    const suffix = calendarStore.config.epochLabel;
    return suffix ? `${year} ${suffix}` : String(year);
  });
</script>

{#if service.drag}
  <div
    class="pointer-events-none fixed z-50 rounded border border-feedback-warning/60 bg-theme-surface px-3 py-1 text-xs font-bold text-theme-text shadow-lg"
    style:left={`${x}px`}
    style:top={`${y}px`}
    aria-live="polite"
  >
    <span
      class="icon-[lucide--calendar-clock] mr-1 inline-block h-3.5 w-3.5 text-feedback-warning"
    ></span>
    {label}
  </div>
{/if}
