<script lang="ts">
  import { publishingService } from "$lib/services/publishing/PublishingService.svelte";
  import { onMount } from "svelte";

  let { show = $bindable(), vaultId, onConfirm } = $props();

  let loading = $state(true);
  let error = $state<string | null>(null);
  let previewStats = $state<{
    included: {
      entityCount: number;
      relationshipCount: number;
      mapCount: number;
      canvasCount: number;
      assetCount: number;
    };
    excluded: {
      entityCount: number;
      relationshipCount: number;
      mapCount: number;
      canvasCount: number;
    };
  } | null>(null);

  onMount(async () => {
    try {
      loading = true;
      previewStats = await publishingService.getPublishPreview(vaultId);
    } catch (e: any) {
      error = e.message || "Failed to generate preview.";
    } finally {
      loading = false;
    }
  });

  function handleConfirm() {
    show = false;
    onConfirm();
  }

  function handleCancel() {
    show = false;
  }
</script>

{#if show}
  <div
    class="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
  >
    <div
      class="bg-theme-bg border border-theme-border w-full max-w-lg rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] font-body text-theme-text"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="px-6 py-4 border-b border-theme-border flex justify-between items-center"
      >
        <h3
          class="text-md font-bold uppercase font-header tracking-wider text-theme-primary flex items-center gap-2"
        >
          <span class="icon-[lucide--share-2] w-5 h-5 text-theme-primary"
          ></span>
          Publish Guest Snapshot
        </h3>
        <button
          type="button"
          onclick={handleCancel}
          class="text-theme-text/60 hover:text-theme-text transition-colors"
          aria-label="Close modal"
        >
          <span class="icon-[lucide--x] w-5 h-5"></span>
        </button>
      </div>

      <div class="p-6 overflow-y-auto space-y-4">
        {#if loading}
          <div class="flex flex-col items-center justify-center py-8 space-y-3">
            <div
              class="w-8 h-8 border-2 border-theme-primary border-t-transparent rounded-full animate-spin"
            ></div>
            <p
              class="text-sm text-theme-text/60 font-header uppercase tracking-wider animate-pulse"
            >
              Analyzing Campaign Lore...
            </p>
          </div>
        {:else if error}
          <div
            class="p-4 bg-red-950/20 border border-red-500/30 text-red-200 text-sm rounded"
          >
            {error}
          </div>
        {:else if previewStats}
          <p class="text-sm leading-relaxed text-theme-text/80">
            Publishing exports a read-only, player-safe snapshot of your
            campaign. Your active authoring database remains strictly local and
            private.
          </p>

          <div class="grid grid-cols-2 gap-4">
            <div
              class="p-4 bg-theme-primary/5 border border-theme-primary/10 rounded-lg"
            >
              <h4
                class="text-xs font-bold uppercase tracking-wider text-theme-primary font-header mb-3"
              >
                Included (Player Safe)
              </h4>
              <ul class="space-y-1.5 text-sm">
                <li class="flex justify-between">
                  <span class="text-theme-text/60">Entities:</span>
                  <span class="font-bold"
                    >{previewStats.included.entityCount}</span
                  >
                </li>
                <li class="flex justify-between">
                  <span class="text-theme-text/60">Connections:</span>
                  <span class="font-bold"
                    >{previewStats.included.relationshipCount}</span
                  >
                </li>
                <li class="flex justify-between">
                  <span class="text-theme-text/60">Maps:</span>
                  <span class="font-bold">{previewStats.included.mapCount}</span
                  >
                </li>
                <li class="flex justify-between">
                  <span class="text-theme-text/60">Canvases:</span>
                  <span class="font-bold"
                    >{previewStats.included.canvasCount}</span
                  >
                </li>
                <li
                  class="flex justify-between border-t border-theme-border/50 pt-1.5 mt-1.5"
                >
                  <span class="text-theme-text/60">Referenced Assets:</span>
                  <span class="font-bold"
                    >{previewStats.included.assetCount}</span
                  >
                </li>
              </ul>
            </div>

            <div
              class="p-4 bg-yellow-950/5 border border-yellow-500/10 rounded-lg"
            >
              <h4
                class="text-xs font-bold uppercase tracking-wider text-yellow-400 font-header mb-3"
              >
                Excluded (Secrets & Drafts)
              </h4>
              <ul class="space-y-1.5 text-sm">
                <li class="flex justify-between">
                  <span class="text-theme-text/60">Entities:</span>
                  <span class="font-bold text-yellow-500/85"
                    >{previewStats.excluded.entityCount}</span
                  >
                </li>
                <li class="flex justify-between">
                  <span class="text-theme-text/60">Connections:</span>
                  <span class="font-bold text-yellow-500/85"
                    >{previewStats.excluded.relationshipCount}</span
                  >
                </li>
                <li class="flex justify-between">
                  <span class="text-theme-text/60">Maps:</span>
                  <span class="font-bold text-yellow-500/85"
                    >{previewStats.excluded.mapCount}</span
                  >
                </li>
                <li class="flex justify-between">
                  <span class="text-theme-text/60">Canvases:</span>
                  <span class="font-bold text-yellow-500/85"
                    >{previewStats.excluded.canvasCount}</span
                  >
                </li>
              </ul>
            </div>
          </div>

          <div
            class="p-3 bg-theme-bg border border-theme-border/50 rounded text-xs text-theme-text/60 flex items-start gap-2"
          >
            <span
              class="icon-[lucide--info] w-4 h-4 text-theme-primary shrink-0 mt-0.5"
            ></span>
            <span
              >All GM-only secrets (lore and art direction fields) are
              physically deleted in the browser before upload. Dangling links
              pointing to private nodes will show as <em>[Redacted]</em>.</span
            >
          </div>
        {/if}
      </div>

      <div
        class="px-6 py-4 border-t border-theme-border bg-theme-bg/30 flex justify-end gap-3"
      >
        <button
          type="button"
          onclick={handleCancel}
          class="px-4 py-2 border border-theme-border text-theme-text/80 hover:text-theme-text text-sm rounded font-bold uppercase font-header tracking-wider transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          onclick={handleConfirm}
          disabled={loading || !!error}
          class="px-5 py-2 bg-theme-primary hover:bg-theme-primary/95 disabled:opacity-40 disabled:pointer-events-none text-white text-sm rounded font-bold uppercase font-header tracking-wider transition-all flex items-center gap-2"
        >
          <span class="icon-[lucide--cloud-upload] w-4 h-4"></span>
          Publish Snapshot
        </button>
      </div>
    </div>
  </div>
{/if}
