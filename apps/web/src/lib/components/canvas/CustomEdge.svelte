<script lang="ts">
  import {
    BaseEdge,
    EdgeLabel,
    getStraightPath,
    useSvelteFlow,
    type EdgeProps,
  } from "@xyflow/svelte";
  import { getConnectionStance } from "./cards/entity-card-variant";

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
    data,
  }: EdgeProps = $props();

  const { getNodes } = useSvelteFlow();

  function resolveStance(data: unknown, label: string | undefined): string {
    const explicit = (data as { stance?: string } | undefined)?.stance;
    return explicit || (label ? getConnectionStance(label) : "neutral");
  }

  const STANCE_STYLES = {
    ally: "stroke: #34d399; stroke-width: 2px;",
    friend: "stroke: #38bdf8; stroke-width: 2px;",
    enemy: "stroke: #f43f5e; stroke-width: 2px;",
    neutral: undefined,
  };

  const stance = $derived(resolveStance(data, label));
  const resolvedStyle = $derived(
    style ?? STANCE_STYLES[stance as keyof typeof STANCE_STYLES],
  );

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

<BaseEdge path={edgeData.path} {markerEnd} style={resolvedStyle} />

{#if label}
  <EdgeLabel x={edgeData.labelX} y={edgeData.labelY}>
    <div
      class="canvas-edge-label rounded-full px-2.5 py-0.5 text-nano font-bold uppercase font-header tracking-wider cursor-text select-none transition-all shadow-md hover:scale-105 border {stance ===
      'ally'
        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
        : stance === 'friend'
          ? 'bg-sky-950/80 text-sky-300 border-sky-500/50'
          : stance === 'enemy'
            ? 'bg-rose-950/80 text-rose-300 border-rose-500/50'
            : 'bg-theme-surface text-theme-text border-theme-border'}"
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
