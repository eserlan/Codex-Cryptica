import { describe, it, expect, vi, beforeEach } from "vitest";
import { GDriveBackend } from "../../src/GDriveBackend";

describe("GDriveBackend", () => {
  let backend: GDriveBackend;

  beforeEach(() => {
    backend = new GDriveBackend("test-client-id");
    global.fetch = vi.fn();
    global.google = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn().mockImplementation((config) => ({
            requestAccessToken: vi.fn(() => {
              config.callback({ access_token: "test-token" });
            }),
          })),
        },
      },
    } as any;
  });

  it("should connect and get user profile", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ email: "test@example.com", name: "Test User" }),
    });

    await backend.connect();
    const profile = await backend.getUserProfile();

    expect(profile.email).toBe("test@example.com");
    expect(fetch).toHaveBeenCalledWith(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      expect.any(Object),
    );
  });

  it("should implement upload and download", async () => {
    // Mock folder resolution
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ files: [{ id: "root-id" }] }),
    });
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ files: [{ id: "vault-id" }] }),
    });
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ files: [] }),
    });
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ startPageToken: "token" }),
    });

    await backend.scan("test-vault");

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "file-id",
          modifiedTime: new Date().toISOString(),
        }),
    });

    const metadata = await backend.upload("test.md", new Blob(["hello"]));
    expect(metadata.handle).toBe("file-id");

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob(["hello"])),
    });

    const blob = await backend.download("test.md", "file-id");
    expect(await blob.text()).toBe("hello");
  });
});
