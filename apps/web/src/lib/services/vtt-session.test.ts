import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  VTTSessionService,
  createEncounterSession,
  sanitizeEncounterSession,
  summarizeEncounterSession,
} from "./vtt-session";

const opfsMock = vi.hoisted(() => ({
  writeOpfsFile: vi.fn(),
  readOpfsBlob: vi.fn(),
}));

vi.mock("../utils/opfs", () => ({
  writeOpfsFile: opfsMock.writeOpfsFile,
  readOpfsBlob: opfsMock.readOpfsBlob,
}));

const { writeOpfsFile, readOpfsBlob } = opfsMock;

describe("vtt-session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates, sanitizes, and summarizes encounters", () => {
    const session = createEncounterSession("map-1", "enc-1", "Goblin Ambush");
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
        visibleTo: "all",
        color: "#fff",
        imageUrl: null,
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
    const service = new VTTSessionService({
      getActiveVaultHandle: vi.fn().mockResolvedValue(vaultHandle),
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

    readOpfsBlob.mockResolvedValue(
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
      name: "vault",
      getDirectoryHandle: vi.fn().mockResolvedValue(mapsDir),
    } as any;

    const service = new VTTSessionService({
      getActiveVaultHandle: vi.fn().mockResolvedValue(vaultHandle),
    });

    const snapshots = await service.listEncounterSnapshots("map-1");
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].id).toBe("enc-3");
    expect(snapshots[0].name).toBe("Forest Ambush");
  });
});
