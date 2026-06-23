<script lang="ts">
  import { publishingService } from "$lib/services/publishing/PublishingService.svelte";
  import { vaultRegistry } from "$lib/stores/vault-registry.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import UnpublishConfirmModal from "./UnpublishConfirmModal.svelte";

  let showUnpublishModal = $state(false);
  let selectedVaultId = $state<string | null>(null);
  let selectedVaultTitle = $state<string>("");

  const items = $derived.by(() => {
    return Object.values(publishingService.publishedVaults).sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  });

  const vaultNames = $derived.by(() => {
    const map: Record<string, string> = {};
    for (const v of vaultRegistry.availableVaults) {
      map[v.id] = v.name;
    }
    return map;
  });

  function getVaultName(vaultId: string): string {
    return vaultNames[vaultId] || "Unknown Campaign";
  }

  function handleCopyLink(publishId: string) {
    const url = `${window.location.origin}/guest/${publishId}`;
    navigator.clipboard.writeText(url).then(
      () => {
        notificationStore.notify("Guest URL copied to clipboard!", "success");
      },
      () => {
        notificationStore.notify("Failed to copy link.", "error");
      },
    );
  }

  function triggerUnpublish(vaultId: string, title: string) {
    selectedVaultId = vaultId;
    selectedVaultTitle = title;
    showUnpublishModal = true;
  }

  async function handleConfirmUnpublish() {
    if (!selectedVaultId) return;
    try {
      await publishingService.unpublish(selectedVaultId);
    } catch (err: any) {
      console.error("[PublishingDashboard] Unpublish failed:", err);
    } finally {
      selectedVaultId = null;
    }
  }
</script>

<div class="space-y-4">
  <div
    class="flex items-center justify-between border-b border-theme-border/50 pb-2"
  >
    <h4
      class="text-xs font-bold uppercase tracking-wider text-theme-primary font-header"
    >
      Published Campaigns Registry
    </h4>
    <span class="text-[10px] text-theme-text/50 font-mono">
      {items.length} active shared link{items.length === 1 ? "" : "s"}
    </span>
  </div>

  {#if items.length === 0}
    <div
      class="p-6 text-center border border-dashed border-theme-border/40 rounded-lg text-theme-text/50 text-sm"
    >
      No published campaign snapshots found.
    </div>
  {:else}
    <div class="space-y-3">
      {#each items as item}
        {@const title = getVaultName(item.vaultId)}
        <div
          class="p-4 bg-theme-surface/50 border border-theme-border/40 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="font-bold text-sm text-theme-primary">{title}</span>
              <span
                class="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] rounded font-bold uppercase tracking-wider"
              >
                Live
              </span>
            </div>
            <div
              class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-theme-text/60"
            >
              <span
                >Published: {new Date(
                  item.publishedAt,
                ).toLocaleDateString()}</span
              >
              <span>•</span>
              <span>Entities: {item.stats.entityCount}</span>
              <span>•</span>
              <span>Assets: {item.stats.assetCount}</span>
            </div>
          </div>

          <div class="flex items-center gap-2 justify-end">
            <button
              type="button"
              onclick={() => handleCopyLink(item.publishId)}
              class="px-2.5 py-1.5 border border-theme-border hover:border-theme-primary hover:text-theme-primary text-xs font-bold font-header uppercase tracking-wider rounded transition-all flex items-center gap-1"
              title="Copy public link"
            >
              <span class="icon-[lucide--copy] w-3.5 h-3.5"></span>
              Link
            </button>
            <button
              type="button"
              onclick={() => triggerUnpublish(item.vaultId, title)}
              class="px-2.5 py-1.5 border border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/5 text-xs font-bold font-header uppercase tracking-wider rounded transition-all flex items-center gap-1"
              title="Delete snapshot from cloud"
            >
              <span class="icon-[lucide--trash-2] w-3.5 h-3.5"></span>
              Unpublish
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if showUnpublishModal && selectedVaultId}
  <UnpublishConfirmModal
    bind:show={showUnpublishModal}
    vaultTitle={selectedVaultTitle}
    onConfirm={handleConfirmUnpublish}
  />
{/if}
