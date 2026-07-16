import type { Entity } from "schema";
import type {
  AssociatedDraft,
  AssetInput,
  Connection,
  EntityPatch,
  ExistingEntityFields,
  NewEntityInput,
  VaultWriter,
} from "@codex/importer";

export interface VaultWriterStoreLike {
  entities: Record<string, Partial<Entity>>;
  createEntity(
    type: Entity["type"],
    title: string,
    initialData?: Partial<Entity>,
  ): Promise<string>;
  updateEntity(id: string, updates: Partial<Entity>): Promise<boolean>;
  batchCreateEntities?(
    newEntitiesList: Array<{
      type: string;
      title: string;
      initialData: Partial<Entity>;
    }>,
  ): Promise<void>;
  addConnection(
    sourceId: string,
    targetId: string,
    type: string,
    label?: string,
    strength?: number,
  ): Promise<boolean>;
}

export interface WebVaultWriterOptions {
  /** Default `true` (legacy adapters). `false` (CIF) makes `findBySourceRef` exact-match only — no title-based fallback (FR-014). */
  titleFallback?: boolean;
}

export class WebVaultWriter implements VaultWriter {
  private sourceMap: Map<string, string> | null = null;
  private titleMap: Map<string, string> | null = null;
  private sanitizedIdMap: Map<string, string> | null = null;
  private readonly titleFallback: boolean;

  constructor(
    private store: VaultWriterStoreLike,
    options: WebVaultWriterOptions = {},
  ) {
    this.titleFallback = options.titleFallback ?? true;
  }

  private initMaps() {
    if (this.sourceMap) return;
    this.sourceMap = new Map<string, string>();
    this.titleMap = new Map<string, string>();
    this.sanitizedIdMap = new Map<string, string>();
    for (const entity of Object.values(this.store.entities)) {
      if (typeof entity.id === "string") {
        if (entity.discoverySource) {
          this.sourceMap.set(entity.discoverySource, entity.id);
        }
        if (entity.title) {
          this.titleMap.set(entity.title.toLowerCase(), entity.id);
        }
        this.sanitizedIdMap.set(entity.id, entity.id);
      }
    }
  }

  private draftTitleMap = new Map<string, string>();

  associateDrafts(drafts: AssociatedDraft[]) {
    this.draftTitleMap.clear();
    for (const draft of drafts) {
      this.draftTitleMap.set(draft.sourceRef, draft.title);
    }
  }

  async findBySourceRef(sourceRef: string): Promise<{ id: string } | null> {
    this.initMaps();
    const id = this.sourceMap!.get(sourceRef);
    if (id) return { id };
    if (!this.titleFallback) return null;

    // Fallback: match by title / sanitized ID
    const title = this.draftTitleMap.get(sourceRef);
    if (title) {
      const sanitized = sanitizeEntityId(title);
      const matchIdBySanitized = this.sanitizedIdMap!.get(sanitized);
      if (matchIdBySanitized) return { id: matchIdBySanitized };

      const matchIdByTitle = this.titleMap!.get(title.toLowerCase());
      if (matchIdByTitle) return { id: matchIdByTitle };
    }
    return null;
  }

  async createEntity(entity: NewEntityInput): Promise<{ id: string }> {
    const id = await this.store.createEntity(
      entity.type as Entity["type"],
      entity.title,
      {
        content: entity.content,
        lore: entity.lore,
        tags: entity.tags,
        labels: entity.labels ?? [],
        aliases: entity.aliases,
        image: entity.image,
        thumbnail: entity.thumbnail,
        metadata: entity.metadata as Entity["metadata"],
        discoverySource: entity.discoverySource,
        parent: entity.parent,
        start_date: toTemporalMetadata(entity.startDate),
        end_date: toTemporalMetadata(entity.endDate),
        connections: (entity.connections ?? []) as Entity["connections"],
      },
    );

    this.initMaps();
    if (entity.discoverySource) {
      this.sourceMap!.set(entity.discoverySource, id);
    }
    this.titleMap!.set(entity.title.toLowerCase(), id);
    this.sanitizedIdMap!.set(id, id);

    return { id };
  }

  async batchCreateEntities(
    entities: NewEntityInput[],
  ): Promise<Array<{ id: string }>> {
    if (!this.store.batchCreateEntities) {
      const created: Array<{ id: string }> = [];
      for (const entity of entities) {
        created.push(await this.createEntity(entity));
      }
      return created;
    }

    const knownIds = new Set(
      Object.values(this.store.entities)
        .map((entity) => entity.id)
        .filter((id): id is string => typeof id === "string"),
    );

    await this.store.batchCreateEntities(
      entities.map((entity) => ({
        type: entity.type,
        title: entity.title,
        initialData: {
          content: entity.content,
          lore: entity.lore,
          tags: entity.tags,
          labels: entity.labels ?? [],
          aliases: entity.aliases,
          image: entity.image,
          thumbnail: entity.thumbnail,
          metadata: entity.metadata as Entity["metadata"],
          discoverySource: entity.discoverySource,
          parent: entity.parent,
          start_date: toTemporalMetadata(entity.startDate),
          end_date: toTemporalMetadata(entity.endDate),
          connections: (entity.connections ?? []) as Entity["connections"],
        },
      })),
    );

    const currentEntities = Object.values(this.store.entities);
    const candidateMap = new Map<string, string>();
    for (const candidate of currentEntities) {
      if (
        typeof candidate.id === "string" &&
        !knownIds.has(candidate.id) &&
        candidate.discoverySource
      ) {
        candidateMap.set(candidate.discoverySource, candidate.id);
      }
    }

    this.initMaps();

    return entities.map((entity) => {
      const matchId = entity.discoverySource
        ? candidateMap.get(entity.discoverySource)
        : undefined;

      if (!matchId) {
        throw new Error(
          `Batch-created entity for ${entity.discoverySource} could not be resolved`,
        );
      }

      knownIds.add(matchId);
      if (entity.discoverySource) {
        this.sourceMap!.set(entity.discoverySource, matchId);
      }
      this.titleMap!.set(entity.title.toLowerCase(), matchId);
      this.sanitizedIdMap!.set(matchId, matchId);
      return { id: matchId };
    });
  }

  async updateEntity(id: string, patch: EntityPatch): Promise<void> {
    const updates: Partial<Entity> = {
      type: patch.type as Entity["type"],
      title: patch.title,
      content: patch.content,
      lore: patch.lore,
      tags: patch.tags,
      labels: patch.labels,
      aliases: patch.aliases,
      image: patch.image,
      thumbnail: patch.thumbnail,
      metadata: patch.metadata as Entity["metadata"],
      parent: patch.parent,
      start_date: toTemporalMetadata(patch.startDate),
      end_date: toTemporalMetadata(patch.endDate),
    };
    if (patch.connections !== undefined) {
      updates.connections = patch.connections as Entity["connections"];
    }
    const success = await this.store.updateEntity(id, updates);

    if (!success) {
      throw new Error(`Entity ${id} not found`);
    }

    if (patch.title) {
      this.initMaps();
      this.titleMap!.set(patch.title.toLowerCase(), id);
    }
  }

  async appendConnection(
    id: string,
    connection: Connection,
  ): Promise<{ created: boolean }> {
    const source = this.store.entities[id];
    if (!source) {
      throw new Error(`Entity ${id} not found`);
    }

    const existingConnections = (source.connections ??
      []) as Entity["connections"];
    const nextConnection = {
      ...connection,
      strength: 1,
    } as Entity["connections"][number];

    const alreadyExists = existingConnections.some(
      (existing) =>
        existing.target === nextConnection.target &&
        existing.type === nextConnection.type &&
        existing.label === nextConnection.label,
    );

    if (alreadyExists) return { created: false };

    const success = await this.store.addConnection(
      id,
      connection.target,
      connection.type,
      connection.label,
      1,
    );

    if (!success) {
      throw new Error(`Failed to append connection for entity ${id}`);
    }
    return { created: true };
  }

  async getEntityFields(id: string): Promise<ExistingEntityFields | null> {
    const entity = this.store.entities[id];
    if (!entity) return null;
    return {
      title: entity.title ?? "",
      content: entity.content ?? "",
      lore: entity.lore,
      labels: entity.labels,
      aliases: entity.aliases,
      type: (entity.type as string) ?? "",
      parent: entity.parent,
      startDate: fromTemporalMetadata(entity.start_date),
      endDate: fromTemporalMetadata(entity.end_date),
    };
  }

  async saveAsset(_asset: AssetInput): Promise<{ ref: string }> {
    throw new Error(
      "Generic CC asset persistence is not supported by the web vault adapter yet",
    );
  }
}

function toTemporalMetadata(
  date: NewEntityInput["startDate"],
): Entity["start_date"] {
  if (!date) return undefined;
  return {
    year: date.year,
    month: date.month,
    day: date.day,
  } as Entity["start_date"];
}

function fromTemporalMetadata(
  date: Entity["start_date"],
): ExistingEntityFields["startDate"] {
  if (!date || typeof (date as { year?: unknown }).year !== "number") {
    return undefined;
  }
  const { year, month, day } = date as {
    year: number;
    month?: number;
    day?: number;
  };
  return { year, month, day };
}

function sanitizeEntityId(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createWebVaultWriter(
  store: VaultWriterStoreLike,
  options?: WebVaultWriterOptions,
) {
  return new WebVaultWriter(store, options);
}
