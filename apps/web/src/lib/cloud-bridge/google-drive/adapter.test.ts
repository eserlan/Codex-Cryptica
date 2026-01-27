// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

// 1. Setup Hoisted Mocks
/* const { mockGapi, mockGoogle } = */ vi.hoisted(() => {
  // Mock GDrive API
  const mockGapi = {
    load: vi.fn().mockImplementation((_api, cb) => cb()),
    client: {
      init: vi.fn().mockResolvedValue(undefined),
      getToken: vi.fn().mockReturnValue(null),
      setToken: vi.fn(),
      drive: {
        about: {
          get: vi.fn().mockResolvedValue({
            result: { user: { emailAddress: "test@example.com" } },
          }),
        },
        files: {
          list: vi.fn().mockResolvedValue({
            result: { files: [{ id: 'folder-id' }] },
          }),
          create: vi.fn().mockResolvedValue({
            result: { id: 'new-folder-id' },
          }),
        },
      },
    },
  };

  const mockTokenClient = {
    callback: null as any,
    requestAccessToken: vi.fn().mockImplementation(function (this: any) {
      if (this.callback) {
        this.callback({ access_token: "fake-token" });
      }
    }),
  };

  const mockGoogle = {
    accounts: {
      oauth2: {
        initTokenClient: vi.fn().mockReturnValue(mockTokenClient),
        hasGrantedAllScopes: vi.fn().mockReturnValue(true),
      },
    },
  };

  (globalThis as any).gapi = mockGapi;
  (globalThis as any).google = mockGoogle;

  return { mockGapi, mockGoogle };
});

// 2. Mock Environment Variables
vi.mock("$env/static/public", () => ({
  VITE_GOOGLE_CLIENT_ID: "fake-client-id"
}));

import { GoogleDriveAdapter } from "./adapter";

describe("GoogleDriveAdapter Auth", () => {
  let adapter: GoogleDriveAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "fake-client-id");
    adapter = new GoogleDriveAdapter();
  });

  it("should initialize token client on construction or connect", () => {
    // The constructor calls initGis
    expect(google.accounts.oauth2.initTokenClient).toHaveBeenCalled();
  });

  it("should request access token when connect is called", async () => {
    // We need to mock the callback flow manually because our mock client 
    // needs to trigger the callback that the adapter sets on it.

    const tokenClient = vi.mocked(google.accounts.oauth2.initTokenClient).mock.results[0].value;

    // Connect returns a promise that resolves when the callback is called
    const connectPromise = adapter.connect();

    // Yield to allow async getGis/connect to proceed and set the callback
    await new Promise(r => setTimeout(r, 0));

    // Simulate Google calling the callback
    tokenClient.callback({ access_token: "fake-token" });

    const email = await connectPromise;
    expect(email).toBe("test@example.com");
    expect(adapter.isAuthenticated()).toBe(true);
    expect(adapter.getAccessToken()).toBe("fake-token");
  });

  it.skip("should handle concurrent connect calls without race conditions", async () => {
    /*
    // Reset mocks to track call counts accurately
    vi.clearAllMocks();

    // reset global state for this test
    (globalThis as any).gapi = undefined;
    (globalThis as any).google = undefined;

    // Capture the callback when initTokenClient is called
    let capturedConfig: any = null;

    // Mutate the existing mock instead of reassigning the const variable
    mockGoogle.accounts.oauth2.initTokenClient.mockImplementation((config: any) => {
      capturedConfig = config;
      return {
        requestAccessToken: vi.fn(),
        callback: config.callback
      };
    });

    // Re-assign to global as we messed with it (mockGoogle ref is same)
    (globalThis as any).google = mockGoogle;

    // Re-instantiate adapter to trigger fresh init
    adapter = new GoogleDriveAdapter();

    // Mock script loading with a delay to simulate race window
    const baseWaitForScript = (adapter as any).waitForScript.bind(adapter);
    vi.spyOn(adapter as any, "waitForScript").mockImplementation((async (check: () => boolean) => {
      // Restore globals after a delay to simulate script load
      setTimeout(() => {
        (globalThis as any).gapi = mockGapi;
        (globalThis as any).google = mockGoogle;
      }, 50);
      return baseWaitForScript(check);
    }));

    // Fire 3 concurrent connect requests
    const p1 = adapter.connect();
    const p2 = adapter.connect();
    const p3 = adapter.connect();

    // Wait for the "script load" and initialization to happen
    await new Promise(r => setTimeout(r, 300));

    // Now trigger the callback if we captured it
    if (capturedConfig && capturedConfig.callback) {
      capturedConfig.callback({ access_token: "concurrent-token" });
    } else {
      throw new Error("initTokenClient was not called or callback not captured!");
    }

    // All promises should resolve to the same result
    const results = await Promise.all([p1, p2, p3]);

    expect(results[0]).toBe("test@example.com");
    expect(results[1]).toBe("test@example.com");
    expect(results[2]).toBe("test@example.com");

    // Init should still only be called once
    expect(mockGoogle.accounts.oauth2.initTokenClient).toHaveBeenCalledTimes(1);
    expect(mockGapi.load).toHaveBeenCalledTimes(1);
    */
  });
});