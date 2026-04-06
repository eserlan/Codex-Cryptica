<script lang="ts">
  import { uiStore } from "$lib/stores/ui.svelte";

  const error = $derived(uiStore.globalError);
  const isEnabled = $derived(!(window as any).DISABLE_ERROR_OVERLAY);
</script>

{#if error && isEnabled}
  <div
    class="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 text-red-500 font-mono"
  >
    <div
      class="max-w-2xl w-full border border-red-900 bg-red-950/20 p-8 rounded shadow-2xl relative"
    >
      <div
        class="absolute -top-px -left-px w-4 h-4 border-t-2 border-l-2 border-red-500"
      ></div>
      <div
        class="absolute -bottom-px -right-px w-4 h-4 border-b-2 border-r-2 border-red-500"
      ></div>

      <h2 class="text-2xl font-black mb-4 flex items-center gap-3">
        <span class="icon-[lucide--alert-triangle] w-8 h-8"></span>
        SYSTEM FAILURE
      </h2>
      <p class="text-red-400 mb-6 font-bold">
        {error.message}
      </p>
      {#if error.stack}
        <pre
          class="bg-black/50 p-4 rounded text-[10px] overflow-auto max-h-40 border border-red-900/30 mb-6">{error.stack}</pre>
      {/if}
      <div class="flex gap-4">
        <button
          onclick={() => window.location.reload()}
          class="flex-1 py-3 bg-red-600 hover:bg-red-500 text-black font-bold rounded transition-all active:scale-95 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
        >
          REBOOT SYSTEM
        </button>
        <button
          onclick={() => uiStore.clearGlobalError()}
          class="px-6 py-3 border border-red-900 text-red-900 hover:text-red-500 hover:border-red-500 transition-colors"
        >
          IGNORE
        </button>
      </div>
    </div>
  </div>
{/if}
