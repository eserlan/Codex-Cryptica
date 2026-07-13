import { describe, it, expect, vi, beforeEach } from "vitest";
import { GDriveAuthService } from "../src/gdrive-auth";

describe("GDriveAuthService", () => {
  let service: GDriveAuthService;
  let mockTokenClient: any;
  let mockTokenClients: any[];
  let callbacksByScope: Map<string, (response: any) => void>;
  let scopes: string[];
  const driveFileScope = "https://www.googleapis.com/auth/drive.file";
  const driveMetadataReadonlyScope =
    "https://www.googleapis.com/auth/drive.metadata.readonly";

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client-id");
    Object.assign(import.meta.env, { VITE_GOOGLE_CLIENT_ID: "test-client-id" });

    mockTokenClients = [];
    callbacksByScope = new Map();
    scopes = [];

    const mockGoogle = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn().mockImplementation(({ scope, callback }) => {
            const client = {
              requestAccessToken: vi.fn(),
            };
            mockTokenClients.push(client);
            scopes.push(scope);
            (globalThis as any)._gisCallback = callback;
            callbacksByScope.set(scope, callback);
            mockTokenClient = client;
            return client;
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

  it("should request scoped tokens with the requested scope", async () => {
    const tokenPromise = service.getTokenWithScope(driveMetadataReadonlyScope);

    await vi.waitFor(() => {
      expect(callbacksByScope.has(driveMetadataReadonlyScope)).toBe(true);
      expect((service as any).resolvers.length).toBe(1);
    });
    callbacksByScope.get(driveMetadataReadonlyScope)?.({
      access_token: "metadata-token",
      expires_in: "3600",
    });

    await expect(tokenPromise).resolves.toBe("metadata-token");
    expect(scopes).toEqual([driveMetadataReadonlyScope]);
    expect(mockTokenClient.requestAccessToken).toHaveBeenCalledWith({
      prompt: "consent",
    });
  });

  it("should renew tokens with the active scoped token client", async () => {
    const scopedTokenPromise = service.getTokenWithScope(
      driveMetadataReadonlyScope,
    );
    await vi.waitFor(() => {
      expect(callbacksByScope.has(driveMetadataReadonlyScope)).toBe(true);
      expect((service as any).resolvers.length).toBe(1);
    });
    callbacksByScope.get(driveMetadataReadonlyScope)?.({
      access_token: "metadata-token",
      expires_in: "30",
    });
    await scopedTokenPromise;

    const renewedTokenPromise = service.getAccessToken();
    await vi.waitFor(() => {
      expect(mockTokenClients[0].requestAccessToken).toHaveBeenCalledTimes(2);
      expect((service as any).resolvers.length).toBe(1);
    });
    callbacksByScope.get(driveMetadataReadonlyScope)?.({
      access_token: "renewed-metadata-token",
      expires_in: "3600",
    });

    await expect(renewedTokenPromise).resolves.toBe("renewed-metadata-token");
    expect(scopes).toEqual([driveMetadataReadonlyScope]);
    expect(mockTokenClients[0].requestAccessToken).toHaveBeenLastCalledWith({
      prompt: "",
    });
  });

  it("should reset token renewal scope after signOut", async () => {
    const scopedTokenPromise = service.getTokenWithScope(
      driveMetadataReadonlyScope,
    );
    await vi.waitFor(() => {
      expect(callbacksByScope.has(driveMetadataReadonlyScope)).toBe(true);
      expect((service as any).resolvers.length).toBe(1);
    });
    callbacksByScope.get(driveMetadataReadonlyScope)?.({
      access_token: "metadata-token",
      expires_in: "3600",
    });
    await scopedTokenPromise;

    await service.signOut();

    const tokenPromise = service.getAccessToken();
    await vi.waitFor(() => {
      expect(callbacksByScope.has(driveFileScope)).toBe(true);
      expect((service as any).resolvers.length).toBe(1);
    });
    callbacksByScope.get(driveFileScope)?.({
      access_token: "drive-file-token",
      expires_in: "3600",
    });

    await expect(tokenPromise).resolves.toBe("drive-file-token");
    expect(scopes).toEqual([driveMetadataReadonlyScope, driveFileScope]);
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
