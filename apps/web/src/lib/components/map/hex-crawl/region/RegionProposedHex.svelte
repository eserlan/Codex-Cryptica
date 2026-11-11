<script lang="ts">
  import { terrainIcon, terrainLabel, type Terrain } from "hex-crawl-engine";

  /** One proposed hex on the map: a button the GM can tap to change it. */
  let {
    hexKey,
    label,
    terrain,
    x,
    y,
    size,
    selected,
    adjusted,
    changes,
    explored,
    onPick,
  }: {
    hexKey: string;
    label: string;
    terrain: Terrain;
    x: number;
    y: number;
    size: number;
    selected: boolean;
    adjusted: boolean;
    changes: boolean;
    explored: boolean;
    onPick: (key: string) => void;
  } = $props();

  const description = $derived(
    [
      `Proposed ${terrainLabel(terrain)} at ${label}`,
      adjusted ? "changed by you" : "",
      changes ? "will change" : "",
      explored ? "explored" : "",
    ]
      .filter(Boolean)
      .join(", "),
  );
  const outline = $derived(
    selected
      ? "border-theme-primary"
      : adjusted
        ? "border-theme-secondary"
        : changes
          ? "border-dashed border-theme-primary/80"
          : "border-dashed border-theme-primary/40",
  );

  function stop(event: Event) {
    // A tap here picks a proposed hex; it must not also open the hex panel.
    event.stopPropagation();
  }
</script>

<button
  type="button"
  data-testid="region-proposed-hex"
  data-hex={hexKey}
  aria-label={description}
  tabindex={selected ? 0 : -1}
  aria-pressed={selected}
  onpointerdown={stop}
  onpointerup={stop}
  onclick={(event) => {
    stop(event);
    onPick(hexKey);
  }}
  class="pointer-events-auto absolute flex items-center justify-center rounded-full border-2 bg-theme-bg/60 text-theme-text {outline}"
  style:left={`${x - size / 2}px`}
  style:top={`${y - size / 2}px`}
  style:width={`${size}px`}
  style:height={`${size}px`}
>
  <span class="{terrainIcon(terrain)} h-4 w-4" aria-hidden="true"></span>
  {#if explored}
    <span
      data-testid="region-explored-mark"
      class="icon-[lucide--circle-check-big] absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-theme-bg text-theme-text"
      aria-hidden="true"
    ></span>
  {/if}
</button>
