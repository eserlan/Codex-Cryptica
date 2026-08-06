import type {
  DiscoveredEntity,
  CCImportSession,
  ImportEngine,
} from "@codex/importer";
import { discoveredEntitiesToPackage } from "@codex/importer";
import { wrapWithAbort } from "./import-abort-utils";

export interface OracleImportSessionDeps {
  saveImageToVault: (
    blob: Blob,
    entityId: string,
    originalName: string,
  ) => Promise<{ image: string; thumbnail?: string }>;
  extractedAssets: Map<string, any>;
  createEngine: () => ImportEngine;
}

export async function buildOracleSession(
  entities: DiscoveredEntity[],
  sourceLabel: string,
  signal: AbortSignal,
  deps: OracleImportSessionDeps,
): Promise<CCImportSession> {
  const resolvedEntities = await Promise.all(
    entities.map(async (entity) => {
      const imgRef = entity.frontmatter?.image;
      if (!imgRef || !deps.extractedAssets.has(imgRef)) return entity;

      const asset = deps.extractedAssets.get(imgRef);
      try {
        const saved = await deps.saveImageToVault(
          asset.blob,
          entity.id,
          asset.originalName,
        );
        return {
          ...entity,
          frontmatter: {
            ...entity.frontmatter,
            image: saved.image,
            thumbnail: saved.thumbnail,
            width: entity.frontmatter.width ?? asset.width,
            height: entity.frontmatter.height ?? asset.height,
          },
        };
      } catch {
        return entity;
      }
    }),
  );

  const pkg = discoveredEntitiesToPackage(resolvedEntities, sourceLabel);
  const session = await wrapWithAbort(deps.createEngine().prepare(pkg), signal);

  const matchedById = new Map(
    resolvedEntities
      .filter((e) => e.matchedEntityId)
      .map((e) => [e.id, e.matchedEntityId as string]),
  );

  return {
    ...session,
    items: session.items.map((item: any) => {
      const matchedEntityId = item.draft.sourceId
        ? matchedById.get(item.draft.sourceId)
        : undefined;
      if (!matchedEntityId) return item;
      return {
        ...item,
        match: { entityId: matchedEntityId },
        matchDecision: "update" as const,
      };
    }),
  };
}
