import { type SessionEntity, type ProvenanceRecord } from "generator-engine";

export const SESSION_DRAFTS_KEY = "SESSION_DRAFTS";

export interface SessionHubState {
  version: 2;
  entities: SessionEntity[];
  provenance: Record<string, ProvenanceRecord>;
  nextOrder: number;
}

// Ensure unique IDs
function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15);
}

export class SessionHubStore {
  entities = $state<SessionEntity[]>([]);
  provenance = $state<Record<string, ProvenanceRecord>>({});
  nextOrder = $state(1);

  constructor() {
    // Only access sessionStorage in browser environments
    if (typeof window !== "undefined") {
      this.load();
    }
  }

  load() {
    try {
      const data = sessionStorage.getItem(SESSION_DRAFTS_KEY);
      if (!data) return;

      const parsed = JSON.parse(data);

      if (Array.isArray(parsed)) {
        // Migration from version 1 (SessionDraft[])
        let order = 1;
        this.entities = parsed.map((draft: any) => ({
          id: draft.id || generateId(),
          type: draft.type || "note",
          title: draft.title || "Untitled",
          summary: draft.summary,
          content: draft.content || "",
          lore: draft.lore,
          labels: Array.isArray(draft.labels) ? draft.labels : [],
          status: draft.status || "draft",
          reuseEnabled: true,
          pinned: false,
          createdOrder: order++,
        }));
        this.provenance = {};
        this.nextOrder = order;
        this.save();
      } else if (parsed && parsed.version === 2) {
        this.entities = parsed.entities || [];
        this.provenance = parsed.provenance || {};
        this.nextOrder = parsed.nextOrder || 1;
      }
    } catch (err) {
      console.warn("[SessionHubStore] Failed to load from sessionStorage", err);
    }
  }

  save() {
    if (typeof window === "undefined") return;
    try {
      const state: SessionHubState = {
        version: 2,
        entities: $state.snapshot(this.entities),
        provenance: $state.snapshot(this.provenance),
        nextOrder: this.nextOrder,
      };
      sessionStorage.setItem(SESSION_DRAFTS_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("[SessionHubStore] Failed to save to sessionStorage", err);
    }
  }

  addEntity(entityData: Omit<SessionEntity, "id" | "createdOrder">): string {
    const id = generateId();
    const newEntity: SessionEntity = {
      ...entityData,
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
