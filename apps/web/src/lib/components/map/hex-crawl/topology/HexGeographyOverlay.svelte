<script lang="ts">
  import type { HexGridConfig } from "map-engine";
  import type { Point } from "schema";
  import type {
    GeographyProposal,
    HexEdgeKey,
    HexKey,
    HexTopology,
  } from "hex-crawl-engine";
  import {
    visibleGeographyEdges,
    visibleGeographySites,
  } from "./geography-overlay-model";
  import GeographyEdgeLines from "./GeographyEdgeLines.svelte";
  import GeographyEdgeToggle from "./GeographyEdgeToggle.svelte";
  import GeographySiteMarker from "./GeographySiteMarker.svelte";

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

  const projection = $derived({ gridConfig, project, viewport, zoom });
  const edges = $derived(
    visibleGeographyEdges(topology, proposal, disabledEdges, projection),
  );
  const sites = $derived(
    visibleGeographySites(topology, proposal, disabledSites, projection),
  );
  const editableEdges = $derived(edges.filter((edge) => edge.proposed));
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
    {#each edges as item (item.key)}
      <GeographyEdgeLines {item} />
    {/each}
  </svg>
  {#if onToggleEdge}
    {#each editableEdges as item (item.key)}
      <GeographyEdgeToggle {item} onToggle={onToggleEdge} />
    {/each}
  {/if}
  {#each sites as item (item.key)}
    <GeographySiteMarker {item} onToggle={onToggleSite} />
  {/each}
</div>
