<script lang="ts">
  import { SvelteFlowProvider } from "@xyflow/svelte";
  import { CanvasStore } from "@codex/canvas-engine";
  import CanvasWorkspace from "$lib/components/canvas/CanvasWorkspace.svelte";
  import "@xyflow/svelte/dist/style.css";

  const engine = new CanvasStore();
</script>

<SvelteFlowProvider>
  <CanvasWorkspace {engine} />
</SvelteFlowProvider>

<style>
  :global(.svelte-flow) {
    background-color: var(--theme-bg);
  }
  :global(.svelte-flow__edge-path) {
    stroke: var(--theme-primary);
    stroke-width: 2;
  }
  :global(.svelte-flow__controls) {
    background: var(--theme-surface);
    border: 1px solid var(--theme-border);
    border-radius: 8px;
    overflow: hidden;
  }
  :global(.svelte-flow__controls-button) {
    background: var(--theme-surface);
    fill: var(--theme-text);
    border-bottom: 1px solid var(--theme-border);
  }
  :global(.svelte-flow__controls-button:hover) {
    background: var(--theme-bg);
  }
</style>
