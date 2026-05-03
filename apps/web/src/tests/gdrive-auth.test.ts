import { describe, it, expect, vi, beforeEach } from "vitest";
import { GDriveAuthService } from "../lib/services/gdrive-auth";

describe("GDriveAuthService", () => {
  let service: GDriveAuthService;
  let mockTokenClient: any;

  beforeEach(() => {
    vi.resetModules();

    mockTokenClient = {
      requestAccessToken: vi.fn(),
    };

    // Mock global google object
    (global as any).google = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn().mockImplementation(({ callback }) => {
            // Store the callback to trigger it manually in tests
            (global as any)._gisCallback = callback;
            return mockTokenClient;
          }),
          revoke: vi.fn().mockImplementation((_token, callback) => callback()),
        },
      },
    };

    service = new GDriveAuthService();
  });

  it("should initialize the token client and request access token", async () => {
    const tokenPromise = service.getAccessToken();

    // Give microtasks a chance to run so _gisCallback is set
    await vi.waitFor(() => expect((global as any)._gisCallback).toBeDefined());

    // Trigger the GIS callback
    const callback = (global as any)._gisCallback;
    callback({ access_token: "test-token", expires_in: "3600" });

    const token = await tokenPromise;
    expect(token).toBe("test-token");
    expect(google.accounts.oauth2.initTokenClient).toHaveBeenCalled();
    expect(mockTokenClient.requestAccessToken).toHaveBeenCalled();
  });

  it("should return cached token if not expired", async () => {
    // First request to populate cache
    const tokenPromise1 = service.getAccessToken();
    await vi.waitFor(() => expect((global as any)._gisCallback).toBeDefined());
    (global as any)._gisCallback({
      access_token: "cached-token",
      expires_in: "3600",
    });
    await tokenPromise1;

    // Second request should use cache
    const token = await service.getAccessToken();
    expect(token).toBe("cached-token");
    expect(mockTokenClient.requestAccessToken).toHaveBeenCalledTimes(1);
  });

  it("should request new token if cached one is about to expire", async () => {
    // First request with short expiry
    const tokenPromise1 = service.getAccessToken();
    await vi.waitFor(() => expect((global as any)._gisCallback).toBeDefined());
    (global as any)._gisCallback({
      access_token: "old-token",
      expires_in: "30",
    }); // 30s < 60s threshold
    const token1 = await tokenPromise1;
    expect(token1).toBe("old-token");

    // Second request should trigger a new one
    const tokenPromise2 = service.getAccessToken();

    // IMPORTANT: Wait for the implementation to reach the point where it's waiting for a token
    // (i.e. it has pushed to the resolvers queue)
    await vi.waitFor(() => expect((service as any).resolvers.length).toBe(1));

    // Now trigger the callback for the new token
    (global as any)._gisCallback({
      access_token: "new-token",
      expires_in: "3600",
    });

    const token2 = await tokenPromise2;

    expect(token2).toBe("new-token");
    expect(mockTokenClient.requestAccessToken).toHaveBeenCalledTimes(2);
  });

  it("should clear token on signOut", async () => {
    // Get a token
    const tokenPromise = service.getAccessToken();
    await vi.waitFor(() => expect((global as any)._gisCallback).toBeDefined());
    (global as any)._gisCallback({
      access_token: "test-token",
      expires_in: "3600",
    });
    await tokenPromise;

    // Sign out
    await service.signOut();
    expect(google.accounts.oauth2.revoke).toHaveBeenCalledWith(
      "test-token",
      expect.any(Function),
    );

    // Next request should trigger new token
    const tokenPromise2 = service.getAccessToken();

    // Wait for implementation to reach the resolver queue
    await vi.waitFor(() => expect((service as any).resolvers.length).toBe(1));

    (global as any)._gisCallback({
      access_token: "new-token",
      expires_in: "3600",
    });

    await tokenPromise2;
    expect(mockTokenClient.requestAccessToken).toHaveBeenCalledTimes(2);
  });
});
