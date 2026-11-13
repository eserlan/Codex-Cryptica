import { describe, expect, it } from "vitest";
import { readGmNotesOpen, writeGmNotesOpen } from "./gm-notes-preference";
import type { StorageLike } from "#lib/utils/runtime-deps.js";

const fakeStorage = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  } as StorageLike & { data: Map<string, string> };
};

const blockedStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
} as StorageLike;

describe("gm notes preference", () => {
  it("defaults to closed", () => {
    expect(readGmNotesOpen(fakeStorage())).toBe(false);
  });

  it("round-trips the choice", () => {
    const storage = fakeStorage();
    writeGmNotesOpen(true, storage);
    expect(storage.data.get("codex-entity-gm-notes-open")).toBe("1");
    expect(readGmNotesOpen(storage)).toBe(true);
    writeGmNotesOpen(false, storage);
    expect(storage.data.get("codex-entity-gm-notes-open")).toBe("0");
    expect(readGmNotesOpen(storage)).toBe(false);
  });

  it("does not throw when storage is blocked", () => {
    expect(readGmNotesOpen(blockedStorage)).toBe(false);
    expect(() => writeGmNotesOpen(true, blockedStorage)).not.toThrow();
  });
});
