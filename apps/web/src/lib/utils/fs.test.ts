import { describe, it, expect, vi, afterEach } from "vitest";
import {
  walkDirectory,
  pickDirectory,
  isFileSystemAccessSupported,
  detectFileSystemAccessBrowser,
  getFileSystemAccessUnsupportedMessage,
} from "./fs";

describe("pickDirectory", () => {
  const originalShowDirectoryPicker = (window as any).showDirectoryPicker;

  afterEach(() => {
    (window as any).showDirectoryPicker = originalShowDirectoryPicker;
  });

  it("delegates to window.showDirectoryPicker when supported", async () => {
    const handle = { kind: "directory", name: "root" };
    (window as any).showDirectoryPicker = vi.fn().mockResolvedValue(handle);

    const result = await pickDirectory({ mode: "read" });

    expect(result).toBe(handle);
    expect(window.showDirectoryPicker).toHaveBeenCalledWith({ mode: "read" });
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

  it("identifies Firefox from the user agent and explains it's unsupported there", () => {
    delete (navigator as any).brave;
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
      configurable: true,
    });

    expect(detectFileSystemAccessBrowser()).toBe("firefox");
    expect(getFileSystemAccessUnsupportedMessage("firefox")).toContain(
      "doesn't yet support",
    );
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
