<script lang="ts">
  import { cloudConfig } from "$stores/cloud-config";
  import { gdriveAdapter as gdrive } from "$stores/gdrive.svelte";
  import { get } from "svelte/store";

  let { close }: { close: () => void } = $props();

  let loading = $state(false);
  let error = $state<string | null>(null);
  let shareLink = $state<string | null>(null);
  
  // Initialize state from cloudConfig
  const config = get(cloudConfig);
  if (config.shareLink) {
    shareLink = config.shareLink;
  }

  const handleShare = async () => {
    loading = true;
    error = null;
    try {
      const folderId = await gdrive.shareFolderPublicly();
      if (folderId) {
        // Construct internal link
        const url = new URL(window.location.href);
        url.searchParams.set("shareId", folderId);
        const link = url.toString();
        
        shareLink = link;
        
        // Save to config
        cloudConfig.setShareStatus("public");
        cloudConfig.setShareLink(link);
        cloudConfig.setGdriveFolderId(folderId);
      }
    } catch (err: any) {
      console.error(err);
      error = err.message || "Failed to share campaign";
    } finally {
      loading = false;
    }
  };

  const handleRevoke = async () => {
    loading = true;
    error = null;
    try {
      await gdrive.revokeShare();
      shareLink = null;
      
      // Update config
      cloudConfig.setShareStatus("private");
      cloudConfig.setShareLink(undefined);
    } catch (err: any) {
      console.error(err);
      error = err.message || "Failed to revoke share";
    } finally {
      loading = false;
    }
  };

  const copyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
    }
  };
</script>

<div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
  <div class="bg-gray-900 border border-green-800 p-6 rounded-lg max-w-md w-full shadow-2xl relative font-mono text-gray-300">
    <button 
        class="absolute top-2 right-2 text-gray-500 hover:text-white"
        onclick={close}
    >
        <span class="icon-[heroicons--x-mark] w-5 h-5"></span>
    </button>
    
    <h2 class="text-xl font-bold text-green-500 mb-4 tracking-wider uppercase flex items-center gap-2">
        <span class="icon-[lucide--share-2] w-5 h-5"></span>
        Share Campaign
    </h2>

    <p class="text-xs mb-6 text-gray-400">
        Generate a read-only link to share your campaign. 
        Recipients can view the knowledge graph and notes but cannot edit.
        Requires Google Drive Cloud Bridge.
    </p>

    {#if error}
        <div class="mb-4 p-3 bg-red-900/20 border border-red-800 text-red-300 text-xs rounded">
            {error}
        </div>
    {/if}

    {#if shareLink}
        <div class="mb-6 space-y-2">
            <label class="text-[10px] uppercase text-green-600 font-bold tracking-widest">Active Link</label>
            <div class="flex gap-2">
                <input 
                    readonly 
                    value={shareLink}
                    class="bg-black border border-green-900 text-green-400 text-xs p-2 rounded flex-1 focus:outline-none"
                    onclick={(e) => e.currentTarget.select()}
                />
                <button 
                    onclick={copyLink}
                    class="px-3 py-1 bg-green-900/30 border border-green-800 text-green-400 hover:bg-green-800 hover:text-white rounded text-xs"
                >
                    COPY
                </button>
            </div>
            <div class="flex items-center gap-2 mt-2">
                <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span class="text-[10px] text-green-500 uppercase tracking-widest">Publicly Accessible</span>
            </div>
        </div>
        
        <button
            onclick={handleRevoke}
            disabled={loading}
            class="w-full py-2 border border-red-900/50 text-red-500 hover:bg-red-900/20 hover:border-red-700 rounded text-xs font-bold tracking-widest uppercase transition"
        >
            {loading ? "PROCESSING..." : "REVOKE ACCESS"}
        </button>
    {:else}
        <div class="text-center py-4 border border-dashed border-gray-700 rounded mb-6">
            <span class="text-xs text-gray-500">Campaign is strictly private</span>
        </div>

        <button
            onclick={handleShare}
            disabled={loading}
            class="w-full py-2 bg-green-700 hover:bg-green-600 text-black rounded text-xs font-bold tracking-widest uppercase transition shadow-lg shadow-green-900/20"
        >
            {loading ? "GENERATING..." : "GENERATE PUBLIC LINK"}
        </button>
    {/if}

  </div>
</div>
