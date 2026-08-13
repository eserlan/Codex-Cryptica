/**
 * WebAudio mixing graph for the voice-chat host.
 *
 * The host answers every guest media call with a dedicated mix stream that
 * carries the host microphone plus the audio of every OTHER guest (hearing
 * yourself back would echo). Because later sources connect into the existing
 * destination nodes, the stream handed to PeerJS keeps working as
 * participants come and go — no renegotiation needed.
 */
export type AudioContextFactory = () => AudioContext;

const defaultAudioContextFactory: AudioContextFactory = () => {
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  return new Ctor();
};

interface GuestNodes {
  dest: MediaStreamAudioDestinationNode;
  source: MediaStreamAudioSourceNode | null;
  keepAlive: HTMLAudioElement | null;
}

export class HostVoiceMixer {
  private ctx: AudioContext | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private guests = new Map<string, GuestNodes>();

  constructor(
    private readonly createContext: AudioContextFactory = defaultAudioContextFactory,
  ) {}

  get running(): boolean {
    return this.ctx !== null;
  }

  start(micStream: MediaStream): void {
    if (this.ctx) this.stop();
    this.ctx = this.createContext();
    // Contexts created outside a user gesture start suspended.
    void this.ctx.resume?.();
    this.micSource = this.ctx.createMediaStreamSource(micStream);
  }

  /**
   * Prepares the outbound mix for a guest; answer their media call with the
   * returned stream.
   */
  addGuest(peerId: string): MediaStream {
    if (!this.ctx || !this.micSource) {
      throw new Error("Voice mixer is not running");
    }
    this.removeGuest(peerId);

    const dest = this.ctx.createMediaStreamDestination();
    this.micSource.connect(dest);
    for (const [otherId, other] of this.guests) {
      if (otherId !== peerId && other.source) {
        other.source.connect(dest);
      }
    }
    this.guests.set(peerId, { dest, source: null, keepAlive: null });
    return dest.stream;
  }

  /**
   * Routes a guest's incoming audio to the host's speakers and into every
   * other guest's mix.
   */
  attachGuestStream(peerId: string, stream: MediaStream): void {
    const entry = this.guests.get(peerId);
    if (!this.ctx || !entry) return;

    // Chrome quirk: WebAudio only receives audio from a remote stream once it
    // is attached to a media element, so keep a muted element alive with it.
    if (typeof Audio !== "undefined") {
      const keepAlive = new Audio();
      keepAlive.muted = true;
      keepAlive.srcObject = stream;
      entry.keepAlive = keepAlive;
    }

    const source = this.ctx.createMediaStreamSource(stream);
    source.connect(this.ctx.destination);
    for (const [otherId, other] of this.guests) {
      if (otherId !== peerId) {
        source.connect(other.dest);
      }
    }
    entry.source = source;
  }

  removeGuest(peerId: string): void {
    const entry = this.guests.get(peerId);
    if (!entry) return;
    this.guests.delete(peerId);

    safely(() => entry.source?.disconnect());
    safely(() => this.micSource?.disconnect(entry.dest));
    for (const other of this.guests.values()) {
      safely(() => other.source?.disconnect(entry.dest));
    }
    if (entry.keepAlive) entry.keepAlive.srcObject = null;
  }

  stop(): void {
    for (const peerId of [...this.guests.keys()]) {
      this.removeGuest(peerId);
    }
    this.micSource = null;
    const ctx = this.ctx;
    this.ctx = null;
    if (ctx) {
      void Promise.resolve(ctx.close()).catch(() => undefined);
    }
  }
}

/** Disconnecting an already-disconnected WebAudio node throws; ignore it. */
function safely(fn: () => void) {
  try {
    fn();
  } catch {
    // node was already disconnected
  }
}
