import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleDriveAdapter } from './adapter';

// Mock the global google object
const mockTokenClient = {
  callback: null as any,
  requestAccessToken: vi.fn(),
};

const mockGoogle = {
  accounts: {
    oauth2: {
      initTokenClient: vi.fn().mockReturnValue(mockTokenClient),
      hasGrantedAllScopes: vi.fn().mockReturnValue(true),
    },
  },
};

const mockGapi = {
  load: vi.fn((name, cb) => cb()),
  client: {
    init: vi.fn().mockResolvedValue({}),
    getToken: vi.fn().mockReturnValue(null),
  },
};

vi.stubGlobal('google', mockGoogle);
vi.stubGlobal('gapi', mockGapi);

describe('GoogleDriveAdapter Auth', () => {
  let adapter: GoogleDriveAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new GoogleDriveAdapter();
  });

  it('should initialize token client on construction or connect', () => {
    expect(mockGoogle.accounts.oauth2.initTokenClient).toHaveBeenCalled();
  });

  it('should request access token when connect is called', async () => {
    const connectPromise = adapter.connect();
    
    // Simulate callback
    expect(mockTokenClient.requestAccessToken).toHaveBeenCalled();
    // In connect(), the callback is reassigned on the tokenClient
    mockTokenClient.callback({ access_token: 'fake-token' });

    await connectPromise;
    expect(adapter.isAuthenticated()).toBe(true);
  });
});
