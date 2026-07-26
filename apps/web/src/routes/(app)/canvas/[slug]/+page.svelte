<script lang="ts">
  import { SvelteFlowProvider } from "@xyflow/svelte";
  import { CanvasStore } from "@codex/canvas-engine";
  import CanvasWorkspace from "$lib/components/canvas/CanvasWorkspace.svelte";
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
  import { onMount } from "svelte";
  import "@xyflow/svelte/dist/style.css";

  const engine = new CanvasStore();

  onMount(() => {
    const pendingCanvasRaw =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("__codex_pending_canvas")
        : null;
    if (pendingCanvasRaw) {
      try {
        const pendingDoc = JSON.parse(pendingCanvasRaw);
        localStorage.removeItem("__codex_pending_canvas");
        canvasRegistry.importCanvas(pendingDoc);
      } catch (e) {
        console.error("Failed to import pending canvas on slug page:", e);
      }
    }
  });
</script>

<SvelteFlowProvider>
  <CanvasWorkspace {engine} />
</SvelteFlowProvider>

<style>
  /* Consolidated styles in CanvasWorkspace.svelte */
</style>
