import type { ICloudAdapter, RemoteFileMeta } from "../index";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = "https://www.googleapis.com/auth/drive.file";
const DISCOVERY_DOC =
  "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest";

export class GoogleDriveAdapter implements ICloudAdapter {
  private tokenClient!: google.accounts.oauth2.TokenClient;
  private accessToken: string | null = null;
  private gapiInited = false;
  private gisInited = false;

  constructor() {
    this.initGis();
    this.initGapi();
  }

  private initGis() {
    if (typeof google !== "undefined" && google.accounts) {
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
  }

  isConfigured(): boolean {
    return !!CLIENT_ID;
  }

  private async initGapi() {
    // Wait for gapi to be loaded
    if (typeof gapi !== "undefined") {
      await new Promise<void>((resolve) => gapi.load("client", resolve));
      await gapi.client.init({
        discoveryDocs: [DISCOVERY_DOC],
      });
      this.gapiInited = true;
    }
  }

  async connect(): Promise<string> {
    if (!this.gisInited) this.initGis();
    if (!this.gapiInited) await this.initGapi();

    return new Promise((resolve, reject) => {
      (this.tokenClient as any).callback = async (
        resp: google.accounts.oauth2.TokenResponse,
      ) => {
        if (resp.error) {
          reject(resp);
          return;
        }
        this.accessToken = resp.access_token;

        try {
          const about = await gapi.client.drive.about.get({
            fields: "user(emailAddress)",
          });
          const email = about.result.user?.emailAddress || "connected-user";
          resolve(email);
        } catch (e) {
          console.warn("Failed to fetch user email", e);
          resolve("connected-user");
        }
      };

      if (gapi.client.getToken() === null) {
        this.tokenClient.requestAccessToken({ prompt: "consent" });
      } else {
        this.tokenClient.requestAccessToken({ prompt: "" });
      }
    });
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
    }
  }

  async listFiles(): Promise<Map<string, RemoteFileMeta>> {
    if (!this.accessToken) throw new Error("Not authenticated");

    const response = await gapi.client.drive.files.list({
      pageSize: 1000,
      fields: "files(id, name, mimeType, modifiedTime, parents, appProperties)",
      q: "mimeType != 'application/vnd.google-apps.folder' and trashed = false",
    });

    const fileMap = new Map<string, RemoteFileMeta>();
    const files = response.result.files;

    if (files && files.length > 0) {
      for (const file of files) {
        // Assume flat structure for now or match specific folder
        // For real impl, we need to map paths properly.
        // Here we just use name as path for simplicity in MVP
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
