import type { GoogleGenerativeAI as GoogleGenerativeAIType } from "@google/generative-ai";

/** Lazily loads the SDK and caches the direct client for the current API key. */
export class DirectAIClient {
  private client: GoogleGenerativeAIType | null = null;
  private currentKey: string | null = null;
  private sdkPromise: Promise<typeof import("@google/generative-ai")> | null =
    null;

  constructor(private loadSdk = () => import("@google/generative-ai")) {}

  async getClient(apiKey: string): Promise<GoogleGenerativeAIType> {
    if (!this.client || this.currentKey !== apiKey) {
      if (!this.sdkPromise) this.sdkPromise = this.loadSdk();
      const { GoogleGenerativeAI } = await this.sdkPromise;
      this.client = new GoogleGenerativeAI(apiKey);
      this.currentKey = apiKey;
    }
    return this.client;
  }
}
