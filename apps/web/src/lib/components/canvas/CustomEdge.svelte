<script lang="ts">
  import {
    BaseEdge,
    EdgeLabel,
    getSmoothStepPath,
    type EdgeProps,
  } from "@xyflow/svelte";

  let {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    label,
    style,
    markerEnd,
  } = $props<EdgeProps>();

  const [edgePath, labelX, labelY] = $derived(
    getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    }),
  );

  function onDoubleClick(event: MouseEvent) {
    event.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("edit-edge-label", {
        detail: { edgeId: id, currentLabel: label },
      }),
    );
  }
</script>

<BaseEdge path={edgePath} {markerEnd} {style} />

<EdgeLabel x={labelX} y={labelY}>
  <div class="nodrag nopan pointer-events-auto">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="canvas-edge-label bg-theme-surface border border-theme-border rounded-md px-2 py-1 text-[10px] font-bold text-theme-text uppercase tracking-widest cursor-text select-none hover:border-theme-primary transition-all shadow-sm"
      ondblclick={onDoubleClick}
    >
      {label || "???"}
    </div>
  </div>
</EdgeLabel>

<style>
  .canvas-edge-label {
    font-family: var(--font-mono), monospace;
    white-space: nowrap;
    pointer-events: all;
  }
  .canvas-edge-label:hover {
    box-shadow: 0 0 8px var(--color-theme-primary);
    transform: scale(1.05);
  }
</style>
