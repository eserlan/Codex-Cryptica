<script lang="ts">
  import { hexEdgeFeatureKey, type HexEdgeFeatureKind } from "hex-crawl-engine";
  import type { EdgeItem } from "./geography-overlay-model";
  let {
    item,
    kind,
    index,
    onToggle,
  }: {
    item: EdgeItem;
    kind: HexEdgeFeatureKind;
    index: number;
    onToggle: (key: string, kind: HexEdgeFeatureKind) => void;
  } = $props();
  const disabled = $derived(
    item.disabledFeatures.has(hexEdgeFeatureKey(item.key, kind)),
  );
</script>

<button
  type="button"
  class="pointer-events-auto absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-theme-border bg-theme-surface/90 text-theme-text shadow-sm"
  style:left={`${item.mid.x}px`}
  style:top={`${item.mid.y + index * 28}px`}
  aria-pressed={!disabled}
  aria-label={`${disabled ? "Restore" : "Reject"} proposed ${kind} edge ${item.key}`}
  onclick={(event) => {
    event.stopPropagation();
    onToggle(item.key, kind);
  }}
  onpointerdown={(event) => event.stopPropagation()}
>
  <span
    class={disabled
      ? "icon-[lucide--x] h-3.5 w-3.5"
      : "icon-[lucide--check] h-3.5 w-3.5"}
    aria-hidden="true"
  ></span>
</button>
