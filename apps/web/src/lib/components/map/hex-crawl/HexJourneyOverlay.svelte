<script lang="ts">
  import { hexToPoint, type HexGridConfig, type HexCoord } from "map-engine";
  import type { Point } from "schema";
  let {
    route,
    completedSteps,
    gridConfig,
    project,
    viewport,
    visible,
  }: {
    route: { hexes: readonly HexCoord[] } | null;
    completedSteps: number;
    gridConfig: HexGridConfig;
    project: (point: Point) => Point;
    viewport: { width: number; height: number };
    visible: boolean;
  } = $props();
  const projected = $derived.by(() => {
    if (!visible || !route) return [];
    return route.hexes.map((hex, index) => {
      const point = project(hexToPoint(hex, gridConfig));
      const label =
        index === 0
          ? "Journey origin"
          : index === route!.hexes.length - 1
            ? "Journey destination"
            : index === completedSteps
              ? "Current journey hex"
              : `Journey hex ${index + 1}`;
      const inView =
        point.x >= -80 &&
        point.y >= -80 &&
        point.x <= viewport.width + 80 &&
        point.y <= viewport.height + 80;
      return {
        key: `${hex.q},${hex.r}`,
        x: point.x,
        y: point.y,
        label,
        complete: index <= completedSteps,
        inView,
      };
    });
  });
  const markers = $derived(projected.filter((item) => item.inView));
  const completedPath = $derived(
    projected
      .slice(0, completedSteps + 1)
      .map((point) => `${point.x},${point.y}`)
      .join(" "),
  );
  const remainingPath = $derived(
    projected
      .slice(Math.max(0, completedSteps))
      .map((point) => `${point.x},${point.y}`)
      .join(" "),
  );
</script>

{#if visible && route}
  <svg
    aria-label="Journey route"
    class="pointer-events-none absolute inset-0 h-full w-full overflow-hidden"
    role="img"
  >
    {#if completedPath.includes(",")}
      <polyline
        aria-label="Completed journey route"
        points={completedPath}
        fill="none"
        stroke="currentColor"
        stroke-width="4"
        stroke-dasharray="none"
        class="text-theme-primary"
      />
    {/if}
    {#if remainingPath.includes(",")}
      <polyline
        aria-label="Remaining journey route"
        points={remainingPath}
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-dasharray="6 6"
        class="text-theme-muted"
      />
    {/if}
    {#each markers as marker (marker.key)}
      <circle
        cx={marker.x}
        cy={marker.y}
        r="12"
        class:fill-theme-primary={marker.complete}
        class:fill-theme-bg={!marker.complete}
        stroke="currentColor"
        stroke-width="3"
        aria-label={marker.label}
      />
      <title>{marker.label}</title>
    {/each}
  </svg>
{/if}
