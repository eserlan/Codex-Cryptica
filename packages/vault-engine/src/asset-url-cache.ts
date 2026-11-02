/** Object URLs owned by asset consumers, released after the last reference. */
export class AssetUrlCache {
  private entries = new Map<string, { url: string; refs: number }>();

  retain(path: string): string | undefined {
    const entry = this.entries.get(path);
    if (!entry) return;
    entry.refs++;
    return entry.url;
  }

  has(path: string): boolean {
    return this.entries.has(path);
  }

  publish(path: string, url: string): string {
    this.entries.set(path, { url, refs: 1 });
    return url;
  }

  /** Keep the first URL if another resolution published while we awaited IO. */
  reuse(path: string, url: string): string | undefined {
    const existing = this.retain(path);
    if (existing !== undefined) {
      URL.revokeObjectURL(url);
    }
    return existing;
  }

  release(path: string): void {
    const entry = this.entries.get(path);
    if (!entry) return;
    if (--entry.refs <= 0) {
      URL.revokeObjectURL(entry.url);
      this.entries.delete(path);
    }
  }

  clear(): void {
    this.entries.forEach((entry) => URL.revokeObjectURL(entry.url));
    this.entries.clear();
  }
}
