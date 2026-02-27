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
  /* Consolidated styles in CanvasWorkspace.svelte */
</style>
