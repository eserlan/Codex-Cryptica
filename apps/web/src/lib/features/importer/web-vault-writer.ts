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
  /** Pre-cached array form of `entities`, kept in sync by the real vault
   *  store. Iterating this instead of `Object.values(entities)` avoids
   *  reallocating an array on every access (⚡ Bolt Optimization). Optional
   *  so existing callers/mocks that only provide `entities` still work —
   *  falls back to `Object.values(entities)` when absent. */
  allEntities?: Partial<Entity>[];
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
  /** Persists an image into the vault (OPFS) and returns its stored paths. */
  saveImageToVault?(
    blob: Blob | File,
    entityId: string,
    name?: string,
  ): Promise<{ image: string; thumbnail: string }>;
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

  /** `allEntities` when the store provides it, else falls back to
   *  Object.values(entities) — see VaultWriterStoreLike.allEntities. */
  private allEntitiesList(): Partial<Entity>[] {
    return this.store.allEntities ?? Object.values(this.store.entities);
  }

  private initMaps() {
    if (this.sourceMap) return;
    this.sourceMap = new Map<string, string>();
    this.titleMap = new Map<string, string>();
    this.sanitizedIdMap = new Map<string, string>();
    // ⚡ Bolt Optimization: iterate the pre-cached allEntities array instead
    // of reallocating via Object.values(entities).
    for (const entity of this.allEntitiesList()) {
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

    // ⚡ Bolt Optimization: build the Set directly from the pre-cached
    // allEntities array instead of Object.values(entities).map().filter(),
    // avoiding two intermediate array allocations.
    const knownIds = new Set<string>();
    for (const entity of this.allEntitiesList()) {
      if (typeof entity.id === "string") knownIds.add(entity.id);
    }

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

    // ⚡ Bolt Optimization: use the pre-cached allEntities array instead of
    // reallocating via Object.values(entities).
    const currentEntities = this.allEntitiesList();
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

  async saveAsset(asset: AssetInput): Promise<{ ref: string }> {
    if (!this.store.saveImageToVault) {
      throw new Error(
        "This vault store does not support image asset persistence",
      );
    }
    if (!asset.entityId) {
      throw new Error("Asset has no target entity to attach to");
    }

    // "Skip" and in-app edits win: an entity that already has an image keeps
    // it. The asset is reported as already satisfied rather than overwritten.
    const existing = this.store.entities[asset.entityId];
    if (existing?.image) {
      return { ref: existing.image };
    }

    const blob =
      asset.bytes instanceof Blob
        ? asset.bytes
        : new Blob([asset.bytes as BlobPart], { type: asset.mimeType });

    // Deterministic, content-addressed name: repeat imports of the same
    // bytes land on the same stored file instead of accumulating copies.
    const name = asset.contentHash
      ? `cif_${asset.contentHash.slice(0, 16)}`
      : asset.originalName;

    const { image, thumbnail } = await this.store.saveImageToVault(
      blob,
      asset.entityId,
      name,
    );
    // Attach only after a successful save, so a failure can never leave a
    // broken image reference on the entity.
    await this.store.updateEntity(asset.entityId, { image, thumbnail });
    return { ref: image };
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
