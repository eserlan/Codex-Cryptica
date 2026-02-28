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
  }: EdgeProps = $props();

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

{#if label}
  <EdgeLabel x={labelX} y={labelY}>
    <div
      class="canvas-edge-label bg-theme-surface border border-theme-border rounded-md px-2 py-1 text-[10px] font-bold text-theme-text uppercase tracking-widest cursor-text select-none transition-all shadow-lg hover:border-theme-primary hover:scale-105"
      ondblclick={onDoubleClick}
      role="button"
      tabindex="0"
    >
      {label}
    </div>
  </EdgeLabel>
{/if}

<style>
  .canvas-edge-label {
    font-family: var(--font-mono), monospace;
    white-space: nowrap;
  }
</style>
