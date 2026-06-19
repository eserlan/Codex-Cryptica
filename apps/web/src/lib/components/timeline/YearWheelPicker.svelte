<script lang="ts">
  import { onMount, tick } from "svelte";

  let {
    year = $bindable(),
    onClose,
  }: {
    year: number;
    onClose: () => void;
  } = $props();

  const ITEM_HEIGHT = 44;
  const VISIBLE = 5;
  const RANGE = 300;

  const years = Array.from(
    { length: RANGE * 2 + 1 },
    (_, i) => year - RANGE + i,
  );

  let drum = $state<HTMLElement>();
  let selectedYear = $state(year);
  let scrollEndTimer: ReturnType<typeof setTimeout>;

  onMount(async () => {
    await tick();
    if (!drum) return;
    const idx = years.indexOf(selectedYear);
    drum.scrollTop = idx * ITEM_HEIGHT;
  });

  function onScroll() {
    clearTimeout(scrollEndTimer);
    scrollEndTimer = setTimeout(() => {
      if (!drum) return;
      const idx = Math.round(drum.scrollTop / ITEM_HEIGHT);
      selectedYear = years[Math.max(0, Math.min(idx, years.length - 1))];
    }, 80);
  }

  function confirm() {
    year = selectedYear;
    onClose();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter") confirm();
    if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedYear = Math.max(years[0], selectedYear - 1);
      scrollTo(selectedYear);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedYear = Math.min(years[years.length - 1], selectedYear + 1);
      scrollTo(selectedYear);
    }
  }

  function scrollTo(y: number) {
    if (!drum) return;
    const idx = years.indexOf(y);
    drum.scrollTo({ top: idx * ITEM_HEIGHT, behavior: "smooth" });
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="flex flex-col items-center rounded-2xl border border-theme-border bg-theme-surface shadow-2xl shadow-black/40 overflow-hidden w-36"
  role="dialog"
  aria-label="Select year"
  onkeydown={onKeydown}
>
  <!-- gradient masks -->
  <div class="relative w-full" style:height="{ITEM_HEIGHT * VISIBLE}px">
    <div
      bind:this={drum}
      class="h-full overflow-y-scroll scroll-smooth overscroll-contain"
      style="scroll-snap-type: y mandatory; scrollbar-width: none;"
      onscroll={onScroll}
    >
      <!-- padding so first/last items can center -->
      <div style:height="{ITEM_HEIGHT * Math.floor(VISIBLE / 2)}px"></div>
      {#each years as y (y)}
        <button
          type="button"
          class="flex w-full items-center justify-center font-mono font-bold transition-all duration-100"
          style="height: {ITEM_HEIGHT}px; scroll-snap-align: center; font-size: {y ===
          selectedYear
            ? '1.1rem'
            : '0.8rem'}; color: {y === selectedYear
            ? 'var(--color-theme-primary)'
            : 'var(--color-theme-muted)'}; opacity: {Math.abs(
            y - selectedYear,
          ) > 2
            ? 0.3
            : 1};"
          onclick={() => {
            if (y === selectedYear) {
              confirm();
            } else {
              selectedYear = y;
              scrollTo(y);
            }
          }}
        >
          {y}
        </button>
      {/each}
      <div style:height="{ITEM_HEIGHT * Math.floor(VISIBLE / 2)}px"></div>
    </div>

    <!-- top fade -->
    <div
      class="pointer-events-none absolute inset-x-0 top-0"
      style:height="{ITEM_HEIGHT * 2}px"
      style="background: linear-gradient(to bottom, var(--color-theme-surface), transparent);"
    ></div>
    <!-- bottom fade -->
    <div
      class="pointer-events-none absolute inset-x-0 bottom-0"
      style:height="{ITEM_HEIGHT * 2}px"
      style="background: linear-gradient(to top, var(--color-theme-surface), transparent);"
    ></div>
    <!-- center highlight rail -->
    <div
      class="pointer-events-none absolute inset-x-3 rounded-lg border border-theme-primary/30 bg-theme-primary/8"
      style:top="{ITEM_HEIGHT * Math.floor(VISIBLE / 2)}px"
      style:height="{ITEM_HEIGHT}px"
    ></div>
  </div>

  <div class="flex w-full gap-0 border-t border-theme-border">
    <button
      type="button"
      class="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text transition-colors"
      onclick={onClose}
    >
      Cancel
    </button>
    <div class="w-px bg-theme-border"></div>
    <button
      type="button"
      class="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest text-theme-primary hover:text-theme-primary/80 transition-colors"
      onclick={confirm}
    >
      Go
    </button>
  </div>
</div>

<style>
  div :global(::-webkit-scrollbar) {
    display: none;
  }
</style>
