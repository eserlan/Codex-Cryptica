<script lang="ts">
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { goto } from "$app/navigation";

  $effect(() => {
    if (vault.activeVaultId && canvasRegistry.isLoaded) {
      if (canvasRegistry.canvases.length > 0) {
        goto(`/canvas/${canvasRegistry.canvases[0].id}`);
      } else {
        // Create default canvas if none exist
        canvasRegistry.create("Primary Workspace").then((id) => {
          if (id) goto(`/canvas/${id}`);
        });
      }
    }
  });
</script>

<div
  class="flex items-center justify-center h-screen bg-theme-bg text-theme-muted"
>
  <div class="flex flex-col items-center gap-4">
    <div
      class="w-8 h-8 border-2 border-theme-primary border-t-transparent rounded-full animate-spin"
    ></div>
    <p class="text-xs uppercase tracking-widest font-mono">
      Initializing Workspace...
    </p>
  </div>
</div>
