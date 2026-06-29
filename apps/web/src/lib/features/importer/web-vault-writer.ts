import type { Entity } from "schema";
import type {
  AssociatedDraft,
  AssetInput,
  Connection,
  EntityPatch,
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

export class WebVaultWriter implements VaultWriter {
  private sourceMap: Map<string, string> | null = null;

  constructor(private store: VaultWriterStoreLike) {}

  private getSourceMap(): Map<string, string> {
    if (this.sourceMap) return this.sourceMap;
    const map = new Map<string, string>();
    for (const entity of Object.values(this.store.entities)) {
      if (entity.id && entity.discoverySource) {
        map.set(entity.discoverySource, entity.id);
      }
    }
    this.sourceMap = map;
    return map;
  }

  private draftTitleMap = new Map<string, string>();

  associateDrafts(drafts: AssociatedDraft[]) {
    this.draftTitleMap.clear();
    for (const draft of drafts) {
      this.draftTitleMap.set(draft.sourceRef, draft.title);
    }
  }

  async findBySourceRef(sourceRef: string): Promise<{ id: string } | null> {
    const id = this.getSourceMap().get(sourceRef);
    if (id) return { id };

    // Fallback: match by title / sanitized ID
    const title = this.draftTitleMap.get(sourceRef);
    if (title) {
      const sanitized = sanitizeEntityId(title);
      for (const entity of Object.values(this.store.entities)) {
        if (
          typeof entity.id === "string" &&
          (entity.id === sanitized ||
            (entity.title &&
              entity.title.toLowerCase() === title.toLowerCase()))
        ) {
          return { id: entity.id };
        }
      }
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
        image: entity.image,
        thumbnail: entity.thumbnail,
        metadata: entity.metadata as Entity["metadata"],
        discoverySource: entity.discoverySource,
        parent: entity.parent,
        connections: (entity.connections ?? []) as Entity["connections"],
      },
    );

    if (entity.discoverySource) {
      this.getSourceMap().set(entity.discoverySource, id);
    }

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
          image: entity.image,
          thumbnail: entity.thumbnail,
          metadata: entity.metadata as Entity["metadata"],
          discoverySource: entity.discoverySource,
          parent: entity.parent,
          connections: (entity.connections ?? []) as Entity["connections"],
        },
      })),
    );

    return entities.map((entity) => {
      const match = Object.values(this.store.entities).find(
        (candidate) =>
          typeof candidate.id === "string" &&
          !knownIds.has(candidate.id) &&
          candidate.discoverySource === entity.discoverySource,
      );

      if (!match?.id) {
        throw new Error(
          `Batch-created entity for ${entity.discoverySource} could not be resolved`,
        );
      }

      knownIds.add(match.id);
      if (entity.discoverySource) {
        this.getSourceMap().set(entity.discoverySource, match.id);
      }
      return { id: match.id };
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
      image: patch.image,
      thumbnail: patch.thumbnail,
      metadata: patch.metadata as Entity["metadata"],
      parent: patch.parent,
    };
    if (patch.connections !== undefined) {
      updates.connections = patch.connections as Entity["connections"];
    }
    const success = await this.store.updateEntity(id, updates);

    if (!success) {
      throw new Error(`Entity ${id} not found`);
    }
  }

  async appendConnection(id: string, connection: Connection): Promise<void> {
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

    if (alreadyExists) return;

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
  }

  async saveAsset(_asset: AssetInput): Promise<{ ref: string }> {
    throw new Error(
      "Generic CC asset persistence is not supported by the web vault adapter yet",
    );
  }
}

function sanitizeEntityId(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createWebVaultWriter(store: VaultWriterStoreLike) {
  return new WebVaultWriter(store);
}
