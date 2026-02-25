<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { GDriveBackend } from "@codex/sync-engine";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { onDestroy } from "svelte";

  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  let isConnecting = $state(false);
  let connectedUser = $state<{ email: string; name: string } | null>(null);
  let isMounted = true;

  onDestroy(() => {
    isMounted = false;
  });

  async function connect() {
    if (!CLIENT_ID) {
      uiStore.notify("Google Client ID is missing.", "error");
      return;
    }

    isConnecting = true;
    try {
      const backend = new GDriveBackend(CLIENT_ID);
      await backend.connect();
      const profile = await backend.getUserProfile();

      if (isMounted) {
        connectedUser = profile;
        uiStore.notify(`Connected as ${connectedUser.name}`, "success");
      }
    } catch (err) {
      console.error("GDrive connection failed", err);
      if (isMounted) {
        uiStore.notify("Connection failed.", "error");
      }
    } finally {
      if (isMounted) {
        isConnecting = false;
      }
    }
  }
</script>

<div
  class="flex flex-col gap-4 p-4 border border-accent-primary/20 rounded-lg bg-bg-surface/50"
>
  <h3 class="text-lg font-bold text-accent-primary">Google Drive Cloud Sync</h3>

  {#if connectedUser}
    <div class="flex items-center justify-between">
      <div class="flex flex-col">
        <span class="text-sm opacity-60">Connected as</span>
        <span class="font-medium"
          >{connectedUser.name} ({connectedUser.email})</span
        >
      </div>
      <button
        class="text-sm underline opacity-60 hover:opacity-100"
        onclick={async () => {
          await vault.disconnectCloud();
          connectedUser = null;
        }}
      >
        Disconnect
      </button>
    </div>

    <button
      class="px-4 py-2 bg-accent-primary text-bg-primary font-bold rounded-md hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
      disabled={vault.status === "saving"}
      onclick={() => (vault as any).syncToCloud(connectedUser)}
    >
      {vault.status === "saving" ? "Syncing..." : "Sync with GDrive Now"}
    </button>
  {:else}
    <p class="text-sm opacity-80">
      Connect your Google Drive to enable robust, bidirectional cloud
      synchronization across all your devices.
    </p>
    <button
      class="px-4 py-2 border border-accent-primary text-accent-primary font-bold rounded-md hover:bg-accent-primary/10 transition-all disabled:opacity-50"
      disabled={isConnecting}
      onclick={connect}
    >
      {isConnecting ? "Connecting..." : "Connect Google Drive"}
    </button>
  {/if}
</div>
