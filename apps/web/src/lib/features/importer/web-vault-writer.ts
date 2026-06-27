import type { Entity } from "schema";
import type {
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
  constructor(private store: VaultWriterStoreLike) {}

  async findBySourceRef(sourceRef: string): Promise<{ id: string } | null> {
    for (const entity of Object.values(this.store.entities)) {
      if (entity.id && entity.discoverySource === sourceRef) {
        return { id: entity.id };
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
        labels: entity.tags,
        metadata: entity.metadata as Entity["metadata"],
        discoverySource: entity.discoverySource,
        parent: entity.parent,
        connections: entity.connections as Entity["connections"],
      },
    );

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
          labels: entity.tags,
          metadata: entity.metadata as Entity["metadata"],
          discoverySource: entity.discoverySource,
          parent: entity.parent,
          connections: entity.connections as Entity["connections"],
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
      return { id: match.id };
    });
  }

  async updateEntity(id: string, patch: EntityPatch): Promise<void> {
    const success = await this.store.updateEntity(id, {
      type: patch.type as Entity["type"],
      title: patch.title,
      content: patch.content,
      lore: patch.lore,
      tags: patch.tags,
      labels: patch.tags,
      metadata: patch.metadata as Entity["metadata"],
      parent: patch.parent,
      connections: patch.connections as Entity["connections"],
    });

    if (!success) {
      throw new Error(`Entity ${id} not found`);
    }
  }

  async appendConnection(id: string, connection: Connection): Promise<void> {
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

export function createWebVaultWriter(store: VaultWriterStoreLike) {
  return new WebVaultWriter(store);
}
