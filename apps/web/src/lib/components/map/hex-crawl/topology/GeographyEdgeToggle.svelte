<script lang="ts">
  import type { EdgeItem } from "./geography-overlay-model";
  let { item, onToggle }: { item: EdgeItem; onToggle: (key: string) => void } =
    $props();
  const kind = $derived(
    item.edge.river ? "river" : item.edge.road ? "road" : "coast",
  );
</script>

<button
  type="button"
  class="pointer-events-auto absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-theme-border bg-theme-surface/90 text-theme-text shadow-sm"
  style:left={`${item.mid.x}px`}
  style:top={`${item.mid.y}px`}
  aria-pressed={!item.disabled}
  aria-label={`${item.disabled ? "Restore" : "Reject"} proposed ${kind} edge ${item.key}`}
  onclick={(event) => {
    event.stopPropagation();
    onToggle(item.key);
  }}
  onpointerdown={(event) => event.stopPropagation()}
>
  <span
    class={item.disabled
      ? "icon-[lucide--x] h-3.5 w-3.5"
      : "icon-[lucide--check] h-3.5 w-3.5"}
    aria-hidden="true"
  ></span>
</button>
