import { describe, it, expect, vi, beforeEach } from "vitest";
import { GuestSoundBiteHandler } from "./guest-sound-bite-handler";
import { soundBiteService } from "@codex/audio-engine";

vi.mock("@codex/audio-engine", () => {
  return {
    soundBiteService: {
      loadFromEntity: vi.fn(),
      pendingAutoPlay: false,
    },
  };
});

describe("GuestSoundBiteHandler", () => {
  let handler: GuestSoundBiteHandler;
  let mockContext: any;
  const conn = { peer: "host", send: vi.fn(), close: vi.fn() } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new GuestSoundBiteHandler();
    soundBiteService.pendingAutoPlay = false;

    mockContext = {
      vault: {
        entities: {
          "entity-1": {
            id: "entity-1",
            title: "Bobbie Draper",
            soundBite: {
              transcript: "Hooray!",
              audioFile: "audio/entity-1_soundbite.wav",
            },
          },
          "entity-no-soundbite": {
            id: "entity-no-soundbite",
            title: "No Sound",
          },
        },
      },
      modalUIStore: {
        openSoundBite: vi.fn(),
      },
    };
  });

  it("can handle SOUND_BITE_PLAY type messages", () => {
    expect(handler.canHandle({ type: "SOUND_BITE_PLAY" } as any)).toBe(true);
    expect(handler.canHandle({ type: "ENTITY_UPDATE" } as any)).toBe(false);
  });

  it("loads sound bite, sets autoplay, and opens the modal if entity has sound bite", async () => {
    const msg = {
      type: "SOUND_BITE_PLAY",
      entityId: "entity-1",
    } as any;

    await handler.handle(msg, conn, mockContext);

    expect(soundBiteService.loadFromEntity).toHaveBeenCalledWith(
      mockContext.vault.entities["entity-1"],
    );
    expect(soundBiteService.pendingAutoPlay).toBe(true);
    expect(mockContext.modalUIStore.openSoundBite).toHaveBeenCalledWith(
      "entity-1",
    );
  });

  it("returns early and does not open modal if entity has no sound bite", async () => {
    const msg = {
      type: "SOUND_BITE_PLAY",
      entityId: "entity-no-soundbite",
    } as any;

    await handler.handle(msg, conn, mockContext);

    expect(soundBiteService.loadFromEntity).not.toHaveBeenCalled();
    expect(soundBiteService.pendingAutoPlay).toBe(false);
    expect(mockContext.modalUIStore.openSoundBite).not.toHaveBeenCalled();
  });

  it("returns early and does not open modal if entity does not exist", async () => {
    const msg = {
      type: "SOUND_BITE_PLAY",
      entityId: "non-existent-entity",
    } as any;

    await handler.handle(msg, conn, mockContext);

    expect(soundBiteService.loadFromEntity).not.toHaveBeenCalled();
    expect(soundBiteService.pendingAutoPlay).toBe(false);
    expect(mockContext.modalUIStore.openSoundBite).not.toHaveBeenCalled();
  });
});
