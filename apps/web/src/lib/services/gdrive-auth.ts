import { type IGDriveAuthService } from "@codex/sync-engine";
import { browser } from "$app/environment";
import { waitUntil } from "$lib/utils/retry";

/**
 * Manages Google Drive authentication using Google Identity Services (GIS).
 * Holds the access token in memory only.
 */
export class GDriveAuthService implements IGDriveAuthService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private tokenClients = new Map<string, google.accounts.oauth2.TokenClient>();
  private pendingClients = new Map<
    string,
    Promise<google.accounts.oauth2.TokenClient>
  >();
  private activeScope: string;

  private readonly SCOPES = "https://www.googleapis.com/auth/drive.file";
  private readonly CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  constructor() {
    this.activeScope = this.SCOPES;

    if (browser && !this.CLIENT_ID) {
      console.warn(
        "VITE_GOOGLE_CLIENT_ID is not configured. Google Drive sync will be disabled.",
      );
    }
  }

  private resolvers: Array<{
    resolve: (token: string) => void;
    reject: (err: any) => void;
    scope: string;
  }> = [];

  /**
   * Initializes the GIS token client.
   */
  private async initTokenClient(
    scope = this.SCOPES,
  ): Promise<google.accounts.oauth2.TokenClient> {
    const existingClient = this.tokenClients.get(scope);
    if (existingClient) return existingClient;

    const pending = this.pendingClients.get(scope);
    if (pending) return pending;

    const promise = (async () => {
      // Wait for google library to load if needed (max 5s)
      const loaded = await waitUntil(
        () => typeof google !== "undefined" && !!google.accounts?.oauth2,
        { intervalMs: 100, timeoutMs: 5000 },
      );

      if (!loaded) {
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

      return new Promise<google.accounts.oauth2.TokenClient>((resolve) => {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: this.CLIENT_ID,
          scope,
          callback: (response) => {
            console.log(
              "[GDriveAuth] GIS Callback received",
              response.error ? "with error" : "successfully",
            );
            if (response.error) {
              this.resolvers
                .filter((r) => r.scope === scope)
                .forEach((r) => r.reject(response));
            } else {
              this.accessToken = response.access_token;
              this.activeScope = scope;
              this.tokenExpiry =
                Date.now() + Number(response.expires_in) * 1000;
              this.resolvers
                .filter((r) => r.scope === scope)
                .forEach((r) => r.resolve(response.access_token));
            }
            this.resolvers = this.resolvers.filter((r) => r.scope !== scope);
          },
        });

        this.tokenClients.set(scope, tokenClient);
        resolve(tokenClient);
      });
    })();

    this.pendingClients.set(scope, promise);
    try {
      return await promise;
    } finally {
      this.pendingClients.delete(scope);
    }
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
      const scope = this.activeScope;
      const client = await this.initTokenClient(scope);

      return new Promise((resolve, reject) => {
        this.resolvers.push({ resolve, reject, scope });

        // If this is the first request for THIS scope, trigger the popup
        if (this.resolvers.filter((r) => r.scope === scope).length === 1) {
          console.log(
            "[GDriveAuth] Triggering requestAccessToken popup for",
            scope,
          );
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
   * Used when a workflow must keep renewing a non-default scope.
   */
  async getTokenWithScope(scope: string): Promise<string> {
    const client = await this.initTokenClient(scope);

    return new Promise((resolve, reject) => {
      this.resolvers.push({ resolve, reject, scope });
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
    this.activeScope = this.SCOPES;
  }
}

// Export a default singleton
export const gdriveAuthService = new GDriveAuthService();
