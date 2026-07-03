import type {
  VaultWriter,
  NewEntityInput,
  EntityPatch,
  AssetInput,
  Connection,
} from "../../../src/cc/ports";

export interface FakeEntity extends NewEntityInput {
  id: string;
}

export class FakeVaultWriter implements VaultWriter {
  private entities = new Map<string, FakeEntity>();
  private nextId = 1;

  async findBySourceRef(sourceRef: string): Promise<{ id: string } | null> {
    for (const entity of this.entities.values()) {
      if (entity.discoverySource === sourceRef) {
        return { id: entity.id };
      }
    }
    return null;
  }

  async createEntity(entity: NewEntityInput): Promise<{ id: string }> {
    const id = `entity-${this.nextId++}`;
    this.entities.set(id, { ...entity, id });
    return { id };
  }

  async updateEntity(id: string, patch: EntityPatch): Promise<void> {
    const existing = this.entities.get(id);
    if (!existing) throw new Error(`Entity ${id} not found`);
    // Field-level merge — only overwrite keys present in patch; preserve all others.
    const updated = { ...existing };
    for (const key of Object.keys(patch) as Array<keyof EntityPatch>) {
      if (patch[key] !== undefined) {
        (updated as Record<string, unknown>)[key] = patch[key];
      }
    }
    this.entities.set(id, updated);
  }

  async appendConnection(id: string, connection: Connection): Promise<void> {
    const existing = this.entities.get(id);
    if (!existing) throw new Error(`Entity ${id} not found`);
    this.entities.set(id, {
      ...existing,
      connections: [...(existing.connections ?? []), connection],
    });
  }

  async saveAsset(_asset: AssetInput): Promise<{ ref: string }> {
    return { ref: `assets/saved-${this.nextId++}` };
  }

  getEntity(id: string): FakeEntity | undefined {
    return this.entities.get(id);
  }

  allEntities(): FakeEntity[] {
    return Array.from(this.entities.values());
  }

  seed(id: string, entity: NewEntityInput): void {
    this.entities.set(id, { ...entity, id });
  }
}
