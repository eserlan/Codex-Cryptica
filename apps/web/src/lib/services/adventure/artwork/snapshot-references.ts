import {
  ArtworkAssociationSchema,
  artworkDataUnchanged,
  readAdventureArtworkState,
} from "schema";

type ReferenceStatus = "referenced" | "unreferenced" | "unknown";
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

function associationReference(path: string, value: unknown): ReferenceStatus {
  const parsed = ArtworkAssociationSchema.safeParse(value);
  if (!parsed.success || !artworkDataUnchanged(parsed.data, value))
    return "unknown";
  const choice = parsed.data.override;
  return choice?.kind === "snapshot" &&
    (choice.path === path || choice.thumbnailPath === path)
    ? "referenced"
    : "unreferenced";
}

function inspectEntity(path: string, entity: unknown): ReferenceStatus {
  if (!isRecord(entity)) return "unknown";
  if (entity.adventureArtwork === undefined) return "unreferenced";
  return associationReference(path, entity.adventureArtwork);
}

function inspectEntities(
  path: string,
  entities: readonly unknown[],
): ReferenceStatus {
  let unknown = false;
  for (const entity of entities) {
    const result = inspectEntity(path, entity);
    if (result === "referenced") return "referenced";
    if (result === "unknown") unknown = true;
  }
  return unknown ? "unknown" : "unreferenced";
}

function inspectAssociations(
  path: string,
  associations: readonly { association: unknown }[],
): boolean {
  return associations.some(
    (entry) => associationReference(path, entry.association) === "referenced",
  );
}

function inspectKnownAdventure(
  path: string,
  value: {
    associations: readonly { association: unknown }[];
    pendingCanonicalLinks?: readonly unknown[];
  },
): ReferenceStatus {
  if (inspectAssociations(path, value.associations)) return "referenced";
  // Pending links may carry references in formats a newer writer understands.
  return value.pendingCanonicalLinks?.length ? "unknown" : "unreferenced";
}

function inspectAdventure(path: string, adventure: unknown): ReferenceStatus {
  if (!isRecord(adventure)) return "unknown";
  const artwork = readAdventureArtworkState(adventure.artwork);
  if (artwork.kind === "opaque") return "unknown";
  if (artwork.kind === "absent") return "unreferenced";
  return inspectKnownAdventure(path, artwork.value);
}

function inspectAdventures(
  path: string,
  adventures: readonly unknown[],
): ReferenceStatus {
  let unknown = false;
  for (const adventure of adventures) {
    const result = inspectAdventure(path, adventure);
    if (result === "referenced") return "referenced";
    if (result === "unknown") unknown = true;
  }
  return unknown ? "unknown" : "unreferenced";
}

/** A caller must supply every entity and every active, archived and recovery adventure. */
// fallow-ignore-next-line complexity -- Adventure artwork orchestration; branches are validation and fallback guards covered by feature tests.
export function inspectSnapshotReferences(
  path: string,
  entities: readonly unknown[],
  adventures: readonly unknown[],
): ReferenceStatus {
  const entityStatus = inspectEntities(path, entities);
  if (entityStatus === "referenced") return "referenced";
  const adventureStatus = inspectAdventures(path, adventures);
  if (adventureStatus === "referenced") return "referenced";
  return entityStatus === "unknown" || adventureStatus === "unknown"
    ? "unknown"
    : "unreferenced";
}

interface CleanupDependencies {
  /** Must exclude all writers that can add references until deletion completes. */
  exclusive<T>(action: () => Promise<T>): Promise<T>;
  /** Must fail if any entity or active, archived or recovery adventure cannot be read. */
  owners(): Promise<{
    entities: readonly unknown[];
    adventures: readonly unknown[];
  }>;
  remove(path: string): Promise<void>;
}

export class SnapshotCleanup {
  constructor(private readonly deps: CleanupDependencies) {}
  async removeIfUnreferenced(path: string): Promise<boolean> {
    if (!/^images\/artwork_[a-zA-Z0-9_-]+\.(?:png|jpg|jpeg|webp)$/.test(path))
      return false;
    try {
      return await this.deps.exclusive(async () => {
        const { entities, adventures } = await this.deps.owners();
        if (
          inspectSnapshotReferences(path, entities, adventures) !==
          "unreferenced"
        )
          return false;
        await this.deps.remove(path);
        return true;
      });
    } catch {
      return false;
    }
  }
}
