<script lang="ts">
  import {
    BaseEdge,
    EdgeLabel,
    getSmoothStepPath,
    type EdgeProps,
  } from "@xyflow/svelte";
  import type { DelveEdgeData, PassageType } from "generator-engine";
  import {
    getPassageDirectionMarkers,
    getPassageEdgeStyle,
  } from "./delve-helpers";

  let {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
  }: EdgeProps = $props();

  const delveEdgeData = $derived((data ?? {}) as unknown as DelveEdgeData);
  const passageType: PassageType = $derived(delveEdgeData.type ?? "standard");
  const edgeStyleConfig = $derived(getPassageEdgeStyle(passageType));
  const markerId = $derived(
    `delve-arrow-${String(id).replace(/[^a-zA-Z0-9_-]/g, "-")}`,
  );
  const directionMarkers = $derived(
    getPassageDirectionMarkers(delveEdgeData.bidirectional !== false, markerId),
  );

  const [edgePath, labelX, labelY] = $derived(
    getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 12,
    }),
  );

  const styleString = $derived(
    `stroke: ${edgeStyleConfig.strokeColor}; stroke-width: 2.5px; ${
      edgeStyleConfig.strokeDasharray
        ? `stroke-dasharray: ${edgeStyleConfig.strokeDasharray};`
        : ""
    }`,
  );

  function onClickEdge(event: MouseEvent) {
    event.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("edit-delve-edge", {
        detail: { edgeId: id, edgeData: delveEdgeData },
      }),
    );
  }
</script>

<defs>
  <marker
    id={markerId}
    viewBox="0 0 8 8"
    markerWidth="8"
    markerHeight="8"
    refX="7"
    refY="4"
    orient="auto-start-reverse"
    markerUnits="strokeWidth"
  >
    <path d="M 0 0 L 8 4 L 0 8 z" fill={edgeStyleConfig.strokeColor}></path>
  </marker>
</defs>

<BaseEdge
  path={edgePath}
  style={styleString}
  markerStart={directionMarkers.markerStart}
  markerEnd={directionMarkers.markerEnd}
/>

<EdgeLabel x={labelX} y={labelY}>
  <button
    type="button"
    ondblclick={onClickEdge}
    class="flex items-center gap-1 bg-theme-bg/95 border border-theme-border/70 rounded-full px-2 py-0.5 text-[9px] font-mono text-theme-text/90 shadow-md hover:border-theme-primary transition-all cursor-pointer"
    title="Double-click to edit passage attributes"
  >
    <span
      class="{edgeStyleConfig.badgeIcon} w-3 h-3 text-theme-primary"
      aria-hidden="true"
    ></span>
    {#if delveEdgeData.condition}
      <span class="truncate max-w-[120px] font-semibold text-amber-400">
        {delveEdgeData.condition}
      </span>
    {:else if delveEdgeData.description}
      <span class="truncate max-w-[100px] italic">
        {delveEdgeData.description}
      </span>
    {/if}
  </button>
</EdgeLabel>
