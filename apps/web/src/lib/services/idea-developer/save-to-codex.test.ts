import { describe, expect, it } from "vitest";
import type { SessionEntity } from "generator-engine";
import { ImportDraftSchema } from "$lib/services/seo/import-handler";
import type { StorageLike } from "$lib/utils/runtime-deps";
import { PENDING_IMPORT_KEY, SaveToCodex } from "./save-to-codex";

const entity: SessionEntity = {
  id: "id-1",
  type: "note",
  title: "A town of dragon parts",
  summary: "A town where everything is made from dragon parts.",
  content: "Your idea:\nA town…",
  labels: ["idea-developer", "develop"],
  status: "draft",
  reuseEnabled: true,
  pinned: false,
  selectedForSave: true,
  createdOrder: 1,
};

function memoryStorage() {
  const data = new Map<string, string>();
  const writes: string[] = [];
  const storage: StorageLike = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      writes.push(k);
      data.set(k, v);
    },
    removeItem: (k) => void data.delete(k),
    length: 0,
    key: () => null,
  };
  return { storage, data, writes };
}

describe("SaveToCodex", () => {
  it("writes one import draft that passes the importer's schema", () => {
    const { storage, data } = memoryStorage();
    const service = new SaveToCodex(
      (id) => (id === "id-1" ? entity : undefined),
      storage,
    );
    expect(service.save("id-1")).toEqual({ ok: true });
    const parsed = JSON.parse(data.get(PENDING_IMPORT_KEY)!);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    const draft = ImportDraftSchema.parse(parsed[0]);
    expect(draft.title).toBe("A town of dragon parts");
    expect(draft.type).toBe("note");
    expect(draft.labels).toEqual(["idea-developer", "develop"]);
    expect(draft.status).toBe("draft");
  });

  it("writes to no other storage key", () => {
    const { storage, writes } = memoryStorage();
    new SaveToCodex(() => entity, storage).save("id-1");
    expect(writes).toEqual([PENDING_IMPORT_KEY]);
  });

  it("says so, and writes nothing, when storage is blocked", () => {
    const blocked: StorageLike = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      length: 0,
      key: () => null,
    };
    const result = new SaveToCodex(() => entity, blocked).save("id-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/copy/i);
  });

  it("says so when storage throws", () => {
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {},
      length: 0,
      key: () => null,
    };
    const result = new SaveToCodex(() => entity, throwing).save("id-1");
    expect(result.ok).toBe(false);
  });

  it("says so when the draft is no longer in the Session Hub", () => {
    const { storage, writes } = memoryStorage();
    const result = new SaveToCodex(() => undefined, storage).save("id-1");
    expect(result.ok).toBe(false);
    expect(writes).toEqual([]);
  });
});
