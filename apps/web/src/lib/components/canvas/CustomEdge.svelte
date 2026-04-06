<script lang="ts">
  import {
    BaseEdge,
    EdgeLabel,
    getStraightPath,
    useSvelteFlow,
    type EdgeProps,
  } from "@xyflow/svelte";

  let {
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    label,
    style,
    markerEnd,
  }: EdgeProps = $props();

  const { getNodes } = useSvelteFlow();

  const edgeData = $derived.by(() => {
    const allNodes = getNodes();
    const sourceNode = allNodes.find((n) => n.id === source);
    const targetNode = allNodes.find((n) => n.id === target);

    let sx, sy, tx, ty;

    if (sourceNode && targetNode) {
      const sPos = (sourceNode as any).positionAbsolute ||
        sourceNode.position || { x: 0, y: 0 };
      const tPos = (targetNode as any).positionAbsolute ||
        targetNode.position || { x: 0, y: 0 };

      const sW = sourceNode.measured?.width ?? (sourceNode as any).width ?? 200;
      const sH =
        sourceNode.measured?.height ?? (sourceNode as any).height ?? 100;
      const tW = targetNode.measured?.width ?? (targetNode as any).width ?? 200;
      const tH =
        targetNode.measured?.height ?? (targetNode as any).height ?? 100;

      sx = sPos.x + sW / 2;
      sy = sPos.y + sH / 2;
      tx = tPos.x + tW / 2;
      ty = tPos.y + tH / 2;

      if (isNaN(sx) || isNaN(sy)) {
        sx = sourceX;
        sy = sourceY;
      }
    } else {
      // Very final fallback to original props
      sx = sourceX;
      sy = sourceY;
      tx = targetX;
      ty = targetY;
    }

    const [path, labelX, labelY] = getStraightPath({
      sourceX: sx,
      sourceY: sy,
      targetX: tx,
      targetY: ty,
    });

    return { path, labelX, labelY };
  });

  function onDoubleClick(event: MouseEvent) {
    event.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("edit-edge-label", {
        detail: { edgeId: id, currentLabel: label },
      }),
    );
  }
</script>

<BaseEdge path={edgeData.path} {markerEnd} {style} />

{#if label}
  <EdgeLabel x={edgeData.labelX} y={edgeData.labelY}>
    <div
      class="canvas-edge-label bg-theme-surface border border-theme-border rounded-md px-2 py-1 text-[10px] font-bold text-theme-text uppercase font-header tracking-widest cursor-text select-none transition-all shadow-lg hover:border-theme-primary hover:scale-105"
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
    white-space: nowrap;
  }
</style>
