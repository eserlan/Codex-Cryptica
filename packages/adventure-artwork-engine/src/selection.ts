import type { ArtworkAssociation } from "schema";
export type ArtworkSelection =
  | { kind: "none" }
  | { kind: "vault"; image: string }
  | { kind: "catalogue"; assetId: string; sha256?: string }
  | { kind: "snapshot"; path: string };
export function resolveArtwork(input: {
  enabled: boolean;
  association?: ArtworkAssociation;
  vaultImage?: string;
  match?: string;
  availableAssetIds?: readonly string[];
  availableAssets?: readonly { id: string; sha256: string }[];
  snapshotAvailable?: boolean;
}): ArtworkSelection {
  const override = input.association?.override;
  if (!input.enabled || override?.kind === "dismissed") return { kind: "none" };
  if (override?.kind === "snapshot")
    return input.snapshotAvailable === true
      ? { kind: "snapshot", path: override.path }
      : { kind: "none" };
  if (override?.kind === "catalogue")
    return input.availableAssets?.some(
      (asset) =>
        asset.id === override.assetId && asset.sha256 === override.sha256,
    )
      ? {
          kind: "catalogue",
          assetId: override.assetId,
          sha256: override.sha256,
        }
      : { kind: "none" };
  if (input.vaultImage) return { kind: "vault", image: input.vaultImage };
  const automatic = input.association?.automatic?.assetId;
  if (automatic && input.availableAssetIds?.includes(automatic))
    return { kind: "catalogue", assetId: automatic };
  return input.match
    ? { kind: "catalogue", assetId: input.match }
    : { kind: "none" };
}

/** Resolve scene artwork: scene selection -> atmosphere (if explicit scene) -> location fallback. */
export function resolveSceneWithAtmosphere(input: {
  hasExplicitCommittedScene: boolean;
  sceneSelection: ArtworkSelection;
  atmosphereMatch?: string | null;
  locationSelection: ArtworkSelection;
}): ArtworkSelection {
  if (input.sceneSelection.kind !== "none") {
    return input.sceneSelection;
  }
  if (input.hasExplicitCommittedScene && input.atmosphereMatch) {
    return { kind: "catalogue", assetId: input.atmosphereMatch };
  }
  return input.locationSelection;
}
