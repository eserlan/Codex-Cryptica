<script lang="ts">
  import type { HexGridConfig } from "map-engine";
  import type { Point } from "schema";
  import type {
    GeographyProposal,
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
    disabledEdgeFeatures = new Set<string>(),
    disabledSites = new Set<HexKey>(),
    gridConfig,
    project,
    viewport,
    zoom,
    onToggleEdgeFeature,
    onToggleSite,
  }: {
    topology?: HexTopology;
    proposal?: GeographyProposal | null;
    disabledEdgeFeatures?: ReadonlySet<string>;
    disabledSites?: ReadonlySet<HexKey>;
    gridConfig: HexGridConfig;
    project: (point: Point) => Point;
    viewport: { width: number; height: number };
    zoom: number;
    onToggleEdgeFeature?: (
      key: string,
      kind: "river" | "road" | "coast",
    ) => void;
    onToggleSite?: (key: HexKey) => void;
  } = $props();

  const projection = $derived({ gridConfig, project, viewport, zoom });
  const edges = $derived(
    visibleGeographyEdges(topology, proposal, disabledEdgeFeatures, projection),
  );
  const sites = $derived(
    visibleGeographySites(topology, proposal, disabledSites, projection),
  );
  const editableEdges = $derived(
    edges.flatMap((item) =>
      item.proposedFeatures.map((kind, index, kinds) => ({
        item,
        kind,
        index: index - (kinds.length - 1) / 2,
      })),
    ),
  );
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
  {#if onToggleEdgeFeature}
    {#each editableEdges as toggle (`${toggle.item.key}#${toggle.kind}`)}
      <GeographyEdgeToggle
        item={toggle.item}
        kind={toggle.kind}
        index={toggle.index}
        onToggle={onToggleEdgeFeature}
      />
    {/each}
  {/if}
  {#each sites as item (item.key)}
    <GeographySiteMarker {item} onToggle={onToggleSite} />
  {/each}
</div>
