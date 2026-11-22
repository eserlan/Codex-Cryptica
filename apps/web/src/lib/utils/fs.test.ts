import { describe, it, expect, vi, afterEach } from "vitest";
import {
  walkDirectory,
  pickDirectory,
  pickFolderFilesFallback,
  parseWebkitDirectoryFiles,
  isFileSystemAccessSupported,
  detectFileSystemAccessBrowser,
  getFileSystemAccessUnsupportedMessage,
} from "./fs";

describe("pickDirectory", () => {
  const hadShowDirectoryPicker = "showDirectoryPicker" in window;
  const originalShowDirectoryPicker = (window as any).showDirectoryPicker;

  afterEach(() => {
    // Restore exactly: recreate the property only if it originally existed,
    // otherwise delete it so a leftover `undefined` doesn't leak into other
    // tests' `"showDirectoryPicker" in window` / typeof checks.
    if (hadShowDirectoryPicker) {
      (window as any).showDirectoryPicker = originalShowDirectoryPicker;
    } else {
      delete (window as any).showDirectoryPicker;
    }
  });

  it("delegates to window.showDirectoryPicker when supported", async () => {
    const handle = { kind: "directory", name: "root" };
    (window as any).showDirectoryPicker = vi.fn().mockResolvedValue(handle);

    expect(isFileSystemAccessSupported()).toBe(true);
    const result = await pickDirectory({ mode: "read" });

    expect(result).toBe(handle);
    expect(window.showDirectoryPicker).toHaveBeenCalledWith({ mode: "read" });
  });

  it("treats a non-callable showDirectoryPicker as unsupported", () => {
    (window as any).showDirectoryPicker = undefined;
    expect(isFileSystemAccessSupported()).toBe(false);
  });

  it("throws an actionable NotSupportedError when unsupported", async () => {
    delete (window as any).showDirectoryPicker;

    expect(isFileSystemAccessSupported()).toBe(false);
    await expect(pickDirectory()).rejects.toMatchObject({
      name: "NotSupportedError",
      message: expect.any(String),
    });
  });
});

describe("detectFileSystemAccessBrowser / getFileSystemAccessUnsupportedMessage", () => {
  const originalUserAgent = navigator.userAgent;
  const originalBrave = (navigator as any).brave;

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    });
    (navigator as any).brave = originalBrave;
  });

  it("identifies Brave via navigator.brave and points at the flag", () => {
    (navigator as any).brave = { isBrave: async () => true };

    expect(detectFileSystemAccessBrowser()).toBe("brave");
    expect(getFileSystemAccessUnsupportedMessage("brave")).toContain(
      "brave://flags/#file-system-access-api",
    );
  });

  it("identifies Firefox and reassures the vault is saved, pointing at Export Backup", () => {
    delete (navigator as any).brave;
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
      configurable: true,
    });

    expect(detectFileSystemAccessBrowser()).toBe("firefox");
    const msg = getFileSystemAccessUnsupportedMessage("firefox");
    expect(msg).toContain("fully saved");
    expect(msg).toContain("Export Backup");
  });

  it("identifies Safari from the user agent", () => {
    delete (navigator as any).brave;
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
      configurable: true,
    });

    expect(detectFileSystemAccessBrowser()).toBe("safari");
  });
});

describe("walkDirectory", () => {
  it("should iterate using values() and recurse", async () => {
    const fileHandle = { kind: "file", name: "test.md" };
    const subDirHandle = {
      kind: "directory",
      name: "sub",
      values: vi.fn().mockReturnValue([fileHandle][Symbol.iterator]()),
    };
    const rootHandle = {
      kind: "directory",
      name: "root",
      values: vi.fn().mockReturnValue([subDirHandle][Symbol.iterator]()),
    };

    const entries = await walkDirectory(rootHandle as any);

    expect(entries).toHaveLength(1);
    expect(entries[0].path).toEqual(["sub", "test.md"]);
    expect(rootHandle.values).toHaveBeenCalled();
    expect(subDirHandle.values).toHaveBeenCalled();
  });

  it("should continue after single entry failure", async () => {
    const goodFile = { kind: "file", name: "good.md" };

    // Let's simulate a subdirectory that fails to walk.
    const subDirHandle = {
      kind: "directory",
      name: "sub",
      values: vi.fn().mockImplementation(() => {
        throw new Error("Access Denied");
      }),
    };

    const rootHandle = {
      kind: "directory",
      name: "root",
      values: async function* () {
        yield goodFile;
        yield subDirHandle;
      },
    };

    const onError = vi.fn();
    const entries = await walkDirectory(rootHandle as any, [], onError);

    expect(entries).toHaveLength(1);
    expect(entries[0].path).toEqual(["good.md"]);
    // The subdir walk failed, so it should trigger onError
    expect(onError).toHaveBeenCalledWith(expect.any(Error), ["sub"]);
  });
});

describe("parseWebkitDirectoryFiles", () => {
  it("strips the top-level folder prefix into folderName and vault-relative paths", () => {
    const f1 = new File(["# NPC"], "npc.md", { type: "text/markdown" });
    Object.defineProperty(f1, "webkitRelativePath", {
      value: "MyCampaign/entities/npc.md",
    });
    const f2 = new File(["{}"], "maps.json", { type: "application/json" });
    Object.defineProperty(f2, "webkitRelativePath", {
      value: "MyCampaign/.codex/maps.json",
    });

    const result = parseWebkitDirectoryFiles([f1, f2]);
    expect(result).not.toBeNull();
    expect(result!.folderName).toBe("MyCampaign");
    expect(result!.files).toEqual([
      { path: ["entities", "npc.md"], file: f1 },
      { path: [".codex", "maps.json"], file: f2 },
    ]);
  });

  it("represents an empty selected directory and falls back when no folder prefix exists", () => {
    expect(parseWebkitDirectoryFiles([])).toEqual({
      folderName: "Imported Vault",
      files: [],
    });

    const loose = new File(["hi"], "note.md");
    const result = parseWebkitDirectoryFiles([loose]);
    expect(result).toEqual({
      folderName: "Imported Vault",
      files: [{ path: ["note.md"], file: loose }],
    });
  });
});

describe("pickFolderFilesFallback", () => {
  it("returns a folder selection when the selected folder has no files", async () => {
    const clickSpy = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(function () {
        this.dispatchEvent(new Event("change"));
      });

    await expect(pickFolderFilesFallback()).resolves.toEqual({
      folderName: "Imported Vault",
      files: [],
    });
    expect(clickSpy).toHaveBeenCalledOnce();
    clickSpy.mockRestore();
  });
});
