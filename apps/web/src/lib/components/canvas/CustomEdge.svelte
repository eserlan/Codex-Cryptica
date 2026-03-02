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

  // Calculate intersection between a point and a bounding box
  function getIntersection(
    nodeDimensions: { x: number; y: number; width: number; height: number },
    targetX: number,
    targetY: number,
  ) {
    const { x, y, width, height } = nodeDimensions;
    // Current center of the node
    const cx = x + width / 2;
    const cy = y + height / 2;

    // Vector from center to target
    const dx = targetX - cx;
    const dy = targetY - cy;

    if (dx === 0 && dy === 0) return { x: cx, y: cy };

    // Distance to horizontal/vertical borders
    const scaleX = width / 2 / Math.abs(dx);
    const scaleY = height / 2 / Math.abs(dy);

    // Choose the shortest path to hit a border first
    const scale = Math.min(scaleX, scaleY);

    return {
      x: cx + dx * scale,
      y: cy + dy * scale,
    };
  }

  const edgeData = $derived.by(() => {
    const allNodes = getNodes();
    const sourceNode = allNodes.find((n) => n.id === source);
    const targetNode = allNodes.find((n) => n.id === target);

    let sx = sourceX;
    let sy = sourceY;
    let tx = targetX;
    let ty = targetY;

    if (sourceNode?.measured && targetNode?.measured) {
      const sWidth = sourceNode.measured.width || 200;
      const sHeight = sourceNode.measured.height || 200;
      const tWidth = targetNode.measured.width || 200;
      const tHeight = targetNode.measured.height || 200;

      // SvelteFlow provides absolute positions via `positionAbsolute` when nested/grouped, but `position` works for top-level nodes
      const sPos = (sourceNode as any).positionAbsolute || sourceNode.position;
      const tPos = (targetNode as any).positionAbsolute || targetNode.position;

      // Get center of target to aim at
      const tCenterX = tPos.x + tWidth / 2;
      const tCenterY = tPos.y + tHeight / 2;
      const sCenterX = sPos.x + sWidth / 2;
      const sCenterY = sPos.y + sHeight / 2;

      const sInter = getIntersection(
        { x: sPos.x, y: sPos.y, width: sWidth, height: sHeight },
        tCenterX,
        tCenterY,
      );
      const tInter = getIntersection(
        { x: tPos.x, y: tPos.y, width: tWidth, height: tHeight },
        sCenterX,
        sCenterY,
      );

      sx = sInter.x;
      sy = sInter.y;
      tx = tInter.x;
      ty = tInter.y;
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
    font-family: var(--font-mono), monospace;
    white-space: nowrap;
  }
</style>
