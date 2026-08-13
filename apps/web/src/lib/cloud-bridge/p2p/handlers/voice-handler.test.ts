import { describe, it, expect, vi, beforeEach } from "vitest";

import { VoiceHandler } from "./voice-handler";
import type { VoiceChatService } from "../voice/voice-chat.svelte";

describe("VoiceHandler", () => {
  let voice: {
    setGuestMuted: ReturnType<typeof vi.fn>;
    buildRosterMessage: ReturnType<typeof vi.fn>;
  };
  let handler: VoiceHandler;
  const conn = { peer: "guest-1", send: vi.fn(), close: vi.fn() };

  beforeEach(() => {
    voice = {
      setGuestMuted: vi.fn(),
      buildRosterMessage: vi.fn().mockReturnValue({
        type: "VOICE_ROSTER",
        payload: { active: true, participants: [] },
      }),
    };
    handler = new VoiceHandler(voice as unknown as VoiceChatService);
    conn.send.mockClear();
  });

  it("claims only voice coordination messages", () => {
    expect(handler.canHandle({ type: "VOICE_STATE" } as never)).toBe(true);
    expect(handler.canHandle({ type: "VOICE_SYNC_REQUEST" } as never)).toBe(
      true,
    );
    expect(handler.canHandle({ type: "VOICE_ROSTER" } as never)).toBe(false);
    expect(handler.canHandle({ type: "MAP_SYNC" } as never)).toBe(false);
  });

  it("applies mute state from the sending guest", async () => {
    await handler.handle(
      { type: "VOICE_STATE", payload: { muted: true } } as never,
      conn as never,
      {} as never,
    );
    expect(voice.setGuestMuted).toHaveBeenCalledWith("guest-1", true);
  });

  it("answers sync requests with the current roster", async () => {
    await handler.handle(
      { type: "VOICE_SYNC_REQUEST" } as never,
      conn as never,
      {} as never,
    );
    expect(conn.send).toHaveBeenCalledWith({
      type: "VOICE_ROSTER",
      payload: { active: true, participants: [] },
    });
  });
});
