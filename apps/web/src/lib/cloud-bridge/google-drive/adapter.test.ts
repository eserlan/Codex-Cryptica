// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

// 1. Setup Hoisted Mocks
vi.hoisted(() => {
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
    requestAccessToken: vi.fn().mockImplementation(function(this: any) {
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
});

// 2. Mock Environment Variables
vi.mock("$env/static/public", () => ({
  VITE_GOOGLE_CLIENT_ID: "fake-client-id"
}));

// Set manually for import.meta.env
if (!import.meta.env) {
  (import.meta as any).env = {};
}
import.meta.env.VITE_GOOGLE_CLIENT_ID = "fake-client-id";

import { GoogleDriveAdapter } from "./adapter";

describe("GoogleDriveAdapter Auth", () => {
  let adapter: GoogleDriveAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
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
    
    // Simulate Google calling the callback
    tokenClient.callback({ access_token: "fake-token" });

    const email = await connectPromise;
    expect(email).toBe("test@example.com");
    expect(adapter.isAuthenticated()).toBe(true);
    expect(adapter.getAccessToken()).toBe("fake-token");
  });
});