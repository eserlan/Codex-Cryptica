import { describe, expect, it, vi } from "vitest";
import { SearchEngine } from "../src";
import type { SearchEntry } from "schema";

function makeEntry(
  id: string,
  overrides: Partial<SearchEntry> = {},
): SearchEntry {
  return {
    id,
    title: `Title ${id}`,
    content: `Content ${id}`,
    type: "note",
    path: `${id}.md`,
    updatedAt: 0,
    ...overrides,
  };
}

describe("SearchEngine progressive indexing", () => {
  it("returns run metadata, accepted count, and failed ids", async () => {
    const engine = new SearchEngine();
    await engine.clear();

    const result = await engine.addBatchProgressive(
      [makeEntry("one"), makeEntry("two")],
      {
        runId: "run-1",
        vaultId: "vault-1",
        batchIndex: 0,
        indexedBefore: 0,
        totalCount: 2,
      },
    );

    expect(result).toEqual({
      runId: "run-1",
      vaultId: "vault-1",
      acceptedCount: 2,
      failedIds: [],
    });
    expect(engine.docCount).toBe(2);
  });

  it("keeps addBatch compatible with existing callers", async () => {
    const engine = new SearchEngine();
    await engine.clear();

    await engine.addBatch([makeEntry("legacy")]);

    expect(engine.docCount).toBe(1);
    await expect(engine.search("legacy")).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "legacy" })]),
    );
  });

  it("reports failed ids without rejecting the whole batch", async () => {
    const engine = new SearchEngine();
    await engine.clear();
    const addSpy = vi.spyOn((engine as any).index, "add");
    addSpy.mockImplementation((doc: SearchEntry) => {
      if (doc.id === "bad") throw new Error("bad doc");
      return undefined;
    });

    const result = await engine.addBatchProgressive(
      [makeEntry("good"), makeEntry("bad")],
      {
        runId: "run-2",
        vaultId: "vault-2",
        batchIndex: 0,
        indexedBefore: 0,
        totalCount: 2,
      },
    );

    expect(result.acceptedCount).toBe(1);
    expect(result.failedIds).toEqual(["bad"]);
    expect(engine.docCount).toBe(1);
    addSpy.mockRestore();
  });
});
