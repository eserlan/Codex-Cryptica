import type { ArtworkVariant } from "./artwork-cache";
import type { ArtworkPreferences } from "./artwork-preferences";

type Loader = {
  load(variant: ArtworkVariant, signal: AbortSignal): Promise<Blob | null>;
};
/** Cancels only automatic subscribers when illustrations are disabled. */
export class ArtworkVisibilityLoader {
  private readonly automatic = new Set<AbortController>();
  private readonly unsubscribe: () => void;
  constructor(
    private readonly loader: Loader,
    private readonly preferences: ArtworkPreferences,
  ) {
    this.unsubscribe = preferences.subscribe((enabled) => {
      if (!enabled) for (const controller of this.automatic) controller.abort();
    });
  }
  async load(
    variant: ArtworkVariant,
    signal: AbortSignal,
    purpose: "automatic" | "download",
  ): Promise<Blob | null> {
    if (
      signal.aborted ||
      (purpose === "automatic" && !this.preferences.enabled)
    )
      return null;
    if (purpose === "download") return this.loader.load(variant, signal);
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal.addEventListener("abort", cancel, { once: true });
    this.automatic.add(controller);
    try {
      if (signal.aborted || !this.preferences.enabled) controller.abort();
      return await this.loader.load(variant, controller.signal);
    } finally {
      signal.removeEventListener("abort", cancel);
      this.automatic.delete(controller);
    }
  }
  destroy(): void {
    this.unsubscribe();
    for (const controller of this.automatic) controller.abort();
    this.automatic.clear();
  }
}
