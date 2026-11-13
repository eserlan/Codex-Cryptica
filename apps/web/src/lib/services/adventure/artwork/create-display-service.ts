import { ArtworkDisplayService } from "./artwork-display-service";
import { ArtworkVisibilityLoader } from "./artwork-visibility-loader";
import { createBrowserArtworkLoader } from "./create-artwork-loader";
import type { ArtworkPreferences } from "./artwork-preferences";

/** Browser-only assembly; callers dispose subscriptions when the view unmounts. */
export function createDisplayService(preferences: ArtworkPreferences) {
  const visibility = new ArtworkVisibilityLoader(
    createBrowserArtworkLoader(),
    preferences,
  );
  return {
    display: new ArtworkDisplayService(visibility, {
      create: (blob) => URL.createObjectURL(blob),
      revoke: (url) => URL.revokeObjectURL(url),
    }),
    destroy: () => visibility.destroy(),
  };
}
