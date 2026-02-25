<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { GDriveBackend } from "@codex/sync-engine";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { onDestroy, onMount } from "svelte";
  import GDriveFolderPicker from "./GDriveFolderPicker.svelte";

  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  let isConnecting = $state(false);
  let connectedUser = $state<{ email: string; name: string } | null>(null);
  let cloudMetadata = $state<
    | {
        gdriveFolderId: string;
        gdriveFolderName?: string;
        lastSyncTime?: number;
      }
    | null
    | undefined
  >(null);
  let showPicker = $state(false);

  let error = $state<string | null>(null);
  let isMounted = true;

  onDestroy(() => {
    isMounted = false;
  });

  onMount(async () => {
    cloudMetadata = await vault.getCloudMetadata();
  });

  async function connect() {
    if (!CLIENT_ID) {
      uiStore.notify("Google Client ID is missing.", "error");
      return;
    }

    isConnecting = true;
    try {
      console.log("[GDriveConnect] Initiating connection...");
      // If we already have a backend in vault, use it
      let backend = (vault as any).gdriveBackend;
      if (!backend) {
        console.log("[GDriveConnect] No existing backend, creating new one...");
        backend = new GDriveBackend(CLIENT_ID);
        (vault as any).gdriveBackend = backend;
      }

      console.log("[GDriveConnect] Calling connect('select_account')...");
      await backend.connect("select_account");
      console.log(
        "[GDriveConnect] Authentication successful, fetching profile...",
      );
      const profile = await backend.getUserProfile();

      if (isMounted) {
        connectedUser = profile;
        cloudMetadata = await vault.getCloudMetadata();
        uiStore.notify(`Connected as ${profile.name}`, "success");
      }
    } catch (err: any) {
      console.error("GDrive connection failed", err);
      if (isMounted) {
        const msg =
          err.error === "popup_blocked_by_browser"
            ? "Popup blocked. Please allow popups for this site."
            : "Connection failed.";
        uiStore.notify(msg, "error");
      }
    } finally {
      if (isMounted) {
        isConnecting = false;
      }
    }
  }

  async function handleFolderSelect(folder: { id: string; name: string }) {
    showPicker = false;
    try {
      await vault.updateCloudFolder(folder.id);
      cloudMetadata = await vault.getCloudMetadata();
      uiStore.notify(`Linked to folder: ${folder.name}`, "success");
    } catch (err: any) {
      console.error("Failed to update cloud folder", err);
      uiStore.notify("Failed to link folder.", "error");
    }
  }
</script>

<div
  class="flex flex-col gap-4 p-4 border border-accent-primary/20 rounded-lg bg-bg-surface/50"
>
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-bold text-accent-primary">
      Google Drive Cloud Sync
    </h3>
    {#if connectedUser}
      <button
        class="text-[10px] uppercase font-bold text-theme-muted hover:text-theme-text transition-colors"
        onclick={async () => {
          await vault.disconnectCloud();
          connectedUser = null;
          cloudMetadata = null;
        }}
      >
        Disconnect
      </button>
    {/if}
  </div>

  {#if connectedUser}
    <div class="space-y-4">
      <div
        class="flex flex-col bg-theme-bg/30 p-3 rounded border border-theme-border/50"
      >
        <span class="text-[10px] text-theme-muted uppercase font-mono"
          >Account</span
        >
        <span class="text-sm font-medium"
          >{connectedUser.name} ({connectedUser.email})</span
        >
      </div>

      <div
        class="flex flex-col bg-theme-bg/30 p-3 rounded border border-theme-border/50"
      >
        <div class="flex items-center justify-between">
          <span class="text-[10px] text-theme-muted uppercase font-mono"
            >Linked Folder</span
          >
          <button
            class="text-[10px] text-accent-primary hover:underline font-bold uppercase"
            onclick={() => (showPicker = true)}
          >
            Change
          </button>
        </div>
        {#if cloudMetadata?.gdriveFolderId}
          <div class="flex flex-col mt-1">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold truncate max-w-[200px]">
                {cloudMetadata.gdriveFolderName || "Unknown Folder"}
              </span>
              <a
                href="https://drive.google.com/drive/folders/{cloudMetadata.gdriveFolderId}"
                target="_blank"
                rel="noopener noreferrer"
                class="icon-[lucide--external-link] w-3 h-3 text-theme-muted hover:text-accent-primary"
                aria-label="Open folder in Google Drive"
              ></a>
            </div>
            <span class="text-[9px] font-mono text-theme-muted truncate"
              >{cloudMetadata.gdriveFolderId}</span
            >
          </div>
        {:else}
          <span class="text-xs italic text-theme-muted mt-1"
            >Auto-managed (CodexCryptica/{vault.activeVaultId})</span
          >
        {/if}
      </div>

      {#if cloudMetadata?.lastSyncTime}
        <div
          class="flex items-center gap-2 px-1 text-[10px] text-theme-muted font-mono uppercase"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-theme-primary/50"></span>
          Last Synchronized: {new Date(
            cloudMetadata.lastSyncTime,
          ).toLocaleString()}
        </div>
      {/if}

      <button
        class="w-full px-4 py-3 bg-accent-primary text-bg-primary font-bold rounded-md hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 shadow-lg shadow-accent-primary/10"
        disabled={vault.status === "saving"}
        onclick={() => (vault as any).syncToCloud(connectedUser)}
      >
        {vault.status === "saving" ? "Syncing..." : "Run Synchronization Now"}
      </button>

      {#if error}
        <div
          class="p-3 bg-red-500/10 border border-red-500/30 rounded text-[11px] text-red-500 leading-tight"
        >
          {error}
        </div>
      {/if}
    </div>
  {:else}
    <div class="space-y-4">
      <p class="text-sm opacity-80 leading-relaxed">
        Mirror your local-first archives to Google Drive for multi-device
        access, backup, and collaborative lore-building.
      </p>

      <div
        class="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-[11px] text-yellow-500/90 leading-normal"
      >
        Note: If you have <strong>Cross-Origin-Opener-Policy</strong> active,
        ensure it is set to <code>same-origin-allow-popups</code> to allow the authentication
        window to communicate.
      </div>

      <button
        class="w-full px-4 py-3 border border-accent-primary text-accent-primary font-bold rounded-md hover:bg-accent-primary/10 transition-all disabled:opacity-50"
        disabled={isConnecting}
        onclick={connect}
      >
        {isConnecting ? "Authenticating..." : "Connect Google Drive"}
      </button>
    </div>
  {/if}
</div>

{#if showPicker && (vault as any).gdriveBackend}
  <GDriveFolderPicker
    backend={(vault as any).gdriveBackend}
    onSelect={handleFolderSelect}
    onCancel={() => (showPicker = false)}
  />
{/if}
