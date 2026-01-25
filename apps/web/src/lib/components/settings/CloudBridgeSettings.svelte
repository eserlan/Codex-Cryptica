<script lang="ts">
  import { onMount } from 'svelte';
  import { cloudConfig } from '$stores/cloud-config';
  import { syncStats } from '$stores/sync-stats';
  import { GoogleDriveAdapter } from '$lib/cloud-bridge/google-drive/adapter';

  let adapter: GoogleDriveAdapter;
  let isLoading = false;
  let error: string | null = null;

  onMount(() => {
    adapter = new GoogleDriveAdapter();
  });

  const handleToggle = async () => {
    isLoading = true;
    error = null;

    try {
      if ($cloudConfig.enabled) {
        await adapter.disconnect();
        cloudConfig.setEnabled(false);
        cloudConfig.setConnectedEmail('');
      } else {
        const email = await adapter.connect();
        cloudConfig.setEnabled(true);
        cloudConfig.setConnectedEmail(email);
      }
    } catch (e: any) {
      console.error('Cloud Bridge Error:', e);
      error = e.message || 'Failed to connect to Google Drive';
    } finally {
      isLoading = false;
    }
  };

  $: status = $syncStats.status;
  $: isSyncing = status === 'SCANNING' || status === 'SYNCING';
</script>

<div class="p-4 border rounded-lg bg-base-200">
  <h2 class="text-xl font-bold mb-4">Cloud Bridge</h2>
  
  <div class="flex items-center justify-between">
    <div>
      <h3 class="font-semibold">Google Drive Sync</h3>
      <p class="text-sm text-base-content/70">
        Mirror your lore to a private folder in your Google Drive.
      </p>
    </div>
    
    <div class="flex gap-2 items-center">
      {#if isSyncing}
        <span class="loading loading-spinner loading-sm text-primary"></span>
      {/if}

      {#if $cloudConfig.enabled}
        <button 
            class="btn btn-sm btn-ghost" 
            disabled={isLoading || isSyncing}
            on:click={() => import('$lib/cloud-bridge/worker-bridge').then(m => m.workerBridge.startSync())}
        >
            Sync Now
        </button>
      {/if}
      <input 
        type="checkbox" 
        class="toggle toggle-primary" 
        checked={$cloudConfig.enabled} 
        on:change|preventDefault={handleToggle}
        disabled={isLoading}
      />
    </div>
  </div>

  {#if $cloudConfig.enabled && $cloudConfig.connectedEmail}
    <div class="mt-4 p-2 bg-success/10 text-success rounded text-sm flex items-center gap-2 justify-between">
      <div class="flex items-center gap-2">
          <span class="icon-[heroicons--check-circle] w-5 h-5"></span>
          Connected as: <strong>{$cloudConfig.connectedEmail}</strong>
      </div>
      {#if $syncStats.stats}
        <span class="text-xs opacity-70">
            Uploaded: {$syncStats.stats.filesUploaded} | Downloaded: {$syncStats.stats.filesDownloaded}
        </span>
      {/if}
    </div>
  {/if}

  {#if error || $syncStats.lastError}
    <div class="mt-4 p-2 bg-error/10 text-error rounded text-sm">
      {error || $syncStats.lastError}
    </div>
  {/if}
</div>