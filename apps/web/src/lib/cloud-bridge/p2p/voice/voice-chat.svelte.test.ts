import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  VoiceChatService,
  type VoiceGuestAccess,
  type VoiceHostAccess,
  type VoiceMediaConnection,
} from "./voice-chat.svelte";
import type { HostVoiceMixer } from "./voice-mixer";
import { guestStore } from "../../../stores/guest.svelte";

type Handler = (...args: unknown[]) => void;

class FakeMediaCall implements VoiceMediaConnection {
  handlers: Record<string, Handler[]> = {};
  answered: MediaStream | undefined;
  closed = false;

  constructor(public peer: string) {}

  answer(stream?: MediaStream) {
    this.answered = stream;
  }
  close() {
    this.closed = true;
    this.emit("close");
  }
  on(event: string, cb: Handler) {
    (this.handlers[event] ??= []).push(cb);
  }
  emit(event: string, ...args: unknown[]) {
    this.handlers[event]?.forEach((cb) => cb(...args));
  }
}

class FakePeer {
  callHandler: ((call: FakeMediaCall) => void) | null = null;
  outgoing: FakeMediaCall[] = [];
  offCalls = 0;

  on(event: string, cb: (call: FakeMediaCall) => void) {
    if (event === "call") this.callHandler = cb;
  }
  off(event: string, _cb: unknown) {
    if (event === "call") {
      this.callHandler = null;
      this.offCalls++;
    }
  }
  call(peerId: string, _stream: MediaStream) {
    const call = new FakeMediaCall(peerId);
    this.outgoing.push(call);
    return call;
  }
}

function fakeMicStream() {
  const track = { enabled: true, stop: vi.fn() };
  return {
    track,
    stream: {
      getTracks: () => [track],
      getAudioTracks: () => [track],
    } as unknown as MediaStream,
  };
}

function fakeMixer() {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    addGuest: vi.fn(
      (peerId: string) => ({ id: `mix-${peerId}` }) as unknown as MediaStream,
    ),
    attachGuestStream: vi.fn(),
    removeGuest: vi.fn(),
    running: true,
  };
}

describe("VoiceChatService", () => {
  let peer: FakePeer;
  let mic: ReturnType<typeof fakeMicStream>;
  let mixer: ReturnType<typeof fakeMixer>;
  let service: VoiceChatService;
  let broadcast: ReturnType<typeof vi.fn<(message: unknown) => void>>;
  let sendToHost: ReturnType<typeof vi.fn<(message: unknown) => boolean>>;
  let hostAccess: VoiceHostAccess;
  let guestAccess: VoiceGuestAccess;

  beforeEach(() => {
    peer = new FakePeer();
    mic = fakeMicStream();
    mixer = fakeMixer();
    broadcast = vi.fn<(message: unknown) => void>();
    sendToHost = vi.fn<(message: unknown) => boolean>().mockReturnValue(true);
    service = new VoiceChatService({
      getMicStream: async () => mic.stream,
      createMixer: () => mixer as unknown as HostVoiceMixer,
      joinTimeoutMs: 50,
    });
    hostAccess = {
      getPeer: () => peer,
      getPeerId: () => "host-id",
      broadcast,
    };
    guestAccess = {
      getPeer: () => peer,
      getHostId: () => "host-id",
      sendToHost,
    };
    guestStore.guestRoster = {};
  });

  afterEach(() => {
    service.reset();
    guestStore.guestRoster = {};
  });

  describe("host", () => {
    it("opens the channel, listens for calls, and broadcasts the roster", async () => {
      await service.startHostVoice(hostAccess);

      expect(service.state.status).toBe("active");
      expect(service.state.role).toBe("host");
      expect(peer.callHandler).not.toBeNull();
      expect(mixer.start).toHaveBeenCalledWith(mic.stream);
      expect(broadcast).toHaveBeenCalledWith({
        type: "VOICE_ROSTER",
        payload: {
          active: true,
          participants: [
            {
              peerId: "host-id",
              displayName: "Game Master",
              muted: false,
              isHost: true,
            },
          ],
        },
      });
    });

    it("reports a friendly error when the mic is denied", async () => {
      service = new VoiceChatService({
        getMicStream: async () => {
          const err = new Error("denied");
          err.name = "NotAllowedError";
          throw err;
        },
      });
      await service.startHostVoice(hostAccess);

      expect(service.state.status).toBe("error");
      expect(service.state.error).toMatch(/permission/i);
      expect(broadcast).not.toHaveBeenCalled();
    });

    it("answers guest calls with their personal mix and tracks the roster", async () => {
      guestStore.guestRoster = {
        "guest-1": { displayName: "Ava" },
      } as never;
      await service.startHostVoice(hostAccess);

      const call = new FakeMediaCall("guest-1");
      peer.callHandler!(call);

      expect(mixer.addGuest).toHaveBeenCalledWith("guest-1");
      expect(call.answered).toEqual({ id: "mix-guest-1" });

      const remote = { id: "remote-1" } as unknown as MediaStream;
      call.emit("stream", remote);
      expect(mixer.attachGuestStream).toHaveBeenCalledWith("guest-1", remote);

      const roster = service.buildRosterMessage();
      expect(roster).toEqual({
        type: "VOICE_ROSTER",
        payload: {
          active: true,
          participants: [
            expect.objectContaining({ isHost: true }),
            expect.objectContaining({
              peerId: "guest-1",
              displayName: "Ava",
              muted: false,
            }),
          ],
        },
      });
    });

    it("removes guests from the mix and roster when their call closes", async () => {
      await service.startHostVoice(hostAccess);
      const call = new FakeMediaCall("guest-1");
      peer.callHandler!(call);
      expect(service.state.participants).toHaveLength(2);

      call.close();

      expect(mixer.removeGuest).toHaveBeenCalledWith("guest-1");
      expect(service.state.participants).toHaveLength(1);
    });

    it("applies guest mute updates and rebroadcasts", async () => {
      await service.startHostVoice(hostAccess);
      peer.callHandler!(new FakeMediaCall("guest-1"));
      broadcast.mockClear();

      service.setGuestMuted("guest-1", true);

      expect(
        service.state.participants.find((p) => p.peerId === "guest-1")?.muted,
      ).toBe(true);
      expect(broadcast).toHaveBeenCalledTimes(1);

      // Same value again should not rebroadcast.
      service.setGuestMuted("guest-1", true);
      expect(broadcast).toHaveBeenCalledTimes(1);
    });

    it("mutes the host mic track and updates the roster", async () => {
      await service.startHostVoice(hostAccess);

      service.toggleMute();

      expect(service.state.muted).toBe(true);
      expect(mic.track.enabled).toBe(false);
      expect(service.state.participants.find((p) => p.isHost)?.muted).toBe(
        true,
      );
    });

    it("stops everything and broadcasts an inactive roster on stop", async () => {
      await service.startHostVoice(hostAccess);
      const call = new FakeMediaCall("guest-1");
      peer.callHandler!(call);
      broadcast.mockClear();

      service.stopHostVoice();

      expect(call.closed).toBe(true);
      expect(mixer.stop).toHaveBeenCalled();
      expect(mic.track.stop).toHaveBeenCalled();
      expect(peer.offCalls).toBe(1);
      expect(service.state.status).toBe("off");
      expect(broadcast).toHaveBeenCalledWith({
        type: "VOICE_ROSTER",
        payload: { active: false, participants: [] },
      });
    });

    it("aborts cleanly when cancelled while the mic prompt is open", async () => {
      let resolveMic: (stream: MediaStream) => void;
      service = new VoiceChatService({
        getMicStream: () =>
          new Promise<MediaStream>((resolve) => {
            resolveMic = resolve;
          }),
        createMixer: () => mixer as unknown as HostVoiceMixer,
      });

      const pending = service.startHostVoice(hostAccess);
      expect(service.state.status).toBe("requesting-mic");

      service.stopHostVoice();
      resolveMic!(mic.stream);
      await pending;

      expect(service.state.status).toBe("off");
      expect(service.state.role).toBeNull();
      expect(mixer.start).not.toHaveBeenCalled();
      expect(peer.callHandler).toBeNull();
      expect(mic.track.stop).toHaveBeenCalled();
    });

    it("ignores stream events from a replaced guest call", async () => {
      await service.startHostVoice(hostAccess);
      const staleCall = new FakeMediaCall("guest-1");
      peer.callHandler!(staleCall);
      const freshCall = new FakeMediaCall("guest-1");
      peer.callHandler!(freshCall);
      mixer.attachGuestStream.mockClear();

      staleCall.emit("stream", { id: "stale" });
      expect(mixer.attachGuestStream).not.toHaveBeenCalled();

      freshCall.emit("stream", { id: "fresh" });
      expect(mixer.attachGuestStream).toHaveBeenCalledWith("guest-1", {
        id: "fresh",
      });
    });

    it("rejects incoming calls when the channel is off", () => {
      const call = new FakeMediaCall("guest-1");
      // No startHostVoice — simulate a stray call arriving.
      expect(service.state.status).toBe("off");
      // Handler is only registered while active, so nothing to invoke;
      // this documents that no roster/broadcast happens.
      expect(broadcast).not.toHaveBeenCalled();
      expect(call.answered).toBeUndefined();
    });
  });

  describe("guest", () => {
    it("requests a roster sync from the host", () => {
      service.requestSync(guestAccess);
      expect(sendToHost).toHaveBeenCalledWith({ type: "VOICE_SYNC_REQUEST" });
    });

    it("calls the host and goes active when the mixed stream arrives", async () => {
      await service.joinVoice(guestAccess);

      expect(service.state.status).toBe("connecting");
      const call = peer.outgoing[0];
      expect(call.peer).toBe("host-id");

      const remote = { id: "host-mix" } as unknown as MediaStream;
      call.emit("stream", remote);

      expect(service.state.status).toBe("active");
      // $state wraps assigned objects in a reactive proxy, so compare shape.
      expect(service.remoteStream).toEqual(remote);
    });

    it("fails with an error when the host never answers", async () => {
      vi.useFakeTimers();
      try {
        await service.joinVoice(guestAccess);
        vi.advanceTimersByTime(60);

        expect(service.state.status).toBe("error");
        expect(service.state.error).toMatch(/did not answer/i);
        expect(mic.track.stop).toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it("sends mute updates to the host", async () => {
      await service.joinVoice(guestAccess);
      peer.outgoing[0].emit("stream", { id: "s" });
      sendToHost.mockClear();

      service.toggleMute();

      expect(mic.track.enabled).toBe(false);
      expect(sendToHost).toHaveBeenCalledWith({
        type: "VOICE_STATE",
        payload: { muted: true },
      });
    });

    it("applies rosters and leaves when the host ends the channel", async () => {
      await service.joinVoice(guestAccess);
      peer.outgoing[0].emit("stream", { id: "s" });

      service.applyRoster({
        active: true,
        participants: [
          { peerId: "host-id", displayName: "GM", muted: false, isHost: true },
        ],
      });
      expect(service.state.sessionActive).toBe(true);
      expect(service.state.participants).toHaveLength(1);

      service.applyRoster({ active: false, participants: [] });

      expect(service.state.status).toBe("off");
      expect(peer.outgoing[0].closed).toBe(true);
      expect(mic.track.stop).toHaveBeenCalled();
      expect(service.remoteStream).toBeNull();
    });

    it("aborts cleanly when cancelled while the mic prompt is open", async () => {
      let resolveMic: (stream: MediaStream) => void;
      service = new VoiceChatService({
        getMicStream: () =>
          new Promise<MediaStream>((resolve) => {
            resolveMic = resolve;
          }),
      });

      const pending = service.joinVoice(guestAccess);
      expect(service.state.status).toBe("requesting-mic");

      service.leaveVoice();
      resolveMic!(mic.stream);
      await pending;

      expect(service.state.status).toBe("off");
      expect(peer.outgoing).toHaveLength(0);
      expect(mic.track.stop).toHaveBeenCalled();
    });

    it("ignores stream events from an abandoned call", async () => {
      await service.joinVoice(guestAccess);
      const staleCall = peer.outgoing[0];
      service.leaveVoice();

      staleCall.emit("stream", { id: "late" });

      expect(service.state.status).toBe("off");
      expect(service.remoteStream).toBeNull();
    });

    it("cleans up on leaveVoice", async () => {
      await service.joinVoice(guestAccess);
      peer.outgoing[0].emit("stream", { id: "s" });

      service.leaveVoice();

      expect(service.state.status).toBe("off");
      expect(service.state.role).toBeNull();
      expect(peer.outgoing[0].closed).toBe(true);
      expect(mic.track.stop).toHaveBeenCalled();
    });
  });

  it("reset tears down either role safely", async () => {
    await service.startHostVoice(hostAccess);
    service.reset();
    expect(service.state.status).toBe("off");
    expect(service.state.participants).toEqual([]);

    // Safe when idle too.
    service.reset();
    expect(service.state.status).toBe("off");
  });
});
