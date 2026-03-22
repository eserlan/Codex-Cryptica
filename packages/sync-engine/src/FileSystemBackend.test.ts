import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileSystemBackend } from "./FileSystemBackend";

describe("FileSystemBackend", () => {
  let mockRootHandle: any;
  let backend: FileSystemBackend;

  beforeEach(() => {
    mockRootHandle = {
      kind: "directory",
      name: "root",
      queryPermission: vi.fn().mockResolvedValue("granted"),
      getDirectoryHandle: vi.fn(),
      getFileHandle: vi.fn(),
      removeEntry: vi.fn(),
      [Symbol.asyncIterator]: vi.fn().mockReturnValue({
        next: vi.fn().mockResolvedValue({ done: true }),
      }),
    };

    backend = new FileSystemBackend(mockRootHandle);
  });

  describe("scan", () => {
    it("should scan a flat directory", async () => {
      const mockFileEntry = {
        kind: "file",
        name: "test.md",
        getFile: vi.fn().mockResolvedValue({
          lastModified: 1000,
          size: 100,
        }),
      };

      const entries = new Map([["test.md", mockFileEntry]]);
      mockRootHandle[Symbol.asyncIterator] = vi.fn().mockReturnValue({
        entries: Array.from(entries.entries())[Symbol.iterator](),
        async next() {
          const result = this.entries.next();
          return result.done
            ? { done: true }
            : { value: result.value, done: false };
        },
      });

      const result = await backend.scan("v1");
      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toBe("test.md");
      expect(result.files[0].size).toBe(100);
    });

    it("should scan recursively", async () => {
      const mockSubDir = {
        kind: "directory",
        name: "sub",
        [Symbol.asyncIterator]: vi.fn().mockReturnValue({
          entries: [
            [
              "inner.md",
              {
                kind: "file",
                name: "inner.md",
                getFile: vi
                  .fn()
                  .mockResolvedValue({ lastModified: 2000, size: 50 }),
              },
            ],
          ][Symbol.iterator](),
          async next() {
            const result = this.entries.next();
            return result.done
              ? { done: true }
              : { value: result.value, done: false };
          },
        }),
      };

      mockRootHandle[Symbol.asyncIterator] = vi.fn().mockReturnValue({
        entries: [["sub", mockSubDir]][Symbol.iterator](),
        async next() {
          const result = this.entries.next();
          return result.done
            ? { done: true }
            : { value: result.value, done: false };
        },
      });

      const result = await backend.scan("v1");
      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toBe("sub/inner.md");
    });
  });

  describe("download", () => {
    it("should download a file", async () => {
      const mockFile = {
        getFile: vi.fn().mockResolvedValue(new Blob(["hello"])),
      };
      mockRootHandle.getFileHandle.mockResolvedValue(mockFile);

      const blob = await backend.download("test.md");
      expect(await blob.text()).toBe("hello");
    });

    it("should throw if file not found", async () => {
      const error = new Error("Not found");
      error.name = "NotFoundError";
      mockRootHandle.getFileHandle.mockRejectedValue(error);

      await expect(backend.download("missing.md")).rejects.toThrow(
        "File not found",
      );
    });
  });

  describe("upload", () => {
    it("should upload a file", async () => {
      const mockWritable = {
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };
      const mockFile = {
        createWritable: vi.fn().mockResolvedValue(mockWritable),
        getFile: vi.fn().mockResolvedValue({ lastModified: 3000, size: 10 }),
      };
      mockRootHandle.getFileHandle.mockResolvedValue(mockFile);

      const result = await backend.upload("test.md", new Blob(["data"]));
      expect(result.path).toBe("test.md");
      expect(mockWritable.write).toHaveBeenCalledWith(expect.any(Blob));
      expect(mockWritable.close).toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("should delete a file", async () => {
      await backend.delete("test.md");
      expect(mockRootHandle.removeEntry).toHaveBeenCalledWith("test.md");
    });

    it("should delete from subfolder", async () => {
      const mockSubDir = { getDirectoryHandle: vi.fn(), removeEntry: vi.fn() };
      mockRootHandle.getDirectoryHandle.mockResolvedValue(mockSubDir);

      await backend.delete("sub/test.md");
      expect(mockRootHandle.getDirectoryHandle).toHaveBeenCalledWith("sub");
      expect(mockSubDir.removeEntry).toHaveBeenCalledWith("test.md");
    });

    it("should ignore NotFoundError on delete", async () => {
      const error = new Error("Not found");
      error.name = "NotFoundError";
      mockRootHandle.removeEntry.mockRejectedValue(error);

      await expect(backend.delete("test.md")).resolves.toBeUndefined();
    });
  });

  describe("error handling and permissions", () => {
    it("should throw if permission revoked", async () => {
      mockRootHandle.queryPermission.mockResolvedValue("denied");
      // resolveFileHandle will throw NotFoundError with message "Permission to write to local directory was revoked."
      // which download() will then wrap in "File not found: test.md"
      await expect(backend.download("test.md")).rejects.toThrow(
        "File not found",
      );
    });

    it("should handle disconnect (queryPermission throws)", async () => {
      mockRootHandle.queryPermission.mockRejectedValue(
        new Error("disconnected"),
      );
      await expect(backend.download("test.md")).rejects.toThrow(
        "File not found",
      );
    });

    it("should retry on upload failure (NotFoundError)", async () => {
      const mockWritable = {
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };
      const mockFile = {
        createWritable: vi.fn().mockResolvedValue(mockWritable),
        getFile: vi.fn().mockResolvedValue({ lastModified: 3000, size: 10 }),
      };

      const error = new Error("Not found");
      error.name = "NotFoundError";

      // Fail once, then succeed
      mockRootHandle.getFileHandle
        .mockRejectedValueOnce(error)
        .mockResolvedValue(mockFile);

      // We need to mock setTimeout or it will take a while
      vi.useFakeTimers();
      const uploadPromise = backend.upload("test.md", new Blob(["data"]));

      // Wait for the retry timer
      await vi.runAllTimersAsync();

      const result = await uploadPromise;
      expect(result.path).toBe("test.md");
      expect(mockRootHandle.getFileHandle).toHaveBeenCalledTimes(3); // 1st try (fail), 2nd try (success), 3rd try (final verification)
      vi.useRealTimers();
    });

    it("should abort on write failure", async () => {
      const mockWritable = {
        write: vi.fn().mockRejectedValue(new Error("Disk full")),
        abort: vi.fn().mockResolvedValue(undefined),
      };
      const mockFile = {
        createWritable: vi.fn().mockResolvedValue(mockWritable),
        getFile: vi.fn().mockResolvedValue({ lastModified: 3000, size: 10 }),
      };
      mockRootHandle.getFileHandle.mockResolvedValue(mockFile);

      await expect(
        backend.upload("test.md", new Blob(["data"])),
      ).rejects.toThrow("Disk full");
      expect(mockWritable.abort).toHaveBeenCalled();
    });

    it("should fail after max retries", async () => {
      const error = new Error("Not found");
      error.name = "NotFoundError";
      mockRootHandle.getFileHandle.mockRejectedValue(error);

      vi.useFakeTimers();
      const uploadPromise = backend.upload("test.md", new Blob(["data"]));

      // Catch it early to avoid unhandled rejection in Vitest
      uploadPromise.catch(() => {});

      // Wait for all retries (3 tries total)
      // 1st attempt fails immediately
      await vi.advanceTimersByTimeAsync(1000); // 1st retry delay
      // 2nd attempt fails
      await vi.advanceTimersByTimeAsync(2000); // 2nd retry delay
      // 3rd attempt fails and rethrows original error

      await expect(uploadPromise).rejects.toThrow("Not found");
      vi.useRealTimers();
    });

    it("should handle Directory NotFoundError in resolveFileHandle", async () => {
      const error = new Error("Not found");
      error.name = "NotFoundError";
      mockRootHandle.getDirectoryHandle.mockRejectedValue(error);

      await expect(backend.download("sub/file.md")).rejects.toThrow(
        "File not found",
      );
    });

    it("should handle scan entry failure", async () => {
      const mockFileEntry = {
        kind: "file",
        name: "fail.md",
        getFile: vi.fn().mockRejectedValue(new Error("IO Error")),
      };

      mockRootHandle[Symbol.asyncIterator] = vi.fn().mockReturnValue({
        entries: [["fail.md", mockFileEntry]][Symbol.iterator](),
        async next() {
          const result = this.entries.next();
          return result.done
            ? { done: true }
            : { value: result.value, done: false };
        },
      });

      await expect(backend.scan("v1")).rejects.toThrow("IO Error");
    });
  });
});
