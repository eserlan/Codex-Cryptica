<script lang="ts">
  import { p2pHost } from "$lib/cloud-bridge/p2p/host-service.svelte";
  import {
    copyTextToClipboard,
    startShareSession,
  } from "$lib/utils/share-link";
  import { focusTrap } from "$lib/actions/focusTrap";

  let { close }: { close: () => void } = $props();

  let error = $state<string | null>(null);

  // P2P State
  let p2pLoading = $state(false);
  let p2pLink = $state<string | null>(null);
  let p2pCopied = $state(false);

  const handleP2PStart = async () => {
    p2pLoading = true;
    try {
      await startShareSession({
        origin: window.location.origin,
        pathname: window.location.pathname,
        clipboard: navigator.clipboard,
        startHosting: p2pHost.startHosting.bind(p2pHost),
        onLink: (shareLink) => {
          p2pLink = shareLink;
        },
        onCopied: (copied) => {
          p2pCopied = copied;
          if (copied) {
            setTimeout(() => (p2pCopied = false), 2000);
          }
        },
      });
    } catch (err) {
      console.error(err);
      error = "Failed to start P2P session";
    } finally {
      p2pLoading = false;
    }
  };
</script>

<div
  class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
>
  <div
    use:focusTrap={{ onEscape: close }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="share-modal-title"
    tabindex="-1"
    class="bg-gray-900 border border-green-800 p-6 rounded-lg max-w-md w-full shadow-2xl relative font-mono text-gray-300 focus:outline-none"
  >
    <button
      class="absolute top-2 right-2 text-gray-500 hover:text-white"
      onclick={close}
      aria-label="Close"
    >
      <span class="icon-[heroicons--x-mark] w-5 h-5"></span>
    </button>

    <h2
      id="share-modal-title"
      class="text-xl font-bold text-green-500 mb-4 tracking-wider uppercase font-header flex items-center gap-2"
    >
      <span class="icon-[lucide--share-2] w-5 h-5"></span>
      Share Campaign
    </h2>

    <p class="text-xs mb-6 text-gray-400">
      Generate a live link to share your campaign via P2P. Recipients can view
      the knowledge graph and notes in real-time while you keep this tab open.
    </p>

    {#if error}
      <div
        class="mb-4 p-3 bg-red-900/20 border border-red-800 text-red-300 text-xs rounded"
      >
        {error}
      </div>
    {/if}

    <!-- P2P Section -->
    <div class="mt-2">
      <!-- Changed h4 to simpler label or removed entirely since it's the only option now -->

      {#if p2pLink}
        <div class="space-y-4">
          <div class="space-y-2">
            <label
              class="text-[10px] uppercase text-cyan-600 font-bold font-header tracking-widest"
              for="p2p-link-input">Active Live Session</label
            >
            <div class="flex gap-2">
              <input
                id="p2p-link-input"
                readonly
                value={p2pLink}
                class="bg-black border border-cyan-900 text-cyan-400 text-xs p-2 rounded flex-1 focus:outline-none shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                onclick={(e) => e.currentTarget.select()}
              />
              <button
                onclick={async () => {
                  const copied = await copyTextToClipboard(
                    p2pLink!,
                    navigator.clipboard,
                  );
                  p2pCopied = copied;
                  if (copied) {
                    setTimeout(() => (p2pCopied = false), 2000);
                  }
                }}
                class="px-4 py-1 border rounded text-xs transition-colors {p2pCopied
                  ? 'bg-cyan-500 border-cyan-400 text-black font-bold'
                  : 'bg-cyan-900/30 border-cyan-800 text-cyan-400 hover:bg-cyan-800 hover:text-white'}"
                aria-label="Copy P2P link"
              >
                {p2pCopied ? "COPIED!" : "COPY"}
              </button>
            </div>
          </div>

          <div
            class="flex items-center gap-2 p-2 bg-cyan-900/10 rounded border border-cyan-900/30"
          >
            <span class="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
            <span class="text-[10px] text-cyan-500 uppercase tracking-widest"
              >Broadcasting Active</span
            >
            <span class="ml-auto text-[10px] text-gray-500">Keep tab open</span>
          </div>
        </div>
      {:else}
        <div
          class="text-center py-6 border border-dashed border-gray-800 rounded mb-6 bg-black/40"
        >
          <span class="text-xs text-gray-500">No active session</span>
        </div>

        <button
          class="w-full py-3 bg-cyan-700 hover:bg-cyan-600 text-black rounded text-sm font-bold tracking-widest uppercase font-header transition shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-2"
          onclick={handleP2PStart}
          disabled={p2pLoading}
          aria-busy={p2pLoading}
        >
          {#if p2pLoading}
            <span
              class="icon-[lucide--loader-2] w-4 h-4 animate-spin"
              aria-hidden="true"
            ></span>
            STARTING...
          {:else}
            <span class="icon-[lucide--zap] w-4 h-4"></span>
            START LIVE SESSION
          {/if}
        </button>
        <p class="text-[10px] text-gray-600 mt-3 text-center">
          Uses P2P WebRTC. Bypass Google API limits.
        </p>
      {/if}
    </div>
  </div>
</div>
