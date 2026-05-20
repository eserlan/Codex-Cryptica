<script lang="ts">
  import { p2pHost } from "$lib/cloud-bridge/p2p/host-service.svelte";
  import { p2pGuestService } from "$lib/cloud-bridge/p2p/guest-service";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

  // Determine current role and state
  const isHost = $derived(p2pHost.isHosting);
  const isGuest = $derived(sessionModeStore.isGuestMode);

  const activeState = $derived.by(() => {
    if (isHost) return p2pHost.state;
    if (isGuest) return p2pGuestService.state;
    return null;
  });

  const getStatusColor = () => {
    if (!activeState) return "text-theme-muted grayscale opacity-40";
    const status = activeState.status;
    if (status === "connected")
      return "text-cyan-400 animate-pulse drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]";
    if (status === "connecting" || status === "handshaking")
      return "text-blue-400 animate-bounce";
    if (status === "reconnecting")
      return "text-amber-400 animate-pulse drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]";
    if (status === "failed")
      return "text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]";
    return "text-theme-muted";
  };

  const getStatusLabel = () => {
    if (!activeState) return "P2P Offline";
    const status = activeState.status;
    const role = isHost ? "Host" : "Guest";
    const latency =
      activeState.latencyMs >= 0 ? ` (${activeState.latencyMs}ms)` : "";

    if (status === "connected") return `P2P Connected as ${role}${latency}`;
    if (status === "connecting") return `P2P Connecting as ${role}...`;
    if (status === "handshaking") return `P2P Negotiating Handshake...`;
    if (status === "reconnecting") return `P2P Reconnecting as ${role}...`;
    if (status === "failed") return `P2P Connection Failed`;
    return `P2P Status: ${status}`;
  };

  const getLatencyLabel = () => {
    if (!activeState || activeState.status !== "connected") return "";
    if (activeState.latencyMs < 0) return "Measuring...";
    return `${activeState.latencyMs}ms`;
  };
</script>

{#if isHost || isGuest}
  <div
    class="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-theme-border/50 bg-theme-surface/30 backdrop-blur-md transition-all duration-300 hover:border-theme-primary/40 hover:bg-theme-surface/50 group relative cursor-help"
    title={getStatusLabel()}
    aria-label="P2P Connection Status"
  >
    <span
      class="icon-[lucide--wifi] h-4 w-4 {getStatusColor()} transition-all duration-300"
    ></span>

    {#if activeState?.status === "connected" && activeState.latencyMs >= 0}
      <span
        class="text-[10px] font-mono font-medium text-theme-muted group-hover:text-theme-primary transition-colors"
      >
        {getLatencyLabel()}
      </span>
    {:else}
      <span
        class="text-[10px] font-sans font-medium text-theme-muted group-hover:text-theme-primary transition-colors uppercase tracking-wider"
      >
        {activeState?.status || "offline"}
      </span>
    {/if}

    <!-- Premium glassmorphism tooltip info on hover -->
    <div
      class="pointer-events-none absolute top-full right-0 mt-2 w-64 origin-top-right scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 z-50 p-3 rounded-lg border border-theme-border bg-theme-surface/90 backdrop-blur-lg shadow-xl text-left"
    >
      <div
        class="text-xs font-bold text-theme-text mb-1 border-b border-theme-border pb-1"
      >
        P2P Session Diagnostics ({isHost ? "Host" : "Guest"})
      </div>
      <div
        class="grid grid-cols-3 gap-y-1 text-[10px] font-mono text-theme-muted"
      >
        <div>Status:</div>
        <div class="col-span-2 text-theme-text font-semibold capitalize">
          {activeState?.status}
        </div>

        <div>Latency:</div>
        <div class="col-span-2 text-theme-text">
          {activeState?.latencyMs >= 0 ? `${activeState.latencyMs} ms` : "N/A"}
        </div>

        <div>My ID:</div>
        <div
          class="col-span-2 text-theme-text truncate"
          title={activeState?.peerId}
        >
          {activeState?.peerId || "None"}
        </div>

        {#if activeState?.remotePeerId}
          <div>Peer ID:</div>
          <div
            class="col-span-2 text-theme-text truncate"
            title={activeState?.remotePeerId}
          >
            {activeState?.remotePeerId}
          </div>
        {/if}

        {#if activeState?.retryCount > 0}
          <div>Retries:</div>
          <div class="col-span-2 text-amber-400 font-bold">
            {activeState?.retryCount}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
