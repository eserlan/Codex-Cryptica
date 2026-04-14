import type { EncounterSession } from "../../../types/vtt";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decodeSessionSnapshot,
  encodeSessionSnapshot,
  isVTTMessage,
} from "./p2p-protocol";

describe("p2p-protocol", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips compressed snapshots when compression is used", async () => {
    vi.stubGlobal(
      "CompressionStream",
      class {
        readonly readable: ReadableStream<Uint8Array>;
        readonly writable: WritableStream<Uint8Array>;

        constructor(_format: string) {
          const transform = new TransformStream<Uint8Array, Uint8Array>();
          this.readable = transform.readable;
          this.writable = transform.writable;
        }
      },
    );
    vi.stubGlobal(
      "DecompressionStream",
      class {
        readonly readable: ReadableStream<Uint8Array>;
        readonly writable: WritableStream<Uint8Array>;

        constructor(_format: string) {
          const transform = new TransformStream<Uint8Array, Uint8Array>();
          this.readable = transform.readable;
          this.writable = transform.writable;
        }
      },
    );

    const session: EncounterSession = {
      id: "enc-1",
      name: "Encounter",
      mapId: "map-1",
      mode: "combat",
      tokens: {},
      initiativeOrder: [],
      initiativeValues: {},
      round: 1,
      turnIndex: 0,
      selection: null,
      sessionFogMask: null,
      lastPing: null,
      measurement: {
        active: false,
        start: null,
        end: null,
      },
      createdAt: 1,
      savedAt: null,
      chatMessages: Array.from({ length: 400 }, (_, index) => ({
        type: "CHAT_MESSAGE" as const,
        sender: "GM",
        senderId: "host",
        content: `message-${index}`.repeat(12),
        timestamp: index,
      })),
      gridSize: 50,
      gridUnit: "ft",
      gridDistance: 5,
    };

    const encoded = await encodeSessionSnapshot(session);
    expect(encoded.type).toBe("SESSION_SNAPSHOT_GZIP");

    const decoded = await decodeSessionSnapshot(encoded);

    expect(decoded.id).toBe("enc-1");
    expect(decoded.chatMessages).toHaveLength(400);
  });

  it("treats MAP_PING as a VTT message but not MAP_SYNC", () => {
    expect(
      isVTTMessage({
        type: "MAP_PING",
        mapId: "map-1",
        x: 10,
        y: 20,
        peerId: "guest-1",
        color: "#fff",
        timestamp: 123,
      }),
    ).toBe(true);

    expect(
      isVTTMessage({
        type: "MAP_SYNC",
        payload: { map: { id: "map-1" } },
      }),
    ).toBe(false);
  });
});
