import { describe, it, expect, vi } from "vitest";
import { SyncPlanner } from "./SyncPlanner";

describe("SyncPlanner", () => {
  it("resolves unknown remote files through the registry", async () => {
    const registry = {
      getEntryByRemoteId: vi.fn().mockResolvedValue({
        filePath: "notes/known.md",
        vaultId: "vault-1",
        status: "SYNCED",
        remoteId: "remote-1",
      }),
    } as any;
    const calculateAction = vi.fn().mockResolvedValue({
      type: "SKIP",
      path: "notes/known.md",
    });
    const planner = new SyncPlanner(registry, { calculateAction } as any);

    await planner.plan(
      [],
      {
        files: [
          {
            path: "unknown",
            lastModified: 10,
            size: 12,
            handle: "remote-1",
            hash: "hash-1",
          },
        ],
      },
      [],
      "pull"
    );

    expect(registry.getEntryByRemoteId).toHaveBeenCalledWith("remote-1");
    expect(calculateAction).toHaveBeenCalledWith(
      "notes/known.md",
      undefined,
      expect.objectContaining({
        path: "notes/known.md",
        handle: "remote-1",
      }),
      undefined,
      "pull",
      undefined,
    );
  });

  it("synthesizes missing OPFS metadata during delta sync", async () => {
    const registry = {
      getEntryByRemoteId: vi.fn(),
    } as any;
    const calculateAction = vi.fn().mockResolvedValue({
      type: "SKIP",
      path: "notes/stable.md",
    });
    const planner = new SyncPlanner(registry, { calculateAction } as any);

    await planner.plan(
      [
        {
          path: "notes/stable.md",
          lastModified: 100,
          size: 24,
        },
      ],
      {
        files: [],
        nextToken: "next-token",
      },
      [
        {
          filePath: "notes/stable.md",
          vaultId: "vault-1",
          status: "SYNCED",
          remoteId: "remote-1",
          lastSyncedFsModified: 100,
          lastSyncedFsSize: 24,
          lastSyncedOpfsHash: "hash-1",
        },
      ],
      "pull",
      "since-token",
    );

    expect(calculateAction).toHaveBeenCalledWith(
      "notes/stable.md",
      expect.objectContaining({
        path: "notes/stable.md",
        lastModified: 100,
        size: 24,
      }),
      expect.objectContaining({
        path: "notes/stable.md",
        handle: "remote-1",
        hash: "hash-1",
        size: 24,
      }),
      expect.objectContaining({
        filePath: "notes/stable.md",
        remoteId: "remote-1",
      }),
      "pull",
      undefined,
    );
  });

  it("passes direction to DiffAlgorithm", async () => {
    const registry = { getEntryByRemoteId: vi.fn() } as any;
    const calculateAction = vi.fn().mockResolvedValue({ type: "SKIP", path: "test.md" });
    const planner = new SyncPlanner(registry, { calculateAction } as any);

    await planner.plan(
      [{ path: "test.md", lastModified: 1, size: 1 }], 
      { files: [] }, 
      [], 
      "push"
    );

    expect(calculateAction).toHaveBeenCalledWith(
      "test.md",
      expect.anything(),
      undefined,
      undefined,
      "push",
      undefined
    );
  });
});
