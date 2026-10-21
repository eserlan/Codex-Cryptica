import {
  isEntityVisible,
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

  /**
   * Compiles a sanitized guest-safe bundle of a campaign.
   * Excludes drafts and entities hidden by VisibilitySettings (Fog of War).
   * Redacts inline links to private/excluded entities.
   * Strips out GM secrets like lore and artDirection.
   */
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

    const visibilitySettings = {
      sharedMode: true,
      defaultVisibility,
    };

    // 1. Identify which entities are visible / included
    const allKnownEntityIds = new Set(entities.map((e) => e.id));
    const includedEntitiesMap = new Map<string, Entity>();

    for (const entity of entities) {
      // Exclude drafts
      if (entity.status === "draft") {
        continue;
      }

      // Reports can hold GM-only text and are never published
      if (entity.kind === "report") {
        continue;
      }

      // Exclude hidden entities based on Fog of War settings
      if (!isEntityVisible(entity, visibilitySettings)) {
        continue;
      }

      includedEntitiesMap.set(entity.id, entity);
    }

    const includedEntityIds = new Set(includedEntitiesMap.keys());

    // 2. Filter and build relationships
    const guestRelationships: GuestRelationship[] = [];
    for (const entity of includedEntitiesMap.values()) {
      for (const conn of entity.connections ?? []) {
        const targetId = conn.target;
        if (targetId && includedEntityIds.has(targetId)) {
          guestRelationships.push({
            id: `${entity.id}-${targetId}-${conn.type || "neutral"}`,
            sourceId: entity.id,
            targetId,
            label: conn.label || conn.type || "",
            description: "",
          });
        }
      }
    }

    // 3. Filter and sanitize maps
    // hexCrawl is GM-only working data (FR-041): notes, AI drafts and explored
    // state never reach guests. Grid geometry is kept, since it is map layout.
    const guestMaps = maps
      .filter((m) => m.playerVisible === true)
      .map((m) => {
        const pins = (m.pins || []).filter(
          (p) => !p.entityId || includedEntityIds.has(p.entityId),
        );
        const { hexCrawl: _hexCrawl, ...publicMap } = m;
        return {
          ...publicMap,
          pins,
        };
      });

    // 4. Filter and sanitize canvases
    const guestCanvases = canvases
      .filter((c) => c.playerVisible === true)
      .map((c) => {
        const nodes = (c.nodes || []).filter(
          (n: any) => n.type !== "entity" || includedEntityIds.has(n.entityId),
        );
        const nodeIds = new Set(nodes.map((n: any) => n.id));
        const edges = (c.edges || []).filter(
          (e: any) => nodeIds.has(e.source) && nodeIds.has(e.target),
        );
        return {
          ...c,
          nodes,
          edges,
        };
      });

    // 5. Sanitize and redact content for included entities
    const sanitizedEntities: Entity[] = [];
    for (const entity of includedEntitiesMap.values()) {
      // Clone the entity to avoid modifying the original in-memory state
      const sanitized = { ...entity };

      // Physically delete GM secrets
      delete sanitized.lore;
      delete sanitized.artDirection;

      // Clean runtime fields
      delete (sanitized as any)._path;

      // Stat sheets reach players only through the sanitiser
      if (sanitized.statSheet) {
        sanitized.statSheet = this.sanitizeSheet(
          sanitized.statSheet,
          includedEntitiesMap,
          sanitizeStatSheet,
        );
      }

      // A biome profile's reference links are the owner's private research
      if (sanitized.biome) {
        sanitized.biome = { ...sanitized.biome, referenceLinks: [] };
      }

      // Redact dangling links in content
      if (sanitized.content) {
        sanitized.content = this.redactDanglingLinks(
          sanitized.content,
          includedEntityIds,
          allKnownEntityIds,
        );
      }

      sanitizedEntities.push(sanitized);
    }

    return {
      schemaVersion: 1,
      publishId,
      vaultTitle,
      publishedAt: new Date(clock.now()).toISOString(),
      publisherVersion,
      activeTheme: activeTheme || {},
      metadata,
      entities: sanitizedEntities,
      relationships: guestRelationships,
      maps: guestMaps,
      canvases: guestCanvases,
      assetManifest,
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
