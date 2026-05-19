/**
 * Per-session Object URL cache for map asset and fog mask blobs.
 * Guarantees that prior URLs are revoked before new ones are issued and
 * that all outstanding URLs are revoked on session disconnect.
 */
export class MapAssetUrlCache {
  private mapUrl: string | null = null;
  private fogUrl: string | null = null;

  setAsset(blob: Blob): string {
    if (this.mapUrl) {
      URL.revokeObjectURL(this.mapUrl);
    }
    this.mapUrl = URL.createObjectURL(blob);
    return this.mapUrl;
  }

  setFog(blob: Blob): string {
    if (this.fogUrl) {
      URL.revokeObjectURL(this.fogUrl);
    }
    this.fogUrl = URL.createObjectURL(blob);
    return this.fogUrl;
  }

  revokeAll(): void {
    if (this.mapUrl) {
      URL.revokeObjectURL(this.mapUrl);
      this.mapUrl = null;
    }
    if (this.fogUrl) {
      URL.revokeObjectURL(this.fogUrl);
      this.fogUrl = null;
    }
  }
}
