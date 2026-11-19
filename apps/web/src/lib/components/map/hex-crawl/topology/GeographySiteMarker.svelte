<script lang="ts">
  import type { SiteItem } from "./geography-overlay-model";
  let { item, onToggle }: { item: SiteItem; onToggle?: (key: string) => void } =
    $props();
</script>

{#if item.proposed && onToggle}
  <button
    type="button"
    class="pointer-events-auto absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-theme-primary bg-theme-surface text-theme-text shadow"
    style:left={`${item.point.x}px`}
    style:top={`${item.point.y}px`}
    aria-label={`${item.disabled ? "Restore" : "Reject"} proposed ${item.site.kind} at ${item.key}`}
    aria-pressed={!item.disabled}
    class:opacity-30={item.disabled}
    onclick={(event) => {
      event.stopPropagation();
      onToggle(item.key);
    }}
    onpointerdown={(event) => event.stopPropagation()}
    ><span class="icon-[lucide--house] h-4 w-4" aria-hidden="true"
    ></span></button
  >
{:else}
  <span
    class="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-theme-primary bg-theme-surface px-1 shadow"
    style:left={`${item.point.x}px`}
    style:top={`${item.point.y}px`}
    title={`Accepted ${item.site.kind} site at ${item.key}`}
    ><span
      class="icon-[lucide--house] block h-3.5 w-3.5 text-theme-text"
      aria-hidden="true"
    ></span></span
  >
{/if}
