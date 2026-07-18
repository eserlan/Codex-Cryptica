<script lang="ts">
  import { p2pHost } from "$lib/cloud-bridge/p2p/host-service.svelte";
  import { p2pGuestService } from "$lib/cloud-bridge/p2p/guest-service";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import { voiceChat } from "$lib/cloud-bridge/p2p/voice/voice-chat.svelte";
  import type {
    VoiceHostAccess,
    VoiceGuestAccess,
    VoicePeer,
  } from "$lib/cloud-bridge/p2p/voice/voice-chat.svelte";

  const isHost = $derived(p2pHost.isHosting);
  const isLiveGuest = $derived(
    sessionModeStore.isGuestMode &&
      p2pGuestService.state.status === "connected",
  );
  const vState = $derived(voiceChat.state);
  const active = $derived(vState.status === "active");
  const busy = $derived(
    vState.status === "requesting-mic" || vState.status === "connecting",
  );

  const hostAccess: VoiceHostAccess = {
    getPeer: () => p2pHost.rawPeer as VoicePeer | null,
    getPeerId: () => p2pHost.activePeerId,
    broadcast: (m) => p2pHost.broadcastVttMessage(m),
  };
  const guestAccess: VoiceGuestAccess = {
    getPeer: () => p2pGuestService.rawPeer as VoicePeer | null,
    getHostId: () => p2pGuestService.hostId,
    sendToHost: (m) => p2pGuestService.sendToHost(m),
  };

  let audioEl: HTMLAudioElement | null = $state(null);
  $effect(() => {
    if (audioEl) audioEl.srcObject = voiceChat.remoteStream;
  });

  // Ask the host for the voice roster once per live-session join, so the
  // Join Voice button knows whether a channel is open.
  let syncedSession = false;
  $effect(() => {
    if (isLiveGuest && !syncedSession) {
      syncedSession = true;
      voiceChat.requestSync(guestAccess);
    } else if (!isLiveGuest) {
      syncedSession = false;
    }
  });

  const toggleVoice = () => {
    if (isHost) {
      if (active) voiceChat.stopHostVoice();
      else void voiceChat.startHostVoice(hostAccess);
    } else {
      if (active || busy) voiceChat.leaveVoice();
      else void voiceChat.joinVoice(guestAccess);
    }
  };

  const joinDisabled = $derived(
    !isHost && !active && !busy && !vState.sessionActive,
  );

  const voiceTitle = $derived.by(() => {
    if (vState.status === "error") return vState.error ?? "Voice error";
    if (busy) return "Connecting voice…";
    if (active) return isHost ? "End voice for everyone" : "Leave voice";
    if (isHost) return "Start a voice channel for this session";
    return vState.sessionActive
      ? "Join the session voice channel"
      : "The Game Master hasn't started voice yet";
  });
</script>

{#if isHost || isLiveGuest}
  <div
    class="flex items-center gap-1 px-1.5 py-1 rounded-full border border-chrome-border/50 bg-chrome-surface/30 backdrop-blur-md transition-all duration-300 hover:border-chrome-accent/40 group relative"
    data-testid="voice-chat-controls"
  >
    <!-- Join / leave voice -->
    <button
      type="button"
      class="flex items-center gap-1.5 px-1.5 py-0.5 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed {active
        ? 'text-emerald-400'
        : vState.status === 'error'
          ? 'text-rose-400'
          : 'text-chrome-muted hover:text-chrome-text'}"
      onclick={toggleVoice}
      disabled={joinDisabled || busy}
      title={voiceTitle}
      aria-label={active ? "Leave voice chat" : "Join voice chat"}
      aria-pressed={active}
      data-testid="voice-toggle"
    >
      <span
        class="h-4 w-4 {busy
          ? 'icon-[lucide--loader-circle] animate-spin'
          : 'icon-[lucide--headphones]'}"
      ></span>
      <span
        class="text-[10px] font-sans font-medium uppercase tracking-wider hidden sm:inline"
      >
        {#if active}Voice{:else if busy}…{:else}Voice{/if}
      </span>
      {#if active && vState.participants.length > 0}
        <span class="text-[10px] font-mono" data-testid="voice-count"
          >{vState.participants.length}</span
        >
      {/if}
    </button>

    <!-- Mute toggle -->
    {#if active}
      <button
        type="button"
        class="flex h-6 w-6 items-center justify-center rounded-full transition-colors {vState.muted
          ? 'text-rose-400 bg-rose-500/10'
          : 'text-chrome-muted hover:text-chrome-text'}"
        onclick={() => voiceChat.toggleMute()}
        title={vState.muted ? "Unmute microphone" : "Mute microphone"}
        aria-label={vState.muted ? "Unmute microphone" : "Mute microphone"}
        aria-pressed={vState.muted}
        data-testid="voice-mute"
      >
        <span
          class="h-3.5 w-3.5 {vState.muted
            ? 'icon-[lucide--mic-off]'
            : 'icon-[lucide--mic]'}"
        ></span>
      </button>
    {/if}

    <!-- Participant tooltip -->
    {#if active && vState.participants.length > 0}
      <div
        class="pointer-events-none absolute top-full right-0 mt-2 w-52 origin-top-right scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 z-50 p-3 rounded-lg border border-chrome-border bg-chrome-surface/90 backdrop-blur-lg shadow-xl text-left"
      >
        <div
          class="text-xs font-bold text-chrome-text mb-1.5 border-b border-chrome-border pb-1"
        >
          Voice Channel
        </div>
        <ul class="space-y-1">
          {#each vState.participants as participant (participant.peerId)}
            <li
              class="flex items-center justify-between gap-2 text-[11px] text-chrome-muted"
            >
              <span class="truncate text-chrome-text"
                >{participant.displayName}{participant.isHost
                  ? " (GM)"
                  : ""}</span
              >
              <span
                class="h-3 w-3 shrink-0 {participant.muted
                  ? 'icon-[lucide--mic-off] text-rose-400'
                  : 'icon-[lucide--mic] text-emerald-400'}"
              ></span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>

  <!-- Host audio plays through the WebAudio mixer; guests play the host mix here. -->
  {#if !isHost}
    <audio bind:this={audioEl} autoplay class="hidden"></audio>
  {/if}
{/if}
