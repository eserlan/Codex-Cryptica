<script lang="ts">
  import { base } from "$app/paths";
  import { publishingService } from "$lib/services/publishing/PublishingService.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import PublishPreviewModal from "./PublishPreviewModal.svelte";
  import PublishingDashboard from "./PublishingDashboard.svelte";
  import PublicListingSettings from "./PublicListingSettings.svelte";

  let showPreviewModal = $state(false);

  const activeVaultId = $derived(vault.activeVaultId);
  const activeRegistry = $derived(
    activeVaultId
      ? publishingService.publishedVaults[activeVaultId]
      : undefined,
  );

  async function handleConfirmPublish() {
    if (!activeVaultId) return;
    try {
      await publishingService.publish(activeVaultId);
    } catch (err: any) {
      console.error("[PublishingSettings] Publish failed:", err);
    }
  }

  async function handleUnpublish() {
    if (!activeVaultId || !activeRegistry) return;
    const vaultTitle = vault.activeVaultRecord?.name || "this campaign";
    const confirmed = await notificationStore.confirm({
      title: "Unpublish Snapshot",
      message: `Are you sure you want to unpublish ${vaultTitle}? This action will permanently delete the snapshot JSON bundle and all associated asset files (images, maps) from the Cloudflare R2 bucket. Players and guests using the shared link will immediately receive a 404 snapshot error.`,
      confirmLabel: "Unpublish & Delete",
      cancelLabel: "Cancel",
      isDangerous: true,
    });
    if (!confirmed) return;

    try {
      await publishingService.unpublish(activeVaultId);
    } catch (err: any) {
      console.error("[PublishingSettings] Unpublish failed:", err);
    }
  }

  const shareableUrl = $derived.by(() => {
    if (!activeRegistry) return "";
    const title = vault.activeVaultRecord?.name || "vault";
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    return `${window.location.origin}/guest/${slug ? slug + "-" : ""}${activeRegistry.publishId}`;
  });

  function handleCopyLink() {
    if (!shareableUrl) return;
    navigator.clipboard.writeText(shareableUrl).then(
      () => {
        notificationStore.notify("Guest URL copied to clipboard!", "success");
      },
      () => {
        notificationStore.notify("Failed to copy link.", "error");
      },
    );
  }
</script>

<div class="space-y-6">
  <div
    class="bg-theme-bg/30 border border-theme-border/50 p-6 rounded-lg space-y-4"
  >
    <div class="flex items-start gap-4">
      <span
        class="icon-[lucide--share-2] w-8 h-8 text-theme-primary shrink-0 mt-1"
      ></span>
      <div>
        <h3
          class="text-md font-bold uppercase tracking-wider text-theme-primary font-header"
        >
          Player-Safe Snapshot Hosting
        </h3>
        <p class="text-sm text-theme-text/80 leading-relaxed mt-2">
          Publishing compiles a read-only snapshot of your campaign, cleans all
          GM secrets (lore and art direction fields), redacts private links, and
          uploads it to Cloudflare R2. This allows your players to browse your
          world asynchronously and offline without exposing your active
          workspace or secrets.
        </p>
      </div>
    </div>
  </div>

  <!-- Visibility ladder: each level is a separate, owner-controlled consent step -->
  <div
    class="bg-theme-bg/30 border border-theme-border/50 rounded-lg divide-y divide-theme-border/40"
  >
    <div class="flex items-center gap-3 px-4 py-3">
      <span
        class="icon-[lucide--lock] w-4 h-4 shrink-0 {!activeRegistry
          ? 'text-theme-primary'
          : 'text-theme-text/40'}"
      ></span>
      <div>
        <span
          class="text-xs font-bold uppercase tracking-wider {!activeRegistry
            ? 'text-theme-primary'
            : 'text-theme-text/60'}">Private</span
        >
        <p class="text-xs text-theme-text/50">
          Only you and vault editors can access this world.
        </p>
      </div>
    </div>
    <div class="flex items-center gap-3 px-4 py-3">
      <span
        class="icon-[lucide--link] w-4 h-4 shrink-0 {activeRegistry
          ? 'text-theme-primary'
          : 'text-theme-text/40'}"
      ></span>
      <div>
        <span
          class="text-xs font-bold uppercase tracking-wider {activeRegistry
            ? 'text-theme-primary'
            : 'text-theme-text/60'}">Shared Link</span
        >
        <p class="text-xs text-theme-text/50">
          Anyone with the guest link below can view a read-only snapshot.
        </p>
      </div>
    </div>
    <div class="flex items-center gap-3 px-4 py-3">
      <span class="icon-[lucide--compass] w-4 h-4 shrink-0 text-theme-text/40"
      ></span>
      <div>
        <span
          class="text-xs font-bold uppercase tracking-wider text-theme-text/60"
          >Public Listing</span
        >
        <p class="text-xs text-theme-text/50">
          Opt-in below to also list this world in <a
            href="{base}/worlds"
            class="underline hover:text-theme-primary transition-colors"
            >Explore Worlds</a
          > for anyone to discover.
        </p>
      </div>
    </div>
  </div>

  {#if publishingService.isPublishing}
    <!-- Active Publishing Progress -->
    <div
      class="bg-theme-bg/50 border border-theme-border p-6 rounded-lg space-y-4 animate-pulse"
    >
      <div class="flex justify-between items-center text-sm">
        <span
          class="font-header uppercase tracking-wider text-theme-primary font-bold"
        >
          {publishingService.statusMessage}
        </span>
        <span class="font-bold">{publishingService.progress}%</span>
      </div>
      <div class="w-full bg-theme-border/30 h-2 rounded-full overflow-hidden">
        <div
          class="bg-theme-primary h-full transition-all duration-300"
          style="width: {publishingService.progress}%"
        ></div>
      </div>
      <p class="text-xs text-theme-text/60">
        You can close this settings window. The upload runs safely in the
        background.
      </p>
    </div>
  {:else if activeRegistry}
    <!-- Already Published Status -->
    <div class="border border-theme-border rounded-lg overflow-hidden">
      <div
        class="bg-theme-primary/5 px-6 py-4 border-b border-theme-border flex justify-between items-center"
      >
        <div>
          <span
            class="text-xs text-theme-primary font-header uppercase tracking-widest font-bold"
            >Status</span
          >
          <h4
            class="text-lg font-bold text-theme-text uppercase font-header mt-1"
          >
            Active Publication
          </h4>
        </div>
        <div
          class="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded font-bold uppercase font-header tracking-wider"
        >
          <span class="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"
          ></span>
          Live
        </div>
      </div>

      <div class="p-6 space-y-6">
        <div class="space-y-2">
          <label
            for="shareable-link-input"
            class="text-xs text-theme-text/60 font-header uppercase tracking-wider block"
            >Shareable Link</label
          >
          <div class="flex gap-2">
            <input
              id="shareable-link-input"
              type="text"
              readonly
              value={shareableUrl}
              class="flex-1 bg-theme-bg/50 border border-theme-border px-3 py-2 text-sm rounded font-mono select-all text-theme-text/80 focus:outline-none"
            />
            <button
              type="button"
              onclick={handleCopyLink}
              class="px-4 py-2 bg-theme-primary hover:bg-theme-primary/95 text-white text-xs font-bold font-header uppercase tracking-wider rounded transition-all flex items-center gap-1.5"
            >
              <span class="icon-[lucide--copy] w-4 h-4"></span>
              Copy
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div
            class="p-3 bg-theme-surface border border-theme-border/40 rounded"
          >
            <span
              class="text-[10px] text-theme-text/50 font-header uppercase tracking-wider block"
              >Entities</span
            >
            <span
              class="text-lg font-bold font-header text-theme-text mt-1 block"
              >{activeRegistry.stats.entityCount}</span
            >
          </div>
          <div
            class="p-3 bg-theme-surface border border-theme-border/40 rounded"
          >
            <span
              class="text-[10px] text-theme-text/50 font-header uppercase tracking-wider block"
              >Connections</span
            >
            <span
              class="text-lg font-bold font-header text-theme-text mt-1 block"
              >{activeRegistry.stats.relationshipCount}</span
            >
          </div>
          <div
            class="p-3 bg-theme-surface border border-theme-border/40 rounded"
          >
            <span
              class="text-[10px] text-theme-text/50 font-header uppercase tracking-wider block"
              >Uploaded Assets</span
            >
            <span
              class="text-lg font-bold font-header text-theme-text mt-1 block"
              >{activeRegistry.stats.assetCount}</span
            >
          </div>
          <div
            class="p-3 bg-theme-surface border border-theme-border/40 rounded"
          >
            <span
              class="text-[10px] text-theme-text/50 font-header uppercase tracking-wider block"
              >Last Published</span
            >
            <span
              class="text-xs font-bold font-header text-theme-text mt-1 block"
            >
              {new Date(activeRegistry.publishedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div
          class="flex flex-col sm:flex-row justify-end gap-3 border-t border-theme-border pt-6"
        >
          <button
            type="button"
            onclick={handleUnpublish}
            class="px-4 py-2 border border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/5 text-xs font-bold font-header uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1.5"
          >
            <span class="icon-[lucide--trash-2] w-4 h-4"></span>
            Unpublish & Delete
          </button>
          <button
            type="button"
            onclick={() => (showPreviewModal = true)}
            class="px-5 py-2 bg-theme-primary hover:bg-theme-primary/95 text-white text-xs font-bold font-header uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1.5"
          >
            <span class="icon-[lucide--refresh-cw] w-4 h-4"></span>
            Publish Update
          </button>
        </div>
      </div>
    </div>
  {:else}
    <!-- Not Published Yet -->
    <div
      class="border border-theme-border rounded-lg p-8 text-center space-y-5 bg-theme-surface/30"
    >
      <div
        class="mx-auto w-12 h-12 rounded-full bg-theme-primary/10 flex items-center justify-center"
      >
        <span class="icon-[lucide--share-2] w-6 h-6 text-theme-primary"></span>
      </div>
      <div class="max-w-md mx-auto space-y-2">
        <h4
          class="text-md font-bold uppercase font-header tracking-wider text-theme-text"
        >
          Not Yet Shared
        </h4>
        <p class="text-sm text-theme-text/60 leading-relaxed">
          Generate your first read-only snapshot link to share your campaign
          lore with players.
        </p>
      </div>
      <button
        type="button"
        onclick={() => (showPreviewModal = true)}
        disabled={!activeVaultId}
        class="px-6 py-3 bg-theme-primary hover:bg-theme-primary/95 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold font-header uppercase tracking-widest rounded transition-all inline-flex items-center gap-2 shadow-sm"
      >
        <span class="icon-[lucide--cloud-lightning] w-4 h-4"></span>
        Publish Guest Snapshot
      </button>
    </div>
  {/if}

  <PublicListingSettings
    publishId={activeRegistry?.publishId}
    writeToken={activeRegistry?.writeToken}
    vaultTitle={vault.activeVaultRecord?.name || "Untitled World"}
    {notificationStore}
  />

  <div class="border-t border-theme-border/50 pt-6 mt-8">
    <PublishingDashboard />
  </div>
</div>

{#if showPreviewModal && activeVaultId}
  <PublishPreviewModal
    bind:show={showPreviewModal}
    vaultId={activeVaultId}
    onConfirm={handleConfirmPublish}
  />
{/if}
