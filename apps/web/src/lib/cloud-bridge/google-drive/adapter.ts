import type { ICloudAdapter, RemoteFileMeta } from "../index";

const getGoogleConfig = () => ({
  CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  SCOPES: "https://www.googleapis.com/auth/drive.file",
  DISCOVERY_DOC: "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
});

const TOKEN_STORAGE_KEY = "codex-arcana-gdrive-token";

interface CachedToken {
  resp: google.accounts.oauth2.TokenResponse;
  expires_at: number; // timestamp
}

export class GoogleDriveAdapter implements ICloudAdapter {
  private tokenClient!: google.accounts.oauth2.TokenClient;
  private accessToken: string | null = null;
  private gapiInited = false;
  private gisInited = false;

  private gapiInitPromise: Promise<void> | null = null;
  private gisInitPromise: Promise<void> | null = null;

  constructor() {
    this.getGis();
    this.getGapi();
  }

  private async waitForScript(check: () => boolean, timeout = 10000): Promise<boolean> {
    const start = Date.now();
    while (!check()) {
      if (Date.now() - start > timeout) return false;
      await new Promise((r) => setTimeout(r, 100));
    }
    return true;
  }

  private getGis(): Promise<void> {
    if (this.gisInitPromise) return this.gisInitPromise;
    this.gisInitPromise = (async () => {


      // Wait for google.accounts to be loaded
      const loaded = await this.waitForScript(() => typeof google !== "undefined" && !!google.accounts);
      if (!loaded) {
        console.warn("Google Identity Services script failed to load");
        return;
      }

      if (typeof google !== "undefined" && google.accounts) {
        const { CLIENT_ID, SCOPES } = getGoogleConfig();
        if (!CLIENT_ID) {
          console.warn("VITE_GOOGLE_CLIENT_ID is missing. Google Drive integration disabled.");
          return;
        }
        this.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (resp: google.accounts.oauth2.TokenResponse) => {
            if (resp.error) {
              throw resp;
            }
            this.accessToken = resp.access_token;
          },
        });
        this.gisInited = true;
      }
    })();
    return this.gisInitPromise;
  }

  isConfigured(): boolean {
    return !!getGoogleConfig().CLIENT_ID;
  }

  private getGapi(): Promise<void> {
    if (this.gapiInitPromise) return this.gapiInitPromise;
    this.gapiInitPromise = (async () => {
      // Wait for gapi to be loaded
      const loaded = await this.waitForScript(() => typeof gapi !== "undefined");
      if (!loaded) {
        console.warn("Google API script failed to load");
        return;
      }

      if (typeof gapi !== "undefined") {
        await new Promise<void>((resolve) => gapi.load("client", resolve));
        await gapi.client.init({
          discoveryDocs: [getGoogleConfig().DISCOVERY_DOC],
        });
        this.gapiInited = true;

        // Try to restore cached token
        this.restoreCachedToken();
      }
    })();
    return this.gapiInitPromise;
  }

  // Method needed for restoration access
  private restoreCachedToken(): boolean {
    try {
      const cached = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!cached) return false;

      const tokenData: CachedToken = JSON.parse(cached);

      // Check if token is still valid (with 5 min buffer)
      if (tokenData.expires_at < Date.now() + 5 * 60 * 1000) {
        console.log("[GDriveAdapter] Cached token expired, removing");
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        return false;
      }

      console.log("[GDriveAdapter] Restoring cached token");
      this.accessToken = tokenData.resp.access_token;

      if (gapi.client) {
        gapi.client.setToken(tokenData.resp);
      }
      return true;
    } catch (e) {
      console.warn("[GDriveAdapter] Failed to restore cached token:", e);
      return false;
    }
  }

  private cacheToken(resp: google.accounts.oauth2.TokenResponse) {
    const expiresIn = Number(resp.expires_in) || 3600;
    const tokenData: CachedToken = {
      resp,
      expires_at: Date.now() + expiresIn * 1000,
    };
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
    console.log("[GDriveAdapter] Token cached, expires in", expiresIn, "seconds");
  }

  async connect(): Promise<string> {
    if (!this.gisInited) await this.getGis();
    if (!this.gapiInited) await this.getGapi();

    return new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        reject(new Error("Google Identity Services not initialized (missing Client ID?)"));
        return;
      }
      (this.tokenClient as any).callback = async (
        resp: google.accounts.oauth2.TokenResponse,
      ) => {
        if (resp.error) {
          reject(resp);
          return;
        }
        this.accessToken = resp.access_token;

        // Cache full token for persistence
        this.cacheToken(resp);

        // Explicitly set the token in gapi so it's globally available to workerBridge
        if (typeof gapi !== 'undefined' && gapi.client) {
          gapi.client.setToken(resp);
        }

        try {          // 1. Get user info
          const about = await gapi.client.drive.about.get({
            fields: "user(emailAddress)",
          });
          const email = about.result.user?.emailAddress || "connected-user";

          // 2. Ensure CodexArcana folder exists
          let folderId = await this.getFolderId();
          if (!folderId) {
            folderId = await this.createFolder("CodexArcana");
          }

          // Store folder ID in localStorage scoped to the current user
          const storageKey = `gdrive_folder_id:${email}`;
          localStorage.setItem(storageKey, folderId);

          resolve(email);
        } catch (e) {
          console.error("Failed to complete GDrive setup", e);
          reject(e instanceof Error ? e : new Error("Failed to complete GDrive setup"));
        }
      };

      if (gapi.client.getToken() === null) {
        this.tokenClient.requestAccessToken({ prompt: "consent" });
      } else {
        this.tokenClient.requestAccessToken({ prompt: "" });
      }
    });
  }

  private async getFolderId(): Promise<string | null> {
    const response = await gapi.client.drive.files.list({
      q: "name = 'CodexArcana' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: "files(id)",
    });
    const files = response.result.files || [];

    if (files.length === 0) return null;
    if (files.length === 1) return files[0].id!;

    console.warn(`Multiple "CodexArcana" folders found (${files.length}). Using the first one found.`);
    return files[0].id!;
  }

  private async createFolder(name: string): Promise<string> {
    const response = await gapi.client.drive.files.create({
      resource: {
        name: name,
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    });
    return response.result.id!;
  }

  getAccessToken(): string | null {
    return this.accessToken || gapi.client.getToken()?.access_token || null;
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  async disconnect(): Promise<void> {
    const token = gapi.client.getToken();
    if (token !== null) {
      google.accounts.oauth2.revoke(token.access_token, () => { });
      gapi.client.setToken(null);
      this.accessToken = null;
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem('gdrive_folder_id');
    }
  }

  async listFiles(): Promise<Map<string, RemoteFileMeta>> {
    if (!this.accessToken) throw new Error("Not authenticated");

    // Get the email from GAPI to build the key
    const about = await gapi.client.drive.about.get({ fields: 'user(emailAddress)' });
    const email = about.result.user?.emailAddress;
    const storageKey = `gdrive_folder_id:${email}`;

    const folderId = localStorage.getItem(storageKey);
    if (!folderId) throw new Error("No sync folder found. Reconnect requested.");

    const response = await gapi.client.drive.files.list({
      pageSize: 1000,
      fields: "files(id, name, mimeType, modifiedTime, parents, appProperties)",
      q: `'${folderId}' in parents and trashed = false`,
    });

    const fileMap = new Map<string, RemoteFileMeta>();
    const files = response.result.files;

    if (files && files.length > 0) {
      for (const file of files) {
        if (file.name && file.id) {
          fileMap.set(file.name, {
            id: file.id,
            name: file.name,
            mimeType: file.mimeType || "",
            modifiedTime: file.modifiedTime || "",
            parents: file.parents || [],
          });
        }
      }
    }
    return fileMap;
  }

  async uploadFile(
    _path: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    _content: string | Blob, // eslint-disable-line @typescript-eslint/no-unused-vars
    _existingId?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<RemoteFileMeta> {
    if (!this.accessToken) throw new Error("Not authenticated");
    // Simplified upload logic for MVP
    // Real impl needs multipart upload for metadata + content
    throw new Error("Not implemented");
  }

  async downloadFile(fileId: string): Promise<string> {
    if (!this.accessToken) throw new Error("Not authenticated");
    const response = await gapi.client.drive.files.get({
      fileId: fileId,
      alt: "media",
    });
    return response.body;
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.accessToken) throw new Error("Not authenticated");
    await gapi.client.drive.files.delete({ fileId: fileId });
  }
}
