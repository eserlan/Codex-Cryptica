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
            requestAccessToken: vi.fn(({ prompt }) => {
              // Standard GIS behavior: callback is triggered after interaction or check
              if (prompt === "none") {
                config.callback({ access_token: "refreshed-token" } as any);
              } else {
                config.callback({ access_token: "test-token" } as any);
              }
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

    await backend.connect("");
    const profile = await backend.getUserProfile();

    expect(profile.email).toBe("test@example.com");
    expect(fetch).toHaveBeenCalledWith(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      expect.any(Object),
    );
  });

  it("should implement upload and download", async () => {
    (fetch as any).mockImplementation(async (url: string) => {
      if (url.includes("files?q"))
        return {
          ok: true,
          json: async () => ({ files: [{ id: "folder-id" }] }),
        };
      if (url.includes("changes/startPageToken"))
        return { ok: true, json: async () => ({ startPageToken: "token" }) };
      if (url.includes("upload"))
        return {
          ok: true,
          json: async () => ({
            id: "file-id",
            modifiedTime: new Date().toISOString(),
          }),
        };
      if (url.includes("alt=media"))
        return { ok: true, blob: async () => new Blob(["hello"]) };
      return { ok: true, json: async () => ({ files: [] }) };
    });

    await backend.scan("test-vault");
    const metadata = await backend.upload("test.md", new Blob(["hello"]));
    expect(metadata.handle).toBe("file-id");

    const blob = await backend.download("test.md", "file-id");
    expect(await blob.text()).toBe("hello");
  });

  it("should retry on transient 5xx errors", async () => {
    vi.useFakeTimers();
    let calls = 0;
    (fetch as any).mockImplementation(async (url: string) => {
      if (url.includes("upload")) {
        calls++;
        if (calls === 1) return { ok: false, status: 500 };
        return { ok: true, json: async () => ({ id: "success-id" }) };
      }
      if (url.includes("files?q"))
        return {
          ok: true,
          json: async () => ({ files: [{ id: "folder-id" }] }),
        };
      if (url.includes("changes/startPageToken"))
        return { ok: true, json: async () => ({ startPageToken: "token" }) };
      return { ok: true, json: async () => ({ files: [] }) };
    });

    await backend.scan("test-vault");
    const promise = backend.upload("test.md", new Blob(["hello"]));

    await vi.runAllTimersAsync();
    const metadata = await promise;
    expect(metadata.handle).toBe("success-id");
    expect(calls).toBe(2);
    vi.useRealTimers();
  });

  it("should refresh token on 401 errors", async () => {
    // Initial connect with explicit prompt to set access token
    await backend.connect("");

    let calls = 0;
    (fetch as any).mockImplementation(async (url: string) => {
      if (url.includes("userinfo")) {
        calls++;
        if (calls === 1) return { ok: false, status: 401 };
        return { ok: true, json: async () => ({ email: "new@example.com" }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    const profile = await backend.getUserProfile();
    expect(profile.email).toBe("new@example.com");
    // Only initialized once
    expect(google.accounts.oauth2.initTokenClient).toHaveBeenCalledTimes(1);
  });

  it("should create nested folders recursively", async () => {
    (fetch as any).mockImplementation(async (url: string) => {
      if (url.includes("files?q")) {
        if (url.includes("CodexCryptica"))
          return {
            ok: true,
            json: async () => ({ files: [{ id: "root-id" }] }),
          };
        if (url.includes("vault-1"))
          return {
            ok: true,
            json: async () => ({ files: [{ id: "vault-id" }] }),
          };
        return { ok: true, json: async () => ({ files: [] }) }; // subfolder not found
      }
      if (url.includes("changes/startPageToken"))
        return { ok: true, json: async () => ({ startPageToken: "token" }) };
      return { ok: true, json: async () => ({ id: "new-id" }) }; // creation or upload
    });

    await backend.scan("vault-1");
    await backend.upload("sub/file.md", new Blob(["content"]));

    const uploadCall = vi
      .mocked(fetch)
      .mock.calls.find((c) => c[0].includes("upload"));
    expect(uploadCall).toBeDefined();
    // The parent folder creation should have happened
    const folderCreationCall = vi
      .mocked(fetch)
      .mock.calls.find(
        (c) =>
          c[0].includes("files") &&
          c[1]?.method === "POST" &&
          JSON.parse(c[1]?.body as string).name === "sub",
      );
    expect(folderCreationCall).toBeDefined();
  });
});
