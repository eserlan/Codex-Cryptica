<script lang="ts">
  import { NodeToolbar, Position } from "@xyflow/svelte";
  import type { useCanvasNodeRotation } from "./hooks/use-canvas-node-rotation.svelte";

  let {
    rotationLogic,
  }: { rotationLogic: ReturnType<typeof useCanvasNodeRotation> } = $props();
</script>

{#if rotationLogic.selectedRotationNodeId && rotationLogic.canRotateNode(rotationLogic.selectedRotationNodeId)}
  <NodeToolbar
    nodeId={rotationLogic.selectedRotationNodeId}
    position={Position.Top}
    offset={18}
    isVisible
  >
    <button
      type="button"
      class="nodrag nopan touch-none flex h-9 w-9 cursor-grab items-center justify-center rounded-full border border-theme-primary/50 bg-theme-surface text-theme-primary shadow-lg transition-colors hover:bg-theme-primary/15 active:cursor-grabbing"
      title="Drag to rotate card; use arrow keys for precise rotation"
      aria-label="Rotate selected card"
      onpointerdown={rotationLogic.beginDesktopRotation}
      onkeydown={rotationLogic.rotateSelectedNodeWithKeyboard}
    >
      <span class="icon-[lucide--rotate-cw] h-4 w-4" aria-hidden="true"></span>
    </button>
  </NodeToolbar>
{/if}
