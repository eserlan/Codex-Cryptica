import { type SessionEntity, type ProvenanceRecord } from "generator-engine";
import { type IdGenerator, systemIdGenerator, browserSessionStorage, type StorageLike } from "$lib/utils/runtime-deps";

export const SESSION_DRAFTS_KEY = "SESSION_DRAFTS";

export interface SessionHubState {
  version: 2;
  entities: SessionEntity[];
  provenance: Record<string, ProvenanceRecord>;
  nextOrder: number;
}

export class SessionHubStore {
  entities = $state<SessionEntity[]>([]);
  provenance = $state<Record<string, ProvenanceRecord>>({});
  nextOrder = $state(1);

  private idGenerator: IdGenerator;
  private storage: StorageLike;

  constructor(
    idGenerator: IdGenerator = systemIdGenerator,
    storage: StorageLike = browserSessionStorage
  ) {
    this.idGenerator = idGenerator;
    this.storage = storage;

    // Only load if not SSR (or if mock storage is provided)
    if (typeof window !== "undefined" || storage !== browserSessionStorage) {
      this.load();
    }
  }

  load() {
    try {
      const data = this.storage.getItem(SESSION_DRAFTS_KEY);
      if (!data) return;

      const parsed = JSON.parse(data);

      if (Array.isArray(parsed)) {
        // Migration from version 1 (SessionDraft[])
        let order = 1;
        this.entities = parsed.map((draft: any) => ({
          id: draft.id || this.idGenerator.uuid(),
          type: draft.type || "note",
          title: draft.title || "Untitled",
          summary: draft.summary,
          content: draft.content || "",
          lore: draft.lore,
          labels: Array.isArray(draft.labels) ? draft.labels : [],
          status: draft.status || "draft",
          reuseEnabled: true,
          pinned: false,
          selectedForSave: true,
          createdOrder: order++,
        }));
        this.provenance = {};
        this.nextOrder = order;
        this.save();
      } else if (parsed && parsed.version === 2) {
        this.entities = (parsed.entities || []).map(
          (entity: SessionEntity) => ({
            ...entity,
            selectedForSave: entity.selectedForSave ?? true,
          }),
        );
        this.provenance = parsed.provenance || {};
        this.nextOrder = parsed.nextOrder || 1;
      }
    } catch (err) {
      console.warn("[SessionHubStore] Failed to load from storage", err);
    }
  }

  save() {
    if (typeof window === "undefined" && this.storage === browserSessionStorage) return;
    try {
      const state: SessionHubState = {
        version: 2,
        entities: $state.snapshot(this.entities),
        provenance: $state.snapshot(this.provenance),
        nextOrder: this.nextOrder,
      };
      this.storage.setItem(SESSION_DRAFTS_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("[SessionHubStore] Failed to save to storage", err);
    }
  }

  addEntity(entityData: Omit<SessionEntity, "id" | "createdOrder">): string {
    const id = this.idGenerator.uuid();
    const newEntity: SessionEntity = {
      ...entityData,
      selectedForSave: entityData.selectedForSave ?? true,
      id,
      createdOrder: this.nextOrder++,
    };
    this.entities.push(newEntity);
    this.save();
    return id;
  }

  updateEntity(id: string, updates: Partial<SessionEntity>) {
    const index = this.entities.findIndex((e) => e.id === id);
    if (index !== -1) {
      this.entities[index] = { ...this.entities[index], ...updates };
      this.save();
    }
  }

  removeEntity(id: string) {
    this.entities = this.entities.filter((e) => e.id !== id);
    delete this.provenance[id];
    this.save();
  }

  addProvenance(record: ProvenanceRecord) {
    this.provenance[record.resultEntityId] = record;
    this.save();
  }

  clear() {
    this.entities = [];
    this.provenance = {};
    this.nextOrder = 1;
    this.save();
  }
}

export const sessionHubStore = new SessionHubStore();
