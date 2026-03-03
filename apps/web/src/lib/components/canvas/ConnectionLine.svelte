<script lang="ts">
  import { getStraightPath } from "@xyflow/svelte";

  let { fromNode, fromX, fromY, toX, toY }: any = $props();

  const edgeData = $derived.by(() => {
    if (!fromNode) return { path: "" };

    // Svelte Flow 5: fromX/fromY are usually the handle center.
    let sx = fromX;
    let sy = fromY;

    if (sx === 0 && sy === 0) {
      const sPos = fromNode.computed?.positionAbsolute ||
        fromNode.position || { x: 0, y: 0 };
      const sW = fromNode.measured?.width ?? fromNode.width ?? 200;
      const sH = fromNode.measured?.height ?? fromNode.height ?? 100;
      sx = sPos.x + sW / 2;
      sy = sPos.y + sH / 2;
    }

    if (sx === 0 && sy === 0 && toX === 0 && toY === 0) return { path: "" };

    const [path] = getStraightPath({
      sourceX: sx,
      sourceY: sy,
      targetX: toX,
      targetY: toY,
    });

    return { path };
  });
</script>

{#if edgeData.path}
  <g class="svelte-flow__connection">
    <path
      fill="none"
      stroke="#f59e0b"
      stroke-width="3"
      stroke-dasharray="5,5"
      d={edgeData.path}
      style="vector-effect: non-scaling-stroke; pointer-events: none;"
    />
    <!-- Add a secondary highlight for visibility if it's on a dark background -->
    <path
      fill="none"
      stroke="white"
      stroke-width="1"
      stroke-dasharray="5,5"
      stroke-opacity="0.5"
      d={edgeData.path}
      style="vector-effect: non-scaling-stroke; pointer-events: none; stroke-dashoffset: 5;"
    />
  </g>
{/if}
