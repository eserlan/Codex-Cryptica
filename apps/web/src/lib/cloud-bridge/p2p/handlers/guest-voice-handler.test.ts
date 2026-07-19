import { describe, it, expect, vi } from "vitest";

import { GuestVoiceHandler } from "./guest-voice-handler";
import type { VoiceChatService } from "../voice/voice-chat.svelte";

describe("GuestVoiceHandler", () => {
  const voice = { applyRoster: vi.fn() };
  const handler = new GuestVoiceHandler(voice as unknown as VoiceChatService);
  const conn = { peer: "host", send: vi.fn(), close: vi.fn() };

  it("claims only roster broadcasts", () => {
    expect(handler.canHandle({ type: "VOICE_ROSTER" } as never)).toBe(true);
    expect(handler.canHandle({ type: "VOICE_STATE" } as never)).toBe(false);
    expect(handler.canHandle({ type: "MAP_SYNC" } as never)).toBe(false);
  });

  it("forwards the roster payload to the voice service", async () => {
    const payload = {
      active: true,
      participants: [
        { peerId: "host", displayName: "GM", muted: false, isHost: true },
      ],
    };
    await handler.handle(
      { type: "VOICE_ROSTER", payload } as never,
      conn as never,
      {} as never,
    );
    expect(voice.applyRoster).toHaveBeenCalledWith(payload);
  });
});
