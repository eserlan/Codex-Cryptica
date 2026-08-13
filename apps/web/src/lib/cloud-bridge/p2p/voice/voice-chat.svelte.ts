import { guestStore } from "../../../stores/guest.svelte";
import { debugStore } from "../../../stores/debug.svelte";
import { HostVoiceMixer } from "./voice-mixer";
import type {
  VoiceMessage,
  VoiceParticipant,
  VoiceRosterPayload,
} from "./voice-types";

/** Minimal surface of a PeerJS MediaConnection. */
export interface VoiceMediaConnection {
  peer: string;
  answer(stream?: MediaStream): void;
  close(): void;
  on(event: string, cb: (...args: unknown[]) => void): void;
}

/** Minimal surface of a PeerJS Peer used for media calls. */
export interface VoicePeer {
  call(
    peerId: string,
    stream: MediaStream,
  ): VoiceMediaConnection | undefined | null;
  on(event: "call", cb: (call: VoiceMediaConnection) => void): void;
  off?(event: "call", cb: (call: VoiceMediaConnection) => void): void;
  removeListener?(
    event: "call",
    cb: (call: VoiceMediaConnection) => void,
  ): void;
}

/** How the voice service reaches the hosting side of the P2P session. */
export interface VoiceHostAccess {
  getPeer(): VoicePeer | null;
  getPeerId(): string | null;
  broadcast(message: VoiceMessage): void;
}

/** How the voice service reaches the guest side of the P2P session. */
export interface VoiceGuestAccess {
  getPeer(): VoicePeer | null;
  getHostId(): string | null;
  sendToHost(message: VoiceMessage): boolean;
}

export interface VoiceChatState {
  status: "off" | "requesting-mic" | "connecting" | "active" | "error";
  role: "host" | "guest" | null;
  muted: boolean;
  error: string | null;
  /** Whether the host currently has a voice channel open (guests learn this from the roster). */
  sessionActive: boolean;
  participants: VoiceParticipant[];
}

export interface VoiceChatDeps {
  getMicStream?: () => Promise<MediaStream>;
  createMixer?: () => HostVoiceMixer;
  joinTimeoutMs?: number;
}

const defaultGetMicStream = async (): Promise<MediaStream> => {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    throw new Error("Microphone access is not available in this browser");
  }
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
};

const HOST_DISPLAY_NAME = "Game Master";

export class VoiceChatService {
  state = $state<VoiceChatState>({
    status: "off",
    role: null,
    muted: false,
    error: null,
    sessionActive: false,
    participants: [],
  });

  /** Mixed audio from the host, for the guest's <audio> element. */
  remoteStream = $state<MediaStream | null>(null);

  private readonly getMicStream: () => Promise<MediaStream>;
  private readonly createMixer: () => HostVoiceMixer;
  private readonly joinTimeoutMs: number;

  private micStream: MediaStream | null = null;
  private mixer: HostVoiceMixer | null = null;

  // Host bookkeeping
  private hostAccess: VoiceHostAccess | null = null;
  private incomingCallListener: ((call: VoiceMediaConnection) => void) | null =
    null;
  private hostCalls = new Map<string, VoiceMediaConnection>();

  // Guest bookkeeping
  private guestAccess: VoiceGuestAccess | null = null;
  private guestCall: VoiceMediaConnection | null = null;
  private joinTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(deps: VoiceChatDeps = {}) {
    this.getMicStream = deps.getMicStream ?? defaultGetMicStream;
    this.createMixer = deps.createMixer ?? (() => new HostVoiceMixer());
    this.joinTimeoutMs = deps.joinTimeoutMs ?? 15000;
  }

  // ── Host side ────────────────────────────────────────────────────────────

  async startHostVoice(access: VoiceHostAccess): Promise<void> {
    if (this.state.status !== "off" && this.state.status !== "error") return;
    const peer = access.getPeer();
    if (!peer) {
      this.fail("Voice needs an active session to run over");
      return;
    }

    this.state.role = "host";
    this.state.status = "requesting-mic";
    this.state.error = null;

    let mic: MediaStream;
    try {
      mic = await this.getMicStream();
    } catch (err) {
      this.fail(micErrorMessage(err));
      this.state.role = null;
      return;
    }

    // The user cancelled (or the session tore down) while the permission
    // prompt was open — don't open the channel after the fact.
    if (this.state.status !== "requesting-mic" || this.state.role !== "host") {
      stopTracks(mic);
      return;
    }

    this.hostAccess = access;
    this.micStream = mic;
    this.mixer = this.createMixer();
    this.mixer.start(mic);

    this.incomingCallListener = (call) => this.handleIncomingCall(call);
    peer.on("call", this.incomingCallListener);

    this.state.status = "active";
    this.state.sessionActive = true;
    this.state.muted = false;
    this.state.participants = [this.hostParticipant()];
    this.broadcastRoster();
    debugStore.log("[Voice] Host voice channel opened");
  }

  stopHostVoice(): void {
    if (this.state.role !== "host") return;

    const peer = this.hostAccess?.getPeer();
    if (peer && this.incomingCallListener) {
      const off = peer.off ?? peer.removeListener;
      off?.call(peer, "call", this.incomingCallListener);
    }
    this.incomingCallListener = null;

    for (const call of this.hostCalls.values()) {
      safely(() => call.close());
    }
    this.hostCalls.clear();

    this.mixer?.stop();
    this.mixer = null;
    this.stopMic();

    this.state.status = "off";
    this.state.sessionActive = false;
    this.state.muted = false;
    this.state.participants = [];

    safely(() =>
      this.hostAccess?.broadcast({
        type: "VOICE_ROSTER",
        payload: { active: false, participants: [] },
      }),
    );
    this.hostAccess = null;
    this.state.role = null;
    debugStore.log("[Voice] Host voice channel closed");
  }

  private handleIncomingCall(call: VoiceMediaConnection) {
    if (!this.mixer || this.state.status !== "active") {
      safely(() => call.close());
      return;
    }
    const peerId = call.peer;

    // A rejoining guest replaces their previous call.
    const previous = this.hostCalls.get(peerId);
    if (previous) {
      safely(() => previous.close());
      this.mixer.removeGuest(peerId);
      this.removeParticipant(peerId);
    }

    this.hostCalls.set(peerId, call);
    const mixForGuest = this.mixer.addGuest(peerId);
    call.answer(mixForGuest);

    call.on("stream", (remote) => {
      // Ignore late events from a call that was replaced or dropped.
      if (this.hostCalls.get(peerId) !== call) return;
      this.mixer?.attachGuestStream(peerId, remote as MediaStream);
    });
    const cleanup = () => this.dropGuest(peerId, call);
    call.on("close", cleanup);
    call.on("error", cleanup);

    this.state.participants = [
      ...this.state.participants.filter((p) => p.peerId !== peerId),
      {
        peerId,
        displayName: this.guestDisplayName(peerId),
        muted: false,
        isHost: false,
      },
    ];
    this.broadcastRoster();
    debugStore.log("[Voice] Guest joined voice:", peerId);
  }

  private dropGuest(peerId: string, call: VoiceMediaConnection) {
    if (this.hostCalls.get(peerId) !== call) return;
    this.hostCalls.delete(peerId);
    this.mixer?.removeGuest(peerId);
    this.removeParticipant(peerId);
    this.broadcastRoster();
    debugStore.log("[Voice] Guest left voice:", peerId);
  }

  /** Applies a guest's self-reported mute state (from VOICE_STATE). */
  setGuestMuted(peerId: string, muted: boolean): void {
    if (this.state.role !== "host") return;
    const participant = this.state.participants.find(
      (p) => p.peerId === peerId,
    );
    if (!participant || participant.muted === muted) return;
    participant.muted = muted;
    this.broadcastRoster();
  }

  buildRosterMessage(): VoiceMessage {
    const active = this.state.role === "host" && this.state.status === "active";
    const payload: VoiceRosterPayload = {
      active,
      participants: active ? this.state.participants : [],
    };
    return { type: "VOICE_ROSTER", payload };
  }

  private broadcastRoster() {
    safely(() => this.hostAccess?.broadcast(this.buildRosterMessage()));
  }

  private hostParticipant(): VoiceParticipant {
    return {
      peerId: this.hostAccess?.getPeerId() ?? "host",
      displayName: HOST_DISPLAY_NAME,
      muted: this.state.muted,
      isHost: true,
    };
  }

  private guestDisplayName(peerId: string): string {
    return guestStore.guestRoster[peerId]?.displayName ?? "Player";
  }

  private removeParticipant(peerId: string) {
    this.state.participants = this.state.participants.filter(
      (p) => p.peerId !== peerId,
    );
  }

  // ── Guest side ───────────────────────────────────────────────────────────

  /** Asks the host for the current voice roster (e.g. right after joining). */
  requestSync(access: VoiceGuestAccess): void {
    this.guestAccess = access;
    access.sendToHost({ type: "VOICE_SYNC_REQUEST" });
  }

  /** Applies a VOICE_ROSTER broadcast from the host. */
  applyRoster(payload: VoiceRosterPayload): void {
    if (this.state.role === "host") return;
    this.state.sessionActive = payload.active;
    this.state.participants = payload.participants;
    if (
      !payload.active &&
      this.state.role === "guest" &&
      this.state.status !== "off"
    ) {
      // Host ended the channel while we were in it.
      this.leaveVoice();
    }
  }

  async joinVoice(access: VoiceGuestAccess): Promise<void> {
    if (this.state.status !== "off" && this.state.status !== "error") return;
    const peer = access.getPeer();
    const hostId = access.getHostId();
    if (!peer || !hostId) {
      this.fail("Join a live session before joining voice");
      return;
    }

    this.guestAccess = access;
    this.state.role = "guest";
    this.state.status = "requesting-mic";
    this.state.error = null;

    let mic: MediaStream;
    try {
      mic = await this.getMicStream();
    } catch (err) {
      this.fail(micErrorMessage(err));
      this.state.role = null;
      return;
    }

    // The user cancelled (or the session tore down) while the permission
    // prompt was open — don't place a call after the fact.
    if (this.state.status !== "requesting-mic" || this.state.role !== "guest") {
      stopTracks(mic);
      return;
    }

    this.micStream = mic;
    this.state.status = "connecting";

    const call = peer.call(hostId, mic);
    if (!call) {
      this.cleanupGuest();
      this.fail("Could not reach the host for voice");
      return;
    }
    this.guestCall = call;

    this.joinTimeout = setTimeout(() => {
      if (this.state.status === "connecting") {
        this.cleanupGuest();
        this.fail("The host did not answer the voice call");
      }
    }, this.joinTimeoutMs);

    call.on("stream", (remote) => {
      // Ignore late events from a call we already abandoned.
      if (this.guestCall !== call) return;
      this.clearJoinTimeout();
      this.remoteStream = remote as MediaStream;
      this.state.status = "active";
      this.state.muted = false;
      debugStore.log("[Voice] Connected to host voice channel");
    });
    call.on("close", () => {
      if (this.guestCall === call) this.leaveVoice();
    });
    call.on("error", () => {
      if (this.guestCall === call) {
        this.cleanupGuest();
        this.fail("Voice connection to the host failed");
      }
    });
  }

  leaveVoice(): void {
    if (this.state.role !== "guest") return;
    this.cleanupGuest();
    this.state.status = "off";
    this.state.role = null;
    this.state.muted = false;
    this.state.error = null;
  }

  private cleanupGuest() {
    this.clearJoinTimeout();
    const call = this.guestCall;
    this.guestCall = null;
    if (call) safely(() => call.close());
    this.stopMic();
    this.remoteStream = null;
  }

  private clearJoinTimeout() {
    if (this.joinTimeout) {
      clearTimeout(this.joinTimeout);
      this.joinTimeout = null;
    }
  }

  // ── Shared ───────────────────────────────────────────────────────────────

  toggleMute(): void {
    if (this.state.status !== "active") return;
    const muted = !this.state.muted;
    this.state.muted = muted;
    for (const track of this.micStream?.getAudioTracks() ?? []) {
      track.enabled = !muted;
    }
    if (this.state.role === "host") {
      const self = this.state.participants.find((p) => p.isHost);
      if (self) self.muted = muted;
      this.broadcastRoster();
    } else {
      this.guestAccess?.sendToHost({ type: "VOICE_STATE", payload: { muted } });
    }
  }

  /** Tears down whatever is active. Safe to call when idle. */
  reset(): void {
    if (this.state.role === "host") {
      this.stopHostVoice();
    } else if (this.state.role === "guest") {
      this.leaveVoice();
    }
    this.state.sessionActive = false;
    this.state.participants = [];
    this.state.error = null;
    if (this.state.status === "error") this.state.status = "off";
    this.guestAccess = null;
  }

  private stopMic() {
    if (this.micStream) stopTracks(this.micStream);
    this.micStream = null;
  }

  private fail(message: string) {
    this.state.status = "error";
    this.state.error = message;
    console.warn("[Voice]", message);
  }
}

function micErrorMessage(err: unknown): string {
  const name = (err as { name?: string } | null)?.name;
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Microphone permission was denied — allow it in your browser to use voice";
  }
  if (name === "NotFoundError") {
    return "No microphone was found on this device";
  }
  return (err as Error | null)?.message ?? "Could not access the microphone";
}

function stopTracks(stream: MediaStream) {
  for (const track of stream.getTracks()) {
    safely(() => track.stop());
  }
}

function safely(fn: () => void) {
  try {
    fn();
  } catch {
    // best-effort teardown — the peer/track may already be gone
  }
}

export const voiceChat = new VoiceChatService();
