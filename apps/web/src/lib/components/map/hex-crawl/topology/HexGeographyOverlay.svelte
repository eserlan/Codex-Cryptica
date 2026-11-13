<script lang="ts">
  import { hexToPoint, type HexGridConfig } from "map-engine";
  import {
    parseHexKey,
    parseHexEdgeKey,
    type GeographyProposal,
    type HexEdgeFeature,
    type HexEdgeKey,
    type HexKey,
    type HexTopology,
  } from "hex-crawl-engine";
  import type { Point } from "schema";

  let {
    topology,
    proposal,
    disabledEdges = new Set<HexEdgeKey>(),
    disabledSites = new Set<HexKey>(),
    gridConfig,
    project,
    viewport,
    zoom,
    onToggleEdge,
    onToggleSite,
  }: {
    topology?: HexTopology;
    proposal?: GeographyProposal | null;
    disabledEdges?: ReadonlySet<HexEdgeKey>;
    disabledSites?: ReadonlySet<HexKey>;
    gridConfig: HexGridConfig;
    project: (point: Point) => Point;
    viewport: { width: number; height: number };
    zoom: number;
    onToggleEdge?: (key: HexEdgeKey) => void;
    onToggleSite?: (key: HexKey) => void;
  } = $props();

  const pos = (key: string) =>
    project(hexToPoint(parseHexKey(key)!, gridConfig));
  const entries = $derived.by(() => {
    const combined = { ...(topology?.edges ?? {}), ...(proposal?.edges ?? {}) };
    const results: Array<{
      key: string;
      edge: HexEdgeFeature;
      proposed: boolean;
      disabled: boolean;
      a: Point;
      b: Point;
      mid: Point;
      coastA: Point;
      coastB: Point;
    }> = [];
    for (const [key, edge] of Object.entries(combined)) {
      const pair = parseHexEdgeKey(key);
      if (!pair) continue;
      const a = project(hexToPoint(pair[0], gridConfig));
      const b = project(hexToPoint(pair[1], gridConfig));
      if (
        (a.x < -80 && b.x < -80) ||
        (a.y < -80 && b.y < -80) ||
        (a.x > viewport.width + 80 && b.x > viewport.width + 80) ||
        (a.y > viewport.height + 80 && b.y > viewport.height + 80)
      )
        continue;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const px = (-(b.y - a.y) / length) * gridConfig.size * zoom * 0.5;
      const py = ((b.x - a.x) / length) * gridConfig.size * zoom * 0.5;
      results.push({
        key,
        edge,
        proposed: Boolean(proposal && key in proposal.edges),
        disabled: disabledEdges.has(key),
        a,
        b,
        mid,
        coastA: { x: mid.x - px, y: mid.y - py },
        coastB: { x: mid.x + px, y: mid.y + py },
      });
    }
    return results.length > 2500 ? [] : results;
  });

  const sites = $derived.by(() => {
    const combined = { ...(topology?.sites ?? {}), ...(proposal?.sites ?? {}) };
    return Object.entries(combined)
      .map(([key, site]) => ({
        key,
        site,
        point: pos(key),
        proposed: Boolean(proposal && key in proposal.sites),
        disabled: disabledSites.has(key),
      }))
      .filter(
        ({ point }) =>
          point.x > -80 &&
          point.y > -80 &&
          point.x < viewport.width + 80 &&
          point.y < viewport.height + 80,
      )
      .slice(0, 2500);
  });
</script>

<div
  data-testid="hex-geography-overlay"
  class="pointer-events-none absolute inset-0 z-[22]"
>
  <svg
    class="absolute inset-0 h-full w-full overflow-visible"
    width={viewport.width}
    height={viewport.height}
    aria-hidden="true"
  >
    {#each entries as item (item.key)}
      <g opacity={item.disabled ? 0.2 : 1}>
        {#if item.edge.coast}
          <line
            x1={item.coastA.x}
            y1={item.coastA.y}
            x2={item.coastB.x}
            y2={item.coastB.y}
            stroke="#38bdf8"
            stroke-width="3"
            stroke-linecap="round"
            stroke-dasharray={item.proposed ? "5 3" : undefined}
          />
        {/if}
        {#if item.edge.road}
          <line
            x1={item.a.x}
            y1={item.a.y}
            x2={item.b.x}
            y2={item.b.y}
            stroke="var(--color-theme-primary, #b45309)"
            stroke-width={item.edge.road.kind === "road" ? 4 : 2}
            stroke-dasharray={item.proposed || item.edge.road.kind === "path"
              ? "5 3"
              : undefined}
            stroke-linecap="round"
          />
        {/if}
        {#if item.edge.river}
          <line
            x1={item.a.x}
            y1={item.a.y}
            x2={item.b.x}
            y2={item.b.y}
            stroke="#0284c7"
            stroke-width="3"
            stroke-linecap="round"
            stroke-dasharray={item.proposed ? "5 3" : undefined}
          />
        {/if}
        {#if item.edge.crossing}
          <circle
            cx={item.mid.x}
            cy={item.mid.y}
            r="4"
            fill="#fff"
            stroke="#075985"
            stroke-width="2"
          />
        {/if}
      </g>
    {/each}
  </svg>
  {#each entries.filter((edge) => edge.proposed && onToggleEdge) as item (item.key)}
    <button
      type="button"
      class="pointer-events-auto absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-theme-border bg-theme-surface/90 text-theme-text shadow-sm"
      style:left={`${item.mid.x}px`}
      style:top={`${item.mid.y}px`}
      aria-pressed={!item.disabled}
      aria-label={`${item.disabled ? "Restore" : "Reject"} proposed ${item.edge.river ? "river" : item.edge.road ? "road" : "coast"} edge ${item.key}`}
      onclick={(event) => {
        event.stopPropagation();
        onToggleEdge?.(item.key);
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
  {/each}
  {#each sites as item (item.key)}
    {#if item.proposed && onToggleSite}
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
          onToggleSite?.(item.key);
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
  {/each}
</div>
