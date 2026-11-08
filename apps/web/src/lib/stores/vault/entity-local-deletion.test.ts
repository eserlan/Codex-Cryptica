import "./entity-mutation-test-helpers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { removeLocalEntityFile } from "./entity-local-deletion";
import { debugStore } from "../debug.svelte";

function directory(permission = "granted") {
  return {
    queryPermission: vi.fn().mockResolvedValue(permission),
    getDirectoryHandle: vi.fn(),
    removeEntry: vi.fn().mockResolvedValue(undefined),
  };
}
beforeEach(() => vi.clearAllMocks());
describe("removeLocalEntityFile", () => {
  it("walks nested paths and removes files recursively without creating folders", async () => {
    const root = directory();
    const child = directory();
    root.getDirectoryHandle.mockResolvedValue(child);
    await removeLocalEntityFile(root as unknown as FileSystemDirectoryHandle, [
      "notes",
      "hero.md",
    ]);
    expect(root.queryPermission).toHaveBeenCalledWith({ mode: "readwrite" });
    expect(root.getDirectoryHandle).toHaveBeenCalledWith("notes", {
      create: false,
    });
    expect(child.removeEntry).toHaveBeenCalledWith("hero.md", {
      recursive: true,
    });
    expect(root.removeEntry).not.toHaveBeenCalled();
  });

  it("does nothing without permission, a root or an existing nested directory", async () => {
    await removeLocalEntityFile(undefined, ["hero.md"]);
    const root = directory("denied");
    await removeLocalEntityFile(root as unknown as FileSystemDirectoryHandle, [
      "hero.md",
    ]);
    expect(root.removeEntry).not.toHaveBeenCalled();
    root.queryPermission.mockResolvedValue("granted");
    root.getDirectoryHandle.mockRejectedValue(new Error("missing"));
    await removeLocalEntityFile(root as unknown as FileSystemDirectoryHandle, [
      "missing",
      "deeper",
      "hero.md",
    ]);
    expect(root.getDirectoryHandle).toHaveBeenCalledTimes(1);
    expect(root.removeEntry).not.toHaveBeenCalled();
    expect(debugStore.warn).not.toHaveBeenCalled();
  });

  it.each(["queryPermission", "removeEntry"] as const)(
    "logs %s failures without rejecting",
    async (method) => {
      const root = directory();
      const error = new Error("filesystem");
      root[method].mockRejectedValueOnce(error);
      await expect(
        removeLocalEntityFile(root as unknown as FileSystemDirectoryHandle, [
          "hero.md",
        ]),
      ).resolves.toBeUndefined();
      expect(debugStore.warn).toHaveBeenCalledWith(
        "[EntityMutation] Failed to delete hero.md from local filesystem",
        error,
      );
    },
  );
});
