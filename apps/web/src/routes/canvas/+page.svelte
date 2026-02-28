<script lang="ts">
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { goto } from "$app/navigation";

  let showFallback = $state(false);
  let initializationError = $state<string | null>(null);

  $effect(() => {
    const timer = setTimeout(() => {
      if (!canvasRegistry.isLoaded) showFallback = true;
    }, 5000);

    return () => clearTimeout(timer);
  });

  $effect(() => {
    if (vault.isInitialized && !vault.activeVaultId) {
      goto("/");
      return;
    }

    if (vault.activeVaultId && !canvasRegistry.isLoaded) {
      canvasRegistry.loadForVault(vault.activeVaultId).catch((err) => {
        initializationError = "Failed to load canvas registry";
        console.error(err);
      });
    }

    if (vault.activeVaultId && canvasRegistry.isLoaded) {
      if (canvasRegistry.canvases.length > 0) {
        goto(`/canvas/${canvasRegistry.canvases[0].slug}`);
      } else {
        canvasRegistry
          .create("Primary Workspace")
          .then((slug) => {
            if (slug) goto(`/canvas/${slug}`);
          })
          .catch((err) => {
            initializationError = "Failed to create initial canvas";
            console.error(err);
          });
      }
    }
  });
</script>

<div
  class="flex items-center justify-center h-screen bg-theme-bg text-theme-muted"
>
  <div class="flex flex-col items-center gap-4 max-w-md text-center px-6">
    {#if initializationError}
      <span class="icon-[lucide--alert-circle] w-12 h-12 text-red-500 mb-2"
      ></span>
      <h2
        class="text-lg font-bold text-theme-text font-mono uppercase font-header tracking-widest"
      >
        Initialization Error
      </h2>
      <p class="text-sm mb-6">{initializationError}</p>
      <button
        onclick={() => window.location.reload()}
        class="px-6 py-2 bg-theme-primary text-theme-bg font-bold rounded uppercase font-header tracking-tighter text-xs"
      >
        Retry System Boot
      </button>
    {:else}
      <div
        class="w-8 h-8 border-2 border-theme-primary border-t-transparent rounded-full animate-spin"
      ></div>
      <p class="text-xs uppercase tracking-widest font-mono">
        Initializing Workspace...
      </p>

      {#if showFallback}
        <div
          class="mt-8 p-4 border border-theme-border rounded bg-theme-surface/50 animate-in fade-in slide-in-from-bottom-2"
        >
          <p class="text-[10px] mb-4 text-theme-text opacity-70">
            The registry is taking longer than usual to respond.
          </p>
          <button
            onclick={() => canvasRegistry.loadForVault(vault.activeVaultId!)}
            class="text-[10px] font-bold text-theme-primary hover:underline uppercase font-header tracking-widest"
          >
            Force Reload Registry
          </button>
        </div>
      {/if}
    {/if}
  </div>
</div>
