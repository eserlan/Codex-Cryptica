import { ArtworkCatalogueService } from "./catalogue-service";

/** Metadata is loaded only when the flagged Adventure artwork view is used. */
export const defaultArtworkCatalogue = new ArtworkCatalogueService(async () => {
  const { seedArtwork } = await import("@codex/adventure-artwork-engine/seed");
  return seedArtwork;
});
