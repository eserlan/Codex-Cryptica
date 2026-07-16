<script lang="ts">
  import { driveStore } from "$lib/stores/drive.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import {
    connectVaultToDrive,
    disconnectVaultFromDrive,
    pushVaultToDrive,
    pullVaultFromDrive,
    listDriveVaults,
    importVaultFromDrive,
    joinSharedVault,
  } from "@codex/gdrive-sync";
  import { onMount } from "svelte";
  import { getDB } from "$lib/utils/idb";
  import { SyncRegistry, CloudSyncMetadataService } from "@codex/sync-engine";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

  let isConnecting = $state(false);
  let isPushing = $state(false);
  let isPulling = $state(false);
  let manualFolderId = $state("");
  let showManualInput = $state(false);
  let metadata = $state<any>(null);

  // Vault importer state
  let isLoadingDriveVaults = $state(false);
  let driveVaults = $state<Array<{ id: string; name: string }> | null>(null);
  let isImporting = $state(false);

  // Join shared vault state
  let shareLink = $state("");
  let isJoining = $state(false);

  const hasClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  async function loadMetadata() {
    if (!vault.activeVaultId) return;
    const db = await getDB();
    const ms = new CloudSyncMetadataService(new SyncRegistry(db));
    metadata = await ms.getMetadata(vault.activeVaultId);
    if (metadata) {
      driveStore.status = "connected";
    }
  }

  onMount(() => {
    loadMetadata();
  });

  async function handleConnect() {
    console.log(
      "[DriveSettings] handleConnect triggered. Active Vault ID:",
      vault.activeVaultId,
    );
    if (!vault.activeVaultId) {
      console.warn("[DriveSettings] Cannot connect: No active vault ID found.");
      notificationStore.notify("No active vault selected.", "error");
      return;
    }
    isConnecting = true;
    try {
      console.log("[DriveSettings] Starting connectVaultToDrive flow...");
      await connectVaultToDrive(
        vault.activeVaultId,
        showManualInput ? manualFolderId : undefined,
      );
      console.log(
        "[DriveSettings] connectVaultToDrive complete. Loading metadata...",
      );
      await loadMetadata();
      notificationStore.notify("Connected to Google Drive", "success");
    } catch (e: any) {
      console.error("[DriveSettings] Connection flow failed:", e);
      notificationStore.notify(
        e.message || "Failed to connect to Google Drive",
        "error",
      );
    } finally {
      isConnecting = false;
    }
  }

  async function handleDisconnect() {
    if (!vault.activeVaultId) return;
    const confirmed = await notificationStore.confirm({
      title: "Disconnect Google Drive?",
      message:
        "This will stop mirroring this vault to the cloud. Your local data will be preserved.",
      confirmLabel: "Disconnect",
      isDangerous: true,
    });

    if (confirmed) {
      await disconnectVaultFromDrive(vault.activeVaultId);
      metadata = null;
      notificationStore.notify("Google Drive disconnected", "info");
    }
  }

  async function handlePush() {
    if (!vault.activeVaultId) return;
    isPushing = true;
    notificationStore.notify(
      "Cloud sync started in background. You can continue working.",
      "info",
    );
    try {
      await pushVaultToDrive(vault.activeVaultId);
      await loadMetadata();
      notificationStore.notify("Vault saved to Google Drive", "success");
    } catch (e: any) {
      notificationStore.notify(e.message || "Failed to push to Drive", "error");
    } finally {
      isPushing = false;
    }
  }

  async function handlePull() {
    if (!vault.activeVaultId) return;
    const confirmed = await notificationStore.confirm({
      title: "Overwrite from Cloud?",
      message:
        "This will replace your local vault content with the version stored on Google Drive. Continue?",
      confirmLabel: "Pull from Drive",
      isDangerous: true,
    });

    if (!confirmed) return;

    isPulling = true;
    notificationStore.notify(
      "Cloud pull started in background. Please wait...",
      "info",
    );
    try {
      await pullVaultFromDrive(vault.activeVaultId);
      await loadMetadata();
      notificationStore.notify("Vault loaded from Google Drive", "success");
    } catch (e: any) {
      notificationStore.notify(
        e.message || "Failed to pull from Drive",
        "error",
      );
    } finally {
      isPulling = false;
    }
  }

  async function handleShowDriveVaults() {
    isLoadingDriveVaults = true;
    driveVaults = null;
    try {
      driveVaults = await listDriveVaults();
    } catch (e: any) {
      notificationStore.notify(
        e.message || "Failed to list Drive vaults",
        "error",
      );
    } finally {
      isLoadingDriveVaults = false;
    }
  }

  async function handleImportVault(id: string, name: string) {
    isImporting = true;
    notificationStore.notify(`Importing vault "${name}" from Drive…`, "info");
    try {
      await importVaultFromDrive(id, name);
      driveVaults = null;
      await loadMetadata();
      notificationStore.notify(`Vault "${name}" loaded from Drive`, "success");
    } catch (e: any) {
      notificationStore.notify(e.message || "Failed to import vault", "error");
    } finally {
      isImporting = false;
    }
  }

  async function handleJoinSharedVault() {
    const link = shareLink.trim();
    if (!link) return;
    isJoining = true;
    notificationStore.notify("Connecting to shared vault…", "info");
    try {
      await joinSharedVault(link);
      shareLink = "";
      await loadMetadata();
      notificationStore.notify("Shared vault loaded successfully", "success");
    } catch (e: any) {
      notificationStore.notify(
        e.message || "Failed to join shared vault",
        "error",
      );
    } finally {
      isJoining = false;
    }
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-lg font-medium text-theme-text flex items-center gap-2">
        <span class="icon-[lucide--cloud] h-5 w-5 text-theme-primary"></span>
        Cloud Sync
      </h3>
      <p class="text-sm text-theme-muted">
        Manually backup your vault to Google Drive or restore from the cloud.
      </p>
    </div>
  </div>

  {#if !hasClientId}
    <div
      class="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2"
    >
      <div
        class="flex items-center gap-2 text-amber-500 text-sm font-bold uppercase tracking-wider"
      >
        <span class="icon-[lucide--alert-triangle] h-4 w-4"></span>
        Configuration Missing
      </div>
      <p class="text-xs text-theme-muted leading-relaxed">
        The <code>VITE_GOOGLE_CLIENT_ID</code> environment variable is not set. Google
        Drive integration is currently disabled.
      </p>
    </div>
  {/if}

  {#if metadata}
    <div class="space-y-4">
      <div
        class="p-4 rounded-lg border border-theme-border bg-theme-surface space-y-4"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center"
            >
              <span class="icon-[lucide--check-circle] h-6 w-6 text-green-500"
              ></span>
            </div>
            <div>
              <div class="text-sm font-medium text-theme-text">
                Connected to Google Drive
              </div>
              <div
                class="text-xs text-theme-muted font-mono truncate max-w-[200px]"
              >
                ID: {metadata.remoteFolderId}
              </div>
            </div>
          </div>
          <button
            onclick={handleDisconnect}
            class="px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-md transition-colors border border-red-500/20"
          >
            Disconnect
          </button>
        </div>

        <div
          class="pt-2 border-t border-theme-border flex items-center justify-between text-xs"
        >
          <span class="text-theme-muted italic">
            Last Synced: {metadata.lastSyncTime
              ? new Date(metadata.lastSyncTime).toLocaleString()
              : "Never"}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <button
          onclick={handlePush}
          disabled={isPushing || isPulling}
          class="flex flex-col items-center gap-2 p-4 rounded-lg border border-theme-border bg-theme-surface hover:border-theme-primary/50 transition-all group disabled:opacity-50"
        >
          <span
            class="icon-[lucide--upload-cloud] h-6 w-6 text-theme-primary group-hover:scale-110 transition-transform"
          ></span>
          <span
            class="text-xs font-bold uppercase tracking-widest text-theme-text"
          >
            {isPushing ? "Saving..." : "Save to Drive"}
          </span>
        </button>

        <button
          onclick={handlePull}
          disabled={isPushing || isPulling}
          class="flex flex-col items-center gap-2 p-4 rounded-lg border border-theme-border bg-theme-surface hover:border-theme-primary/50 transition-all group disabled:opacity-50"
        >
          <span
            class="icon-[lucide--download-cloud] h-6 w-6 text-theme-secondary group-hover:scale-110 transition-transform"
          ></span>
          <span
            class="text-xs font-bold uppercase tracking-widest text-theme-text"
          >
            {isPulling ? "Loading..." : "Load from Drive"}
          </span>
        </button>
      </div>
    </div>
  {:else}
    <div class="space-y-4">
      <button
        onclick={handleConnect}
        disabled={isConnecting || !hasClientId}
        aria-busy={isConnecting}
        class="w-full py-3 px-4 flex items-center justify-center gap-2 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-lg font-medium transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {#if isConnecting}
          <span class="icon-[lucide--loader-2] h-5 w-5 animate-spin"></span>
          Connecting...
        {:else}
          <span class="icon-[lucide--plus-circle] h-5 w-5"></span>
          Connect Google Drive
        {/if}
      </button>

      <div class="text-center">
        <button
          onclick={() => (showManualInput = !showManualInput)}
          class="text-xs text-theme-muted hover:text-theme-primary underline underline-offset-4"
        >
          {showManualInput
            ? "Hide advanced options"
            : "Supply existing folder ID (Advanced)"}
        </button>
      </div>

      {#if showManualInput}
        <div class="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2">
          <label
            for="folder-id"
            class="text-xs font-medium text-theme-muted uppercase tracking-wider"
          >
            Folder ID
          </label>
          <input
            id="folder-id"
            type="text"
            bind:value={manualFolderId}
            placeholder="Enter Google Drive Folder ID"
            class="w-full px-3 py-2 bg-theme-bg border border-theme-border rounded-md text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary/50 font-mono"
          />
          <p class="text-[10px] text-theme-muted italic leading-relaxed">
            Use this to connect to a folder shared by a co-host or from another
            device.
          </p>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Import vault from Drive -->
  {#if hasClientId}
    <div class="border-t border-theme-border pt-4 space-y-3">
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-bold text-theme-text uppercase tracking-widest">
          Import Vault from Drive
        </h4>
        <button
          onclick={handleShowDriveVaults}
          disabled={isLoadingDriveVaults || isImporting}
          class="text-xs text-theme-primary hover:underline disabled:opacity-50"
        >
          {isLoadingDriveVaults ? "Loading…" : "Browse Drive"}
        </button>
      </div>

      {#if driveVaults !== null}
        {#if driveVaults.length === 0}
          <p class="text-xs text-theme-muted italic">
            No vaults found in CodexCryptica folder on Drive.
          </p>
        {:else}
          <div class="space-y-1">
            {#each driveVaults as v (v.id)}
              <button
                onclick={() => handleImportVault(v.id, v.name)}
                disabled={isImporting}
                class="w-full flex items-center justify-between px-3 py-2 rounded-md border border-theme-border bg-theme-surface hover:border-theme-primary/50 transition-all text-left disabled:opacity-50"
              >
                <span class="flex items-center gap-2 text-sm text-theme-text">
                  <span class="icon-[lucide--folder] h-4 w-4 text-theme-primary"
                  ></span>
                  {v.name}
                </span>
                <span class="text-xs text-theme-muted">
                  {isImporting ? "Importing…" : "Load"}
                </span>
              </button>
            {/each}
          </div>
        {/if}
      {/if}
    </div>
  {/if}

  <!-- Join a shared vault (co-GM flow) -->
  {#if hasClientId}
    <div class="border-t border-theme-border pt-4 space-y-3">
      <div>
        <h4 class="text-xs font-bold text-theme-text uppercase tracking-widest">
          Join a Shared Vault
        </h4>
        <p class="text-[10px] text-theme-muted mt-1 leading-relaxed">
          Paste a Drive share link from your GM to load their vault. Google will
          ask you to grant access.
        </p>
      </div>
      <div class="flex gap-2">
        <input
          type="url"
          bind:value={shareLink}
          placeholder="https://drive.google.com/drive/folders/..."
          disabled={isJoining}
          onkeydown={(e) => e.key === "Enter" && handleJoinSharedVault()}
          class="flex-1 px-3 py-2 bg-theme-bg border border-theme-border rounded-md text-xs text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary/50 font-mono placeholder-theme-muted disabled:opacity-50"
        />
        <button
          onclick={handleJoinSharedVault}
          disabled={isJoining || !shareLink.trim()}
          class="px-3 py-2 bg-theme-primary text-theme-bg text-xs font-bold rounded-md hover:bg-theme-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {isJoining ? "Joining…" : "Join"}
        </button>
      </div>
    </div>
  {/if}

  <div class="rounded-lg bg-theme-primary/5 border border-theme-primary/10 p-4">
    <h4
      class="text-xs font-bold text-theme-primary uppercase tracking-widest mb-2"
    >
      How it works
    </h4>
    <ul class="text-xs text-theme-muted space-y-2 list-disc pl-4">
      <li>
        Vault data is manually backed up to your personal Google Drive account.
      </li>
      <li>
        The project servers <strong>never</strong> see or store your vault content.
      </li>
      <li>
        Authentication happens via Google Identity Services and the token is
        kept only in memory.
      </li>
      <li>
        Sync is explicit: you choose when to save your changes to the cloud or
        load data from it.
      </li>
    </ul>
  </div>
</div>
