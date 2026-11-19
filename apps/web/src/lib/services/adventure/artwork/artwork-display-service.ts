import type { ArtworkAsset } from "@codex/adventure-artwork-engine";
import type { ArtworkVariant } from "./artwork-cache";
import type { ArtworkBlobHandle } from "./ports";

/** Converts validated public artwork bytes into an explicitly managed display URL. */
export class ArtworkDisplayService {
  constructor(
    private readonly loader: {
      load(
        variant: ArtworkVariant,
        signal: AbortSignal,
        purpose: "automatic",
      ): Promise<Blob | null>;
    },
    private readonly urls: {
      create(blob: Blob): string;
      revoke(url: string): void;
    },
  ) {}
  async load(
    asset: ArtworkAsset,
    signal: AbortSignal,
    variant: "display" | "preview" = "display",
  ): Promise<ArtworkBlobHandle | null> {
    if (signal.aborted || asset.withdrawn || asset.review.status !== "approved")
      return null;
    try {
      const blob = await this.loader.load(
        asset.variants[variant],
        signal,
        "automatic",
      );
      if (!blob || signal.aborted) return null;
      const url = this.urls.create(blob);
      if (signal.aborted) {
        this.urls.revoke(url);
        return null;
      }
      let released = false;
      return {
        url,
        release: () => {
          if (!released) {
            released = true;
            this.urls.revoke(url);
          }
        },
      };
    } catch {
      return null;
    }
  }
}
