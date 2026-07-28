<script lang="ts">
  import { SvelteFlowProvider } from "@xyflow/svelte";
  import { CanvasStore } from "@codex/canvas-engine";
  import CanvasWorkspace from "$lib/components/canvas/CanvasWorkspace.svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { pendingDelveTransferService } from "$lib/services/seo/pending-delve-transfer";
  import { onMount } from "svelte";
  import "@xyflow/svelte/dist/style.css";

  const engine = new CanvasStore();

  onMount(async () => {
    if (!pendingDelveTransferService.hasPending()) return;

    try {
      const slug = await pendingDelveTransferService.importPending();
      if (slug) void goto(resolve("/(app)/canvas/[slug]", { slug }));
    } catch (error) {
      console.error(
        "[DelveCanvas] Failed to import pending delve on slug page:",
        error,
      );
    }
  });
</script>

<SvelteFlowProvider>
  <CanvasWorkspace {engine} />
</SvelteFlowProvider>

<style>
  /* Consolidated styles in CanvasWorkspace.svelte */
</style>
