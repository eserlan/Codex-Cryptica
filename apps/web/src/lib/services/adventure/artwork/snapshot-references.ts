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

/** A caller must supply every entity and every active, archived and recovery adventure. */
// fallow-ignore-next-line complexity -- Adventure artwork orchestration; branches are validation and fallback guards covered by feature tests.
export function inspectSnapshotReferences(
  path: string,
  entities: readonly unknown[],
  adventures: readonly unknown[],
): ReferenceStatus {
  let unknown = false;
  for (const entity of entities) {
    if (!isRecord(entity)) {
      unknown = true;
      continue;
    }
    if (entity.adventureArtwork === undefined) continue;
    const result = associationReference(path, entity.adventureArtwork);
    if (result === "referenced") return result;
    if (result === "unknown") unknown = true;
  }
  for (const adventure of adventures) {
    if (!isRecord(adventure)) {
      unknown = true;
      continue;
    }
    const artwork = readAdventureArtworkState(adventure.artwork);
    if (artwork.kind === "opaque") {
      unknown = true;
      continue;
    }
    if (artwork.kind === "absent") continue;
    // Pending links may carry references in formats a newer writer understands.
    if (artwork.value.pendingCanonicalLinks?.length) unknown = true;
    for (const entry of artwork.value.associations) {
      if (associationReference(path, entry.association) === "referenced")
        return "referenced";
    }
  }
  return unknown ? "unknown" : "unreferenced";
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
