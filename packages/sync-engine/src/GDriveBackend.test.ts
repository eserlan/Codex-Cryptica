import { describe, it, expect, vi, beforeEach } from "vitest";
import { GDriveBackend, DriveError } from "./GDriveBackend";
import { type IGDriveAuthService } from "./types";

describe("GDriveBackend", () => {
  let backend: GDriveBackend;
  let mockAuthService: IGDriveAuthService;
  const vaultId = "test-vault";
  const folderId = "test-folder-id";

  beforeEach(() => {
    mockAuthService = {
      getAccessToken: vi.fn().mockResolvedValue("test-token"),
      signOut: vi.fn().mockResolvedValue(undefined),
    };
    backend = new GDriveBackend(
      mockAuthService,
      vaultId,
      vi.fn().mockResolvedValue(undefined),
    );
    backend.setVaultFolderId(folderId);

    // Mock global fetch
    global.fetch = vi.fn();

    // Mock FileReader
    (global as any).FileReader = class {
      onload: any;
      result: any;
      readAsDataURL(_blob: Blob) {
        this.result = "data:application/octet-stream;base64,dGVzdCBjb250ZW50"; // "test content" in base64
        setTimeout(() => this.onload(), 0);
      }
    };
  });

  describe("connect", () => {
    it("should validate folder access successfully", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ id: folderId, name: "Vault", trashed: false }),
      });

      await backend.connect();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/files/${folderId}`),
        expect.any(Object),
      );
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].headers).toBeInstanceOf(Headers);
      expect(callArgs[1].headers.get("Authorization")).toBe(
        "Bearer test-token",
      );
    });

    it("should throw DriveError if folder not found", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(backend.connect()).rejects.toThrow(DriveError);
    });
  });

  describe("scan", () => {
    it("should list files in the folder and handle pagination", async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              files: [
                {
                  id: "file1",
                  name: "test1.md",
                  modifiedTime: "2023-01-01T00:00:00Z",
                  size: "123",
                },
              ],
              nextPageToken: "token123",
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              files: [
                {
                  id: "file2",
                  name: "test2.md",
                  modifiedTime: "2023-01-02T00:00:00Z",
                  size: "456",
                },
              ],
              nextPageToken: undefined,
            }),
        });

      const result = await backend.scan(vaultId);
      expect(result.files).toHaveLength(2);
      expect(result.files[0].path).toBe("test1.md");
      expect(result.files[0].handle).toBe("file1");
      expect(result.files[1].path).toBe("test2.md");
      expect(result.files[1].handle).toBe("file2");
      expect((result as any).nextToken).toBeUndefined();
    });

    it("should recursively scan subfolders", async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              files: [
                {
                  id: "folder1",
                  name: "NPCs",
                  mimeType: "application/vnd.google-apps.folder",
                },
                {
                  id: "file-root",
                  name: "root.md",
                  modifiedTime: "2023-01-01T00:00:00Z",
                  size: "100",
                },
              ],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              files: [
                {
                  id: "file-nested",
                  name: "Bob.md",
                  modifiedTime: "2023-01-02T00:00:00Z",
                  size: "200",
                },
              ],
            }),
        });

      const result = await backend.scan(vaultId);
      expect(result.files).toHaveLength(2);
      expect(result.files[0].path).toBe("NPCs/Bob.md");
      expect(result.files[0].handle).toBe("file-nested");
      expect(result.files[1].path).toBe("root.md");
      expect(result.files[1].handle).toBe("file-root");
    });
  });

  describe("download", () => {
    it("should download file content as Blob", async () => {
      const blob = new Blob(["test content"]);
      (global.fetch as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(blob),
      });

      const result = await backend.download("test.md", "file1");
      expect(result).toBeInstanceOf(Blob);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/files/file1?alt=media"),
        expect.any(Object),
      );
    });
  });

  describe("upload", () => {
    it("should perform multipart POST for new files", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "new-file-id" }),
      });

      const content = new Blob(["test content"]);
      const result = await backend.upload("new.md", content);

      expect(result.handle).toBe("new-file-id");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/upload/drive/v3/files?uploadType=multipart"),
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    it("should perform PATCH for existing files", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "file1" }),
      });

      const content = new Blob(["updated content"]);
      await backend.upload("test.md", content, "file1");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/upload/drive/v3/files/file1?uploadType=multipart",
        ),
        expect.objectContaining({
          method: "PATCH",
        }),
      );
    });
  });

  describe("delete", () => {
    it("should call DELETE on the file ID", async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });

      await backend.delete("test.md", "file1");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/files/file1"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  describe("retry logic", () => {
    it("should retry once on 401 Unauthorized after calling signOut", async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: false, status: 401 })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: folderId }),
        });

      await backend.connect();

      expect(mockAuthService.signOut).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("should retry once on 500 Internal Server Error", async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: folderId }),
        });

      await backend.connect();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("injected fetcher", () => {
    it("uses the injected fetcher instead of the global fetch", async () => {
      const injected = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: folderId, trashed: false }),
      });
      const isolated = new GDriveBackend(
        mockAuthService,
        vaultId,
        vi.fn().mockResolvedValue(undefined),
        injected as any,
      );
      isolated.setVaultFolderId(folderId);

      await isolated.connect();

      expect(injected).toHaveBeenCalledOnce();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
