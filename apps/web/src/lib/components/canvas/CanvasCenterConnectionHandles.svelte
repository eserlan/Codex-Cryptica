<script lang="ts">
  import { Handle, Position } from "@xyflow/svelte";
  import { connectionModeStore } from "$lib/stores/ui/connection-mode.svelte";

  let {
    legacySourceHandleIds = [],
    legacyTargetHandleIds = [],
  }: {
    legacySourceHandleIds?: string[];
    legacyTargetHandleIds?: string[];
  } = $props();

  const isModifierPressed = $derived(connectionModeStore.isModifierPressed);
</script>

{#each legacyTargetHandleIds as handleId (handleId)}
  <Handle
    type="target"
    position={Position.Top}
    id={handleId}
    class="!bg-transparent !border-none"
    style="width: 1px; height: 1px; opacity: 0; pointer-events: none;"
  />
{/each}

<Handle
  type="target"
  position={Position.Top}
  class="!bg-transparent !border-none"
  style="width: 1px; height: 1px; opacity: 0;"
/>

{#each legacySourceHandleIds as handleId (handleId)}
  <Handle
    type="source"
    position={Position.Top}
    id={handleId}
    class="!bg-transparent !border-none"
    style="left: 50%; top: 50%; width: 1px; height: 1px; opacity: 0; pointer-events: none;"
  />
{/each}

<Handle
  type="source"
  position={Position.Top}
  class="full-card-handle !bg-transparent !border-none !rounded-none"
  style="position: absolute; inset: 0; width: 100%; height: 100%; z-index: 100; opacity: 0; transform: none !important; pointer-events: {isModifierPressed
    ? 'auto'
    : 'none'}; cursor: crosshair;"
/>

<style>
  :global(.is-connecting .full-card-handle) {
    pointer-events: none;
  }
</style>
