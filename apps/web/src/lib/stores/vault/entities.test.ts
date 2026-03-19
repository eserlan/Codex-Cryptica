import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createEntity,
  updateEntity,
  deleteEntity,
  addLabel,
  removeLabel,
  addConnection,
  updateConnection,
  removeConnection,
  bulkAddLabel,
  bulkRemoveLabel,
  batchCreateEntities,
} from "./entities";
import type { LocalEntity, BatchCreateInput } from "./types";

vi.mock("../../utils/opfs", () => ({
  deleteOpfsEntry: vi.fn().mockResolvedValue(undefined),
}));

import { deleteOpfsEntry } from "../../utils/opfs";

describe("Vault Entities Operations", () => {
  let mockVaultDir: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVaultDir = {
      name: "test-vault",
    };
  });

  describe("createEntity", () => {
    it("should create a basic entity", () => {
      const entities = {};
      const entity = createEntity("My NPC", "npc", {}, entities);
      expect(entity.title).toBe("My NPC");
      expect(entity.type).toBe("npc");
      expect(entity.id).toBeDefined();
    });
  });

  describe("updateEntity", () => {
    it("should update an existing entity", () => {
      const e1 = { id: "e1", title: "Old", connections: [] } as any;
      const entities = { e1 };
      const { updated } = updateEntity(entities, "e1", { title: "New" });
      expect(updated!.title).toBe("New");
      expect(updated!.updatedAt).toBeDefined();
    });

    it("should return null if entity not found", () => {
      const { updated } = updateEntity({}, "missing", { title: "X" });
      expect(updated).toBeNull();
    });
  });

  describe("deleteEntity", () => {
    it("should delete entity and cleanup its files", async () => {
      const e1 = {
        id: "e1",
        title: "E1",
        connections: [],
        image: "img.png",
      } as any;
      const entities = { e1 };

      const { deletedEntity } = await deleteEntity(
        mockVaultDir,
        entities,
        "e1",
      );

      expect(deletedEntity).toBe(e1);
      expect(deleteOpfsEntry).toHaveBeenCalledWith(
        mockVaultDir,
        ["img.png"],
        "test-vault",
      );
    });

    it("should cleanup connections from other nodes", async () => {
      const e1 = { id: "e1", title: "E1", connections: [] } as any;
      const e2 = {
        id: "e2",
        title: "E2",
        connections: [{ target: "e1", type: "enemy" }],
      } as any;
      const entities = { e1, e2 };

      const { entities: newEntities, modifiedIds } = await deleteEntity(
        mockVaultDir,
        entities,
        "e1",
      );

      expect(newEntities["e2"].connections).toHaveLength(0);
      expect(modifiedIds).toContain("e2");
    });
  });

  describe("label operations", () => {
    it("should add and normalized labels", () => {
      const e1 = { id: "e1", labels: [] } as any;
      const { updated } = addLabel({ e1 }, "e1", "  NPC  ");
      expect(updated!.labels).toContain("npc");
    });

    it("should prevent duplicate labels", () => {
      const e1 = { id: "e1", labels: ["npc"] } as any;
      const { updated } = addLabel({ e1 }, "e1", "NPC");
      expect(updated).toBeNull();
    });

    it("should remove labels", () => {
      const e1 = { id: "e1", labels: ["npc", "hero"] } as any;
      const { updated } = removeLabel({ e1 }, "e1", "NPC");
      expect(updated!.labels).toEqual(["hero"]);
    });
  });

  describe("connection operations", () => {
    it("should add a connection", () => {
      const e1 = { id: "e1", connections: [] } as any;
      const { updatedSource } = addConnection(
        { e1 },
        "e1",
        "e2",
        "friend",
        "Bestie",
      );
      expect(updatedSource!.connections[0].target).toBe("e2");
      expect(updatedSource!.connections[0].label).toBe("Bestie");
    });

    it("should update a connection", () => {
      const e1 = {
        id: "e1",
        connections: [{ target: "e2", type: "enemy" }],
      } as any;
      const { updatedSource } = updateConnection(
        { e1 },
        "e1",
        "e2",
        "enemy",
        "friend",
        "Ally",
      );
      expect(updatedSource!.connections[0].type).toBe("friend");
      expect(updatedSource!.connections[0].label).toBe("Ally");
    });

    it("should remove a connection", () => {
      const e1 = {
        id: "e1",
        connections: [{ target: "e2", type: "enemy" }],
      } as any;
      const { updatedSource } = removeConnection({ e1 }, "e1", "e2", "enemy");
      expect(updatedSource!.connections).toHaveLength(0);
    });
  });

  describe("bulk operations", () => {
    it("should bulk add labels", () => {
      const e1 = { id: "e1", labels: [] } as any;
      const e2 = { id: "e2", labels: [] } as any;
      const { entities, modifiedIds } = bulkAddLabel(
        { e1, e2 },
        ["e1", "e2"],
        "story",
      );
      expect(modifiedIds).toHaveLength(2);
      expect(entities["e1"].labels).toContain("story");
    });

    it("should bulk remove labels", () => {
      const e1 = { id: "e1", labels: ["story"] } as any;
      const { entities, modifiedIds } = bulkRemoveLabel(
        { e1 },
        ["e1"],
        "story",
      );
      expect(modifiedIds).toHaveLength(1);
      expect(entities["e1"].labels).not.toContain("story");
    });
  });

  describe("batchCreateEntities", () => {
    it("should handle full LocalEntity objects", () => {
      const existingEntities: Record<string, LocalEntity> = {};
      const newEntities: LocalEntity[] = [
        {
          id: "hero-1",
          title: "Hero 1",
          type: "character",
          tags: [],
          labels: [],
          connections: [],
          content: "Content 1",
          updatedAt: 100,
        } as LocalEntity,
      ];

      const { entities, created } = batchCreateEntities(
        existingEntities,
        newEntities,
      );

      expect(entities["hero-1"]).toBeDefined();
      expect(entities["hero-1"].title).toBe("Hero 1");
      expect(entities["hero-1"].updatedAt).toBeGreaterThan(100); // Should be refreshed
      expect(created).toHaveLength(1);
      expect(created[0].id).toBe("hero-1");
    });

    it("should handle creation requests without IDs", () => {
      const existingEntities: Record<string, LocalEntity> = {};
      const requests: BatchCreateInput[] = [
        {
          type: "location",
          title: "The Misty Mountains",
          initialData: {
            content: "Very cold.",
          },
        },
      ];

      const { entities, created } = batchCreateEntities(
        existingEntities,
        requests,
      );

      const createdEntity = created[0];
      expect(createdEntity.id).toBe("the-misty-mountains");
      expect(createdEntity.title).toBe("The Misty Mountains");
      expect(entities[createdEntity.id]).toBeDefined();
      expect(entities[createdEntity.id].content).toBe("Very cold.");
    });
  });
});
