import { beforeEach, describe, expect, it, vi } from "vitest";

const db = {
  get: vi.fn(),
  getAll: vi.fn(),
  put: vi.fn(),
  transaction: vi.fn(),
};

vi.mock("../utils/idb", () => ({ getDB: vi.fn(async () => db) }));

import { getDB } from "../utils/idb";
import {
  loadPersistedGraphState,
  nextCommunityMode,
  persistGraphSetting,
  saveEras,
} from "./graph-persistence";

const stored = (values: Record<string, unknown>) =>
  db.get.mockImplementation(async (_store: string, key: string) => values[key]);

beforeEach(() => {
  vi.clearAllMocks();
  db.getAll.mockResolvedValue([]);
  db.put.mockResolvedValue(undefined);
  stored({});
});

describe("nextCommunityMode", () => {
  it("cycles off, soft, strong and back to off", () => {
    expect(nextCommunityMode("off")).toBe("soft");
    expect(nextCommunityMode("soft")).toBe("strong");
    expect(nextCommunityMode("strong")).toBe("off");
  });
});

describe("persistGraphSetting", () => {
  it("writes the value under its key", async () => {
    await persistGraphSetting("graphShowLabels", false);
    expect(db.put).toHaveBeenCalledWith("settings", false, "graphShowLabels");
  });

  it("logs and carries on when the write fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    db.put.mockRejectedValue(new Error("quota"));

    await expect(
      persistGraphSetting("graphStableLayout", true),
    ).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(
      "[GraphStore] Failed to persist graphStableLayout:",
      expect.any(Error),
    );
    error.mockRestore();
  });

  it("logs and carries on when the database cannot be opened", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getDB).mockRejectedValueOnce(new Error("blocked"));

    await expect(persistGraphSetting("graphRecentLabels", [])).resolves.toBe(
      undefined,
    );
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe("loadPersistedGraphState", () => {
  it("reads every saved setting", async () => {
    db.getAll.mockResolvedValue([{ id: "era-1" }]);
    stored({
      graphShowLabels: false,
      graphShowImages: false,
      graphCommunityMode: "strong",
      graphStableLayout: false,
      graphRecentLabels: ["magic"],
      graphLabelFilterMode: "AND",
    });

    expect(await loadPersistedGraphState()).toEqual({
      eras: [{ id: "era-1" }],
      showLabels: false,
      showImages: false,
      communityMode: "strong",
      stableLayout: false,
      recentLabels: ["magic"],
      labelFilterMode: "AND",
    });
  });

  it("leaves unsaved settings out so defaults stay in force", async () => {
    expect(await loadPersistedGraphState()).toEqual({ eras: [] });
  });

  it("reads the old on/off flag when there is no saved mode", async () => {
    stored({ graphShowCommunities: false });
    expect((await loadPersistedGraphState()).communityMode).toBe("off");
  });

  it("ignores an unknown saved mode", async () => {
    stored({ graphCommunityMode: "loud", graphShowCommunities: false });
    expect((await loadPersistedGraphState()).communityMode).toBeUndefined();
  });
});

describe("saveEras", () => {
  it("replaces the stored eras in one transaction", async () => {
    const store = { clear: vi.fn(), put: vi.fn() };
    db.transaction.mockReturnValue({ store, done: Promise.resolve() });

    await saveEras([{ id: "a" }, { id: "b" }] as any);

    expect(db.transaction).toHaveBeenCalledWith("world_eras", "readwrite");
    expect(store.clear).toHaveBeenCalledOnce();
    expect(store.put.mock.calls).toEqual([[{ id: "a" }], [{ id: "b" }]]);
  });

  it("lets a failed transaction surface to the caller", async () => {
    db.transaction.mockReturnValue({
      store: { clear: vi.fn(), put: vi.fn() },
      done: Promise.reject(new Error("aborted")),
    });
    await expect(saveEras([])).rejects.toThrow("aborted");
  });
});
