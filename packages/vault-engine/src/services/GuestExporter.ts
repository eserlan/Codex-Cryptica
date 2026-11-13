import {
  isEntityVisible,
  isPrivateArtworkSnapshotPath,
  type Entity,
  type GuestBundle,
  type GuestRelationship,
  type Map,
  type StatSheet,
} from "schema";
import { type Clock, systemClock } from "../runtime";

/**
 * Turns an entity's stat sheet into the version players may see (#3964).
 * `resolveName` names a linked Item, and only answers for entities that are
 * themselves part of the export.
 */
export type GuestSheetSanitizer = (
  sheet: StatSheet,
  context: { resolveName: (entityId: string) => string | undefined },
) => StatSheet | undefined;

export interface ExporterOptions {
  /**
   * How stat sheets are prepared for players. When omitted, a sheet that
   * holds a merchant stock ledger is withheld entirely rather than copied,
   * so forgetting to pass this can never publish a shop's private stock.
   */
  sanitizeStatSheet?: GuestSheetSanitizer;
  entities: Entity[];
  defaultVisibility: "visible" | "hidden";
  activeTheme?: any;
  publishId: string;
  vaultTitle: string;
  publisherVersion: string;
  maps?: Map[];
  canvases?: any[];
  assetManifest?: Array<{
    assetId: string;
    filename?: string;
    mimeType: string;
    hash: string;
  }>;
  metadata?: { description?: string; coverImage?: string };
}

export class GuestExporter {
  /**
   * The sheet as it is published. Without a sanitiser a merchant ledger is
   * replaced by an empty sheet (fail closed); other sheets are unchanged.
   */
  private static sanitizeSheet(
    sheet: StatSheet,
    included: ReadonlyMap<string, Entity>,
    sanitizer?: GuestSheetSanitizer,
  ): StatSheet | undefined {
    if (sanitizer) {
      return sanitizer(sheet, {
        resolveName: (entityId) => included.get(entityId)?.title,
      });
    }
    return sheet.fields.some((field) => field.stockLedger === true)
      ? { templateId: null, fields: [] }
      : sheet;
  }

  private static redactBiomeReferenceLinks(
    content: string,
    referenceLinks: readonly { url: string }[],
  ): string {
    const withoutSection = content.replace(
      /(^|\r?\n)## Reference links\r?\n[\s\S]*?(?=\r?\n## |\s*$)/,
      "$1",
    );
    // Labels are user-controlled and may contain headings that terminate the
    // section matcher early. Remove each private URL independently as well.
    return referenceLinks.reduce(
      (result, link) => result.replaceAll(link.url, ""),
      withoutSection,
    );
  }

  private static collectIncludedEntities(
    entities: readonly Entity[],
    defaultVisibility: "visible" | "hidden",
  ): globalThis.Map<string, Entity> {
    const visibilitySettings = { sharedMode: true, defaultVisibility };
    const included = new globalThis.Map<string, Entity>();
    for (const entity of entities) {
      if (
        entity.status === "draft" ||
        entity.kind === "report" ||
        !isEntityVisible(entity, visibilitySettings)
      ) {
        continue;
      }
      included.set(entity.id, entity);
    }
    return included;
  }

  private static toGuestRelationship(
    sourceId: string,
    conn: NonNullable<Entity["connections"]>[number],
  ): GuestRelationship {
    const type = conn.type || "neutral";
    return {
      id: `${sourceId}-${conn.target}-${type}`,
      sourceId,
      targetId: conn.target,
      label: conn.label || conn.type || "",
      description: "",
    };
  }

  private static collectEntityRelationships(
    entity: Entity,
    includedEntityIds: ReadonlySet<string>,
  ): GuestRelationship[] {
    return (entity.connections ?? [])
      .filter(
        (conn) => Boolean(conn.target) && includedEntityIds.has(conn.target),
      )
      .map((conn) => GuestExporter.toGuestRelationship(entity.id, conn));
  }

  private static buildGuestRelationships(
    includedEntitiesMap: ReadonlyMap<string, Entity>,
    includedEntityIds: ReadonlySet<string>,
  ): GuestRelationship[] {
    const relationships: GuestRelationship[] = [];
    for (const entity of includedEntitiesMap.values()) {
      relationships.push(
        ...GuestExporter.collectEntityRelationships(entity, includedEntityIds),
      );
    }
    return relationships;
  }

  private static sanitizeGuestMaps(
    maps: readonly Map[],
    includedEntityIds: ReadonlySet<string>,
  ): Map[] {
    // hexCrawl is GM-only working data (FR-041): notes, AI drafts and explored
    // state never reach guests. Grid geometry is kept, since it is map layout.
    return maps
      .filter(
        (m) =>
          m.playerVisible === true &&
          !isPrivateArtworkSnapshotPath(m.assetPath),
      )
      .map((m) => {
        const pins = (m.pins || []).filter(
          (p) => !p.entityId || includedEntityIds.has(p.entityId),
        );
        const { hexCrawl: _hexCrawl, ...publicMap } = m;
        return { ...publicMap, pins };
      });
  }

  private static sanitizeCanvas(
    canvas: any,
    includedEntityIds: ReadonlySet<string>,
  ): any {
    const nodes = (canvas.nodes || []).filter(
      (n: any) => n.type !== "entity" || includedEntityIds.has(n.entityId),
    );
    const nodeIds = new Set(nodes.map((n: any) => n.id));
    const edges = (canvas.edges || []).filter(
      (e: any) => nodeIds.has(e.source) && nodeIds.has(e.target),
    );
    return { ...canvas, nodes, edges };
  }

  private static sanitizeGuestCanvases(
    canvases: readonly any[],
    includedEntityIds: ReadonlySet<string>,
  ): any[] {
    return canvases
      .filter((c) => c.playerVisible === true)
      .map((c) => GuestExporter.sanitizeCanvas(c, includedEntityIds));
  }

  private static stripPrivateEntityFields(sanitized: Entity): void {
    delete sanitized.lore;
    delete sanitized.artDirection;
    delete sanitized.adventureArtwork;
    if (isPrivateArtworkSnapshotPath(sanitized.image)) delete sanitized.image;
    if (isPrivateArtworkSnapshotPath(sanitized.thumbnail)) {
      delete sanitized.thumbnail;
    }
    delete (sanitized as any)._path;
  }

  private static sanitizeEntityBiome(sanitized: Entity): void {
    if (!sanitized.biome) return;
    const referenceLinks = sanitized.biome.referenceLinks;
    sanitized.biome = { ...sanitized.biome, referenceLinks: [] };
    if (sanitized.content) {
      sanitized.content = this.redactBiomeReferenceLinks(
        sanitized.content,
        referenceLinks,
      );
    }
  }

  private static sanitizeEntity(
    entity: Entity,
    includedEntitiesMap: globalThis.Map<string, Entity>,
    includedEntityIds: Set<string>,
    allKnownEntityIds: Set<string>,
    sanitizeStatSheet?: GuestSheetSanitizer,
  ): Entity {
    const sanitized = { ...entity };
    GuestExporter.stripPrivateEntityFields(sanitized);
    if (sanitized.statSheet) {
      sanitized.statSheet = this.sanitizeSheet(
        sanitized.statSheet,
        includedEntitiesMap,
        sanitizeStatSheet,
      );
    }
    GuestExporter.sanitizeEntityBiome(sanitized);
    if (sanitized.content) {
      sanitized.content = this.redactDanglingLinks(
        sanitized.content,
        includedEntityIds,
        allKnownEntityIds,
      );
    }
    return sanitized;
  }

  private static sanitizeMetadata(
    metadata: ExporterOptions["metadata"],
  ): ExporterOptions["metadata"] {
    if (metadata && isPrivateArtworkSnapshotPath(metadata.coverImage)) {
      return { ...metadata, coverImage: undefined };
    }
    return metadata;
  }

  /**
   * Compiles a sanitized guest-safe bundle of a campaign.
   * Excludes drafts and entities hidden by VisibilitySettings (Fog of War).
   * Redacts inline links to private/excluded entities.
   * Strips out GM secrets like lore and artDirection.
   */
  // fallow-ignore-next-line complexity -- Adventure artwork orchestration; branches are validation and fallback guards covered by feature tests.
  static export(
    options: ExporterOptions,
    clock: Clock = systemClock,
  ): GuestBundle {
    const {
      entities,
      defaultVisibility,
      activeTheme,
      publishId,
      vaultTitle,
      publisherVersion,
      maps = [],
      canvases = [],
      assetManifest = [],
      metadata,
      sanitizeStatSheet,
    } = options;

    const allKnownEntityIds = new Set(entities.map((e) => e.id));
    const includedEntitiesMap = GuestExporter.collectIncludedEntities(
      entities,
      defaultVisibility,
    );
    const includedEntityIds = new Set(includedEntitiesMap.keys());
    const sanitizedEntities = [...includedEntitiesMap.values()].map((entity) =>
      GuestExporter.sanitizeEntity(
        entity,
        includedEntitiesMap,
        includedEntityIds,
        allKnownEntityIds,
        sanitizeStatSheet,
      ),
    );

    return {
      schemaVersion: 1,
      publishId,
      vaultTitle,
      publishedAt: new Date(clock.now()).toISOString(),
      publisherVersion,
      activeTheme: activeTheme || {},
      metadata: GuestExporter.sanitizeMetadata(metadata),
      entities: sanitizedEntities,
      relationships: GuestExporter.buildGuestRelationships(
        includedEntitiesMap,
        includedEntityIds,
      ),
      maps: GuestExporter.sanitizeGuestMaps(maps, includedEntityIds),
      canvases: GuestExporter.sanitizeGuestCanvases(
        canvases,
        includedEntityIds,
      ),
      assetManifest: assetManifest.filter(
        (item) => !isPrivateArtworkSnapshotPath(item.filename),
      ),
    };
  }

  /**
   * Replaces any inline markdown links referencing private or excluded entities with a [Redacted] placeholder.
   */
  static redactDanglingLinks(
    content: string,
    includedEntityIds: Set<string>,
    allKnownEntityIds: Set<string>,
  ): string {
    if (!content) return "";
    return content.replace(
      /(^|[^!])\[([^\]]*)\]\(([^)]+)\)/g,
      (match, prefix, text, target) => {
        const cleanTarget = target.split("#")[0].trim();
        let resolvedId = cleanTarget;
        if (resolvedId.startsWith("file:///")) {
          resolvedId = resolvedId.substring(8);
        }
        if (resolvedId.endsWith(".md")) {
          resolvedId = resolvedId.substring(0, resolvedId.length - 3);
        } else if (resolvedId.endsWith(".markdown")) {
          resolvedId = resolvedId.substring(0, resolvedId.length - 9);
        }

        const lastSegment = resolvedId.substring(
          resolvedId.lastIndexOf("/") + 1,
        );

        // Check if target points to a known entity in the vault
        const isTargetKnownEntity =
          allKnownEntityIds.has(resolvedId) ||
          allKnownEntityIds.has(lastSegment) ||
          allKnownEntityIds.has(cleanTarget);

        const isTargetIncluded =
          includedEntityIds.has(resolvedId) ||
          includedEntityIds.has(lastSegment) ||
          includedEntityIds.has(cleanTarget);

        if (isTargetKnownEntity) {
          if (!isTargetIncluded) {
            return `${prefix}[Redacted]`;
          }
        }
        return match;
      },
    );
  }
}
