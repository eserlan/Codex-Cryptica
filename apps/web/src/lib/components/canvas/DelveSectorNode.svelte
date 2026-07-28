<script lang="ts">
  import type { DungeonSectorFrameData } from "generator-engine";

  let { data }: { data: DungeonSectorFrameData } = $props();
  const visibleTheme = $derived(
    data.theme?.trim() && data.theme.trim().toLowerCase() !== "dungeon chamber"
      ? data.theme.trim()
      : "",
  );
</script>

<section
  aria-label={`Sector ${data.order}: ${data.name}`}
  class="pointer-events-none relative h-full w-full overflow-hidden rounded-3xl border-2 border-dashed border-theme-primary/35 bg-theme-surface/20 shadow-[inset_0_0_40px_rgba(var(--theme-primary-rgb),0.06)]"
>
  <header
    class="sector-drag-handle pointer-events-auto absolute inset-x-4 top-3 flex cursor-grab items-start justify-between gap-4 border-b border-theme-primary/20 pb-2 active:cursor-grabbing"
    title="Drag to move this sector and its Areas"
  >
    <div class="min-w-0">
      <div
        class="mb-0.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-theme-primary"
      >
        <span
          class="icon-[lucide--layers-3] h-3 w-3 shrink-0"
          aria-hidden="true"
        ></span>
        Sector {data.order}
      </div>
      <h3
        class="truncate font-header text-sm font-bold tracking-wide text-theme-text"
      >
        {data.name}
      </h3>
    </div>
    {#if visibleTheme}
      <span
        class="max-w-40 truncate rounded-full border border-theme-border bg-theme-bg/60 px-2 py-1 text-[8px] font-mono uppercase tracking-wider text-theme-muted"
      >
        {visibleTheme}
      </span>
    {/if}
  </header>

  {#if data.description}
    <p
      class="absolute bottom-3 left-4 right-4 line-clamp-2 text-[9px] italic leading-relaxed text-theme-muted/75"
    >
      {data.description}
    </p>
  {/if}
</section>
