import {
  ArtworkAssociationSchema,
  artworkDataUnchanged,
  isPrivateArtworkSnapshotPath,
  readAdventureArtworkState,
} from "schema";

type OwnerEntity = {
  adventureArtwork?: unknown;
  image?: string;
  thumbnail?: string;
};
type AdventureDocument = { artwork?: unknown };

export function omitArtworkForBackup<T extends OwnerEntity>(entity: T): T {
  if (
    !Object.hasOwn(entity, "adventureArtwork") &&
    !isPrivateArtworkSnapshotPath(entity.image) &&
    !isPrivateArtworkSnapshotPath(entity.thumbnail)
  )
    return entity;
  const copy = { ...entity };
  delete copy.adventureArtwork;
  if (isPrivateArtworkSnapshotPath(copy.image)) delete copy.image;
  if (isPrivateArtworkSnapshotPath(copy.thumbnail)) delete copy.thumbnail;
  return copy;
}

/** Refuse a backup that would either expose private media or lose map data. */
export function omitPrivateMapArtwork(map: unknown): unknown {
  if (!map || typeof map !== "object" || Array.isArray(map)) return map;
  const original = map as Record<string, unknown>;
  if (
    typeof original.assetPath === "string" &&
    isPrivateArtworkSnapshotPath(original.assetPath)
  )
    throw new Error(
      "Map references private adventure artwork; backup needs attention",
    );
  const fog = original.fogOfWar;
  if (fog && typeof fog === "object" && !Array.isArray(fog)) {
    const value = fog as Record<string, unknown>;
    if (
      typeof value.maskPath === "string" &&
      isPrivateArtworkSnapshotPath(value.maskPath)
    ) {
      throw new Error(
        "Map mask references private adventure artwork; backup needs attention",
      );
    }
  }
  return map;
}

/** Project private artwork only after explicit consent, without touching source records. */
export async function collectArtworkBackup<T extends OwnerEntity>(
  included: boolean,
  entities: readonly T[],
  readAdventures: () => Promise<readonly AdventureDocument[]>,
): Promise<{
  entities: T[];
  adventures?: readonly AdventureDocument[];
  snapshotPaths: string[];
  snapshots: { path: string; mime: string; bytes: number; sha256: string }[];
}> {
  if (!included) {
    return {
      entities: entities.map(omitArtworkForBackup),
      snapshotPaths: [],
      snapshots: [],
    };
  }
  const paths = new Set<string>();
  const snapshots = new Map<
    string,
    { path: string; mime: string; bytes: number; sha256: string }
  >();
  function collect(raw: unknown) {
    const parsed = ArtworkAssociationSchema.safeParse(raw);
    if (!parsed.success || !artworkDataUnchanged(parsed.data, raw))
      throw new Error("Unrecognised artwork reference; backup needs attention");
    const choice = parsed.data.override;
    if (choice?.kind === "snapshot") {
      const previous = snapshots.get(choice.path);
      if (
        previous &&
        (previous.mime !== choice.mime ||
          previous.bytes !== choice.bytes ||
          previous.sha256 !== choice.sha256)
      )
        throw new Error("conflicting artwork snapshot references");
      snapshots.set(choice.path, {
        path: choice.path,
        mime: choice.mime,
        bytes: choice.bytes,
        sha256: choice.sha256,
      });
      paths.add(choice.path);
      if (choice.thumbnailPath) paths.add(choice.thumbnailPath);
    }
  }
  for (const entity of entities)
    if (entity.adventureArtwork !== undefined) collect(entity.adventureArtwork);
  const adventures = await readAdventures();
  for (const adventure of adventures) {
    if (!adventure || typeof adventure !== "object" || Array.isArray(adventure))
      throw new Error("Unreadable adventure; backup needs attention");
    const artwork = readAdventureArtworkState(adventure.artwork);
    if (
      artwork.kind === "opaque" ||
      (artwork.kind === "known" && artwork.value.pendingCanonicalLinks?.length)
    )
      throw new Error("Unrecognised adventure artwork; backup needs attention");
    if (artwork.kind === "known")
      for (const entry of artwork.value.associations)
        collect(entry.association);
  }
  return {
    entities: [...entities],
    adventures,
    snapshotPaths: [...paths],
    snapshots: [...snapshots.values()],
  };
}
