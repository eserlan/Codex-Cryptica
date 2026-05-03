import { describe, it, expect, vi, beforeEach } from "vitest";
import { GDriveAuthService } from "../lib/services/gdrive-auth";

describe("GDriveAuthService", () => {
  let service: GDriveAuthService;
  let mockTokenClient: any;

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client-id");
    Object.assign(import.meta.env, { VITE_GOOGLE_CLIENT_ID: "test-client-id" });

    mockTokenClient = {
      requestAccessToken: vi.fn(),
    };

    const mockGoogle = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn().mockImplementation(({ callback }) => {
            (globalThis as any)._gisCallback = callback;
            return mockTokenClient;
          }),
          revoke: vi.fn().mockImplementation((_token, callback) => callback()),
        },
      },
    };

    (globalThis as any).google = mockGoogle;
    if (typeof window !== "undefined") {
      (window as any).google = mockGoogle;
    }

    service = new GDriveAuthService();
  });

  it("should initialize the token client and request access token", async () => {
    const tokenPromise = service.getAccessToken();

    // Trigger the GIS callback immediately or wait
    await vi.waitFor(() => expect((service as any).resolvers.length).toBe(1));
    const callback = (globalThis as any)._gisCallback;
    callback({ access_token: "test-token", expires_in: "3600" });

    const token = await tokenPromise;
    expect(token).toBe("test-token");
    expect(mockTokenClient.requestAccessToken).toHaveBeenCalled();
  });

  it("should return cached token if not expired", async () => {
    const tokenPromise1 = service.getAccessToken();
    await vi.waitFor(() => expect((service as any).resolvers.length).toBe(1));
    (globalThis as any)._gisCallback({
      access_token: "cached-token",
      expires_in: "3600",
    });
    await tokenPromise1;

    const token = await service.getAccessToken();
    expect(token).toBe("cached-token");
    expect(mockTokenClient.requestAccessToken).toHaveBeenCalledTimes(1);
  });

  it("should request new token if cached one is about to expire", async () => {
    const tokenPromise1 = service.getAccessToken();
    await vi.waitFor(() => expect((service as any).resolvers.length).toBe(1));
    (globalThis as any)._gisCallback({
      access_token: "old-token",
      expires_in: "30",
    });
    await tokenPromise1;

    const tokenPromise2 = service.getAccessToken();
    await vi.waitFor(() => expect((service as any).resolvers.length).toBe(1));
    (globalThis as any)._gisCallback({
      access_token: "new-token",
      expires_in: "3600",
    });
    const token2 = await tokenPromise2;

    expect(token2).toBe("new-token");
    expect(mockTokenClient.requestAccessToken).toHaveBeenCalledTimes(2);
  });

  it("should clear token on signOut", async () => {
    const tokenPromise = service.getAccessToken();
    await vi.waitFor(() => expect((service as any).resolvers.length).toBe(1));
    (globalThis as any)._gisCallback({
      access_token: "test-token",
      expires_in: "3600",
    });
    await tokenPromise;

    await service.signOut();

    const tokenPromise2 = service.getAccessToken();
    await vi.waitFor(() => expect((service as any).resolvers.length).toBe(1));
    (globalThis as any)._gisCallback({
      access_token: "new-token",
      expires_in: "3600",
    });

    await tokenPromise2;
    expect(mockTokenClient.requestAccessToken).toHaveBeenCalledTimes(2);
  });
});
