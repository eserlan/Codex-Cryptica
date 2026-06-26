import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createEncounterSession,
  sanitizeEncounterSession,
  summarizeEncounterSession,
  VTTSessionService,
} from "./vtt-session";
import { deleteOpfsEntry, readOpfsBlob, writeOpfsFile } from "../utils/opfs";

vi.mock("../utils/opfs", () => ({
  deleteOpfsEntry: vi.fn(),
  readOpfsBlob: vi.fn(),
  writeOpfsFile: vi.fn(),
}));

describe("vtt-session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("respects injected dependencies for id and time", () => {
    const mockIdGenerator = { uuid: () => "mock-uuid" };
    const mockClock = { now: () => 1234567890 };

    const session = createEncounterSession(
      "map-1",
      undefined,
      undefined,
      { idGenerator: mockIdGenerator, clock: mockClock }
    );

    expect(session.id).toBe("mock-uuid");
    expect(session.name).toBe("Encounter mock-uui");
    expect(session.createdAt).toBe(1234567890);
  });

  it("creates, sanitizes, and summarizes encounters", () => {
    const session = createEncounterSession(
      "map-1",
      "enc-1",
      "Goblin Ambush",
    );
    session.tokens = {
      token: {
        id: "token",
        entityId: null,
        name: "Token",
        x: 12,
        y: 24,
        width: 32,
        height: 32,
        rotation: 0,
        zIndex: 1,
        ownerPeerId: null,
        ownerGuestName: null,
        visibleTo: "all",
        color: "#fff",
        imageUrl: null,
        statusEffects: [],
      },
    };
    session.savedAt = 456;
    session.lastPing = {
      x: 1,
      y: 2,
      peerId: "peer-1",
      color: "hsl(120 75% 55%)",
      timestamp: 123,
    };

    const sanitized = sanitizeEncounterSession(session);
    expect(sanitized.tokens.token).not.toBe(session.tokens.token);
    expect(sanitized.lastPing).toEqual({
      x: 1,
      y: 2,
      peerId: "peer-1",
      color: "hsl(120 75% 55%)",
      timestamp: 123,
    });

    expect(summarizeEncounterSession(session)).toEqual({
      id: "enc-1",
      name: "Goblin Ambush",
      mapId: "map-1",
      savedAt: 456,
      tokenCount: 1,
      round: 1,
      mode: "exploration",
    });
  });

  it("saves and loads snapshots in OPFS", async () => {
    const vaultHandle = { name: "vault" } as FileSystemDirectoryHandle;
    const mockClock = { now: () => 1234567890 };
    const service = new VTTSessionService({
      getActiveVaultHandle: vi.fn().mockResolvedValue(vaultHandle),
      clock: mockClock,
    });

    await service.saveEncounterSnapshot(
      createEncounterSession("map-1", "enc-1", "Goblin Ambush"),
    );

    expect(writeOpfsFile).toHaveBeenCalledWith(
      ["maps", "map-1_encounter_enc-1.json"],
      expect.any(Blob),
      vaultHandle,
      "vault",
    );

    const callArgs = vi.mocked(writeOpfsFile).mock.calls[0];
    const blobArg = callArgs[1] as Blob;
    const jsonContent = await blobArg.text();
    const parsedPayload = JSON.parse(jsonContent);
    expect(parsedPayload.savedAt).toBe(1234567890);

    (readOpfsBlob as any).mockResolvedValue(
      new Blob(
        [
          JSON.stringify(
            createEncounterSession("map-1", "enc-2", "Ruined Gate"),
          ),
        ],
        {
          type: "application/json",
        },
      ),
    );

    const loaded = await service.loadEncounterSnapshot("map-1", "enc-2");
    expect(loaded.id).toBe("enc-2");
  });

  it("deletes snapshots from OPFS", async () => {
    const vaultHandle = { name: "vault" } as FileSystemDirectoryHandle;
    const service = new VTTSessionService({
      getActiveVaultHandle: vi.fn().mockResolvedValue(vaultHandle),
    });

    await service.deleteEncounterSnapshot("map-1", "enc-1");

    expect(vi.mocked(writeOpfsFile)).not.toHaveBeenCalled();
    expect(vi.mocked(readOpfsBlob)).not.toHaveBeenCalled();
    expect(vi.mocked(deleteOpfsEntry)).toHaveBeenCalledWith(
      vaultHandle,
      ["maps", "map-1_encounter_enc-1.json"],
      "vault",
    );
  });

  it("lists encounter snapshots from the maps directory", async () => {
    const file = {
      kind: "file",
      getFile: vi.fn().mockResolvedValue(
        new Blob(
          [
            JSON.stringify(
              createEncounterSession("map-1", "enc-3", "Forest Ambush"),
            ),
          ],
          {
            type: "application/json",
          },
        ),
      ),
    };
    const mapsDir = {
      entries: vi.fn().mockReturnValue(
        (async function* () {
          yield ["map-1_encounter_enc-3.json", file];
        })(),
      ),
    };
    const vaultHandle = {
      getDirectoryHandle: vi.fn().mockResolvedValue(mapsDir),
    } as any;
    const service = new VTTSessionService({
      getActiveVaultHandle: vi.fn().mockResolvedValue(vaultHandle),
    });

    const snapshots = await service.listEncounterSnapshots("map-1");
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].name).toBe("Forest Ambush");
  });
});
