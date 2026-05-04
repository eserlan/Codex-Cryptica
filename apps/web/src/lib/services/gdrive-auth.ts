import { type IGDriveAuthService } from "@codex/sync-engine";
import { browser } from "$app/environment";

/**
 * Manages Google Drive authentication using Google Identity Services (GIS).
 * Holds the access token in memory only.
 */
export class GDriveAuthService implements IGDriveAuthService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private tokenClient: google.accounts.oauth2.TokenClient | null = null;

  private readonly SCOPES = "https://www.googleapis.com/auth/drive.file";
  private readonly CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  constructor() {
    if (browser && !this.CLIENT_ID) {
      console.warn(
        "VITE_GOOGLE_CLIENT_ID is not configured. Google Drive sync will be disabled.",
      );
    }
  }

  private resolvers: Array<{
    resolve: (token: string) => void;
    reject: (err: any) => void;
  }> = [];

  /**
   * Initializes the GIS token client.
   */
  private async initTokenClient(): Promise<google.accounts.oauth2.TokenClient> {
    if (this.tokenClient) return this.tokenClient;

    // Wait for google library to load if needed (max 5s)
    let retryCount = 0;
    while (
      (typeof google === "undefined" || !google.accounts?.oauth2) &&
      retryCount < 50
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      retryCount++;
    }

    if (typeof google === "undefined" || !google.accounts?.oauth2) {
      throw new Error(
        "Google Identity Services library failed to load. Please check your internet connection.",
      );
    }

    if (!this.CLIENT_ID) {
      throw new Error(
        "Google Client ID (VITE_GOOGLE_CLIENT_ID) is not configured in the application environment.",
      );
    }

    console.log(
      "[GDriveAuth] Initializing Token Client with ID:",
      this.CLIENT_ID.substring(0, 10) + "...",
    );

    return new Promise((resolve) => {
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: this.CLIENT_ID,
        scope: this.SCOPES,
        callback: (response) => {
          console.log(
            "[GDriveAuth] GIS Callback received",
            response.error ? "with error" : "successfully",
          );
          if (response.error) {
            this.resolvers.forEach((r) => r.reject(response));
          } else {
            this.accessToken = response.access_token;
            this.tokenExpiry = Date.now() + Number(response.expires_in) * 1000;
            this.resolvers.forEach((r) => r.resolve(response.access_token));
          }
          this.resolvers = [];
        },
      });

      resolve(this.tokenClient);
    });
  }

  /**
   * Returns a valid access token. Triggers a popup if no token exists.
   */
  async getAccessToken(): Promise<string | null> {
    if (this.accessToken && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    console.log("[GDriveAuth] Requesting new access token...");
    try {
      const client = await this.initTokenClient();

      return new Promise((resolve, reject) => {
        this.resolvers.push({ resolve, reject });

        // If this is the first request in the queue, trigger the popup
        if (this.resolvers.length === 1) {
          console.log("[GDriveAuth] Triggering requestAccessToken popup");
          client.requestAccessToken({
            prompt: this.accessToken ? "" : "select_account",
          });
        }
      });
    } catch (error) {
      console.error("[GDriveAuth] Failed to get access token:", error);
      throw error;
    }
  }

  /**
   * Requests a token with an explicit scope, creating a one-off token client.
   * Used when broader access is needed (e.g. reading a folder shared by another user).
   */
  async getTokenWithScope(scope: string): Promise<string> {
    // Wait for GIS library
    let retryCount = 0;
    while (
      (typeof google === "undefined" || !google.accounts?.oauth2) &&
      retryCount < 50
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      retryCount++;
    }
    if (typeof google === "undefined" || !google.accounts?.oauth2) {
      throw new Error("Google Identity Services library failed to load.");
    }
    if (!this.CLIENT_ID) {
      throw new Error("VITE_GOOGLE_CLIENT_ID is not configured.");
    }

    return new Promise((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: this.CLIENT_ID,
        scope,
        callback: (response) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.access_token);
          }
        },
      });
      client.requestAccessToken({ prompt: "consent" });
    });
  }

  /**
   * Signs the user out (revokes token and clears memory).
   */
  async signOut(): Promise<void> {
    if (
      this.accessToken &&
      typeof google !== "undefined" &&
      google.accounts?.oauth2
    ) {
      try {
        google.accounts.oauth2.revoke(this.accessToken, () => {
          console.log("[GDriveAuth] Token revoked");
        });
      } catch (e) {
        console.warn("[GDriveAuth] Failed to revoke token:", e);
      }
    }
    this.accessToken = null;
    this.tokenExpiry = 0;
  }
}

// Export a default singleton
export const gdriveAuthService = new GDriveAuthService();
