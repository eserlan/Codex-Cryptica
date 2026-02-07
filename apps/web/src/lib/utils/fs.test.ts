import { describe, it, expect, vi } from "vitest";
import { walkDirectory } from "./fs";

describe("walkDirectory", () => {
  it("should iterate using values() and recurse", async () => {
    const fileHandle = { kind: "file", name: "test.md" };
    const subDirHandle = {
      kind: "directory",
      name: "sub",
      values: vi.fn().mockReturnValue([fileHandle][Symbol.iterator]())
    };
    const rootHandle = {
      kind: "directory",
      name: "root",
      values: vi.fn().mockReturnValue([subDirHandle][Symbol.iterator]())
    };

    const entries = await walkDirectory(rootHandle as any);
    
    expect(entries).toHaveLength(1);
    expect(entries[0].path).toEqual(["sub", "test.md"]);
    expect(rootHandle.values).toHaveBeenCalled();
    expect(subDirHandle.values).toHaveBeenCalled();
  });

  it("should continue after single entry failure", async () => {
    const goodFile = { kind: "file", name: "good.md" };
    // Mock iterator that throws on one item but yields others?
    // Hard to mock sync iterator throwing mid-way easily without generator.
    
    async function* mockGenerator() {
      yield goodFile;
      throw new Error("Bad Entry");
    }
    
    // Actually, the try/catch is inside the loop `for await (const handle of dirHandle.values())`.
    // If `values()` returns an iterator, and `.next()` throws, the loop terminates.
    // The try/catch inside the loop catches errors processed *after* the handle is yielded (e.g. recursion).
    
    // Let's test the recursion error case where a subdirectory fails to process?
    // Or if `handle.name` access throws (unlikely).
    
    // Let's simulate a subdirectory that fails to walk.
    const subDirHandle = {
        kind: "directory",
        name: "sub",
        values: vi.fn().mockImplementation(() => {
            throw new Error("Access Denied");
        })
    };
    
    const rootHandle = {
        kind: "directory",
        name: "root",
        values: async function* () {
            yield goodFile;
            yield subDirHandle;
        }
    };
    
    const onError = vi.fn();
    const entries = await walkDirectory(rootHandle as any, [], onError);
    
    expect(entries).toHaveLength(1);
    expect(entries[0].path).toEqual(["good.md"]);
    // The subdir walk failed, so it should trigger onError
    expect(onError).toHaveBeenCalledWith(expect.any(Error), ["sub"]);
  });
});
