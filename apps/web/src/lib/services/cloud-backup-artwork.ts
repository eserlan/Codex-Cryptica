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

type SnapshotRecord = {
  path: string;
  mime: string;
  bytes: number;
  sha256: string;
};

function snapshotsConflict(
  previous: SnapshotRecord,
  next: SnapshotRecord,
): boolean {
  return (
    previous.mime !== next.mime ||
    previous.bytes !== next.bytes ||
    previous.sha256 !== next.sha256
  );
}

function parseSnapshotChoice(raw: unknown) {
  const parsed = ArtworkAssociationSchema.safeParse(raw);
  if (!parsed.success || !artworkDataUnchanged(parsed.data, raw)) {
    throw new Error("Unrecognised artwork reference; backup needs attention");
  }
  return parsed.data.override;
}

function upsertSnapshotRecord(
  choice: {
    path: string;
    mime: string;
    bytes: number;
    sha256: string;
    thumbnailPath?: string;
  },
  snapshots: Map<string, SnapshotRecord>,
  paths: Set<string>,
): void {
  const next: SnapshotRecord = {
    path: choice.path,
    mime: choice.mime,
    bytes: choice.bytes,
    sha256: choice.sha256,
  };
  const previous = snapshots.get(choice.path);
  if (previous && snapshotsConflict(previous, next)) {
    throw new Error("conflicting artwork snapshot references");
  }
  snapshots.set(choice.path, next);
  paths.add(choice.path);
  if (choice.thumbnailPath) paths.add(choice.thumbnailPath);
}

function recordSnapshotReference(
  raw: unknown,
  snapshots: Map<string, SnapshotRecord>,
  paths: Set<string>,
): void {
  const choice = parseSnapshotChoice(raw);
  if (choice?.kind === "snapshot") {
    upsertSnapshotRecord(choice, snapshots, paths);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getAdventureAssociations(adventure: AdventureDocument) {
  if (!isPlainObject(adventure)) {
    throw new Error("Unreadable adventure; backup needs attention");
  }
  const artwork = readAdventureArtworkState(adventure.artwork);
  if (artwork.kind === "opaque") {
    throw new Error("Unrecognised adventure artwork; backup needs attention");
  }
  if (artwork.kind !== "known") return null;
  if (artwork.value.pendingCanonicalLinks?.length) {
    throw new Error("Unrecognised adventure artwork; backup needs attention");
  }
  return artwork.value.associations;
}

function collectAdventureDocumentArtwork(
  adventure: AdventureDocument,
  snapshots: Map<string, SnapshotRecord>,
  paths: Set<string>,
): void {
  const associations = getAdventureAssociations(adventure);
  if (!associations) return;
  for (const entry of associations) {
    recordSnapshotReference(entry.association, snapshots, paths);
  }
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
  snapshots: SnapshotRecord[];
}> {
  if (!included) {
    return {
      entities: entities.map(omitArtworkForBackup),
      snapshotPaths: [],
      snapshots: [],
    };
  }
  const paths = new Set<string>();
  const snapshots = new Map<string, SnapshotRecord>();

  for (const entity of entities) {
    if (entity.adventureArtwork !== undefined) {
      recordSnapshotReference(entity.adventureArtwork, snapshots, paths);
    }
  }
  const adventures = await readAdventures();
  for (const adventure of adventures) {
    collectAdventureDocumentArtwork(adventure, snapshots, paths);
  }
  return {
    entities: [...entities],
    adventures,
    snapshotPaths: [...paths],
    snapshots: [...snapshots.values()],
  };
}
