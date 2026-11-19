import {
  parseCatalogue,
  type ArtworkAsset,
} from "@codex/adventure-artwork-engine";

/** Lazily loads reviewed metadata; invalid or unavailable data is retryable. */
export class ArtworkCatalogueService {
  private cached: readonly ArtworkAsset[] | null = null;
  private inFlight: Promise<readonly ArtworkAsset[] | null> | null = null;
  constructor(private readonly loadMetadata: () => Promise<unknown>) {}
  peek(): readonly ArtworkAsset[] | null {
    return this.cached;
  }
  get(): Promise<readonly ArtworkAsset[] | null> {
    if (this.cached) return Promise.resolve(this.cached);
    if (!this.inFlight) {
      this.inFlight = Promise.resolve()
        .then(() => this.loadMetadata())
        .then((raw) => {
          const parsed = parseCatalogue(raw);
          this.cached = parsed;
          return parsed;
        })
        .catch(() => null)
        .finally(() => {
          this.inFlight = null;
        });
    }
    return this.inFlight;
  }
}
