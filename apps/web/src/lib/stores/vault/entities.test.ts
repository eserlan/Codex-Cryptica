import { describe, it, expect } from "vitest";
import { batchCreateEntities } from "./entities";
import type { LocalEntity } from "./types";

describe("vault/entities - batchCreateEntities", () => {
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
    const requests = [
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
      requests as any,
    );

    const createdEntity = created[0];
    expect(createdEntity.id).toBe("the-misty-mountains");
    expect(createdEntity.title).toBe("The Misty Mountains");
    expect(entities[createdEntity.id]).toBeDefined();
    expect(entities[createdEntity.id].content).toBe("Very cold.");
  });

  it("should generate unique IDs for creation requests when collision occurs", () => {
    const existingEntities: Record<string, LocalEntity> = {
      forest: { id: "forest", title: "Forest" } as LocalEntity,
    };
    const requests = [
      {
        type: "location",
        title: "Forest",
        initialData: { content: "New Forest" },
      },
    ];

    const { entities, created } = batchCreateEntities(
      existingEntities,
      requests as any,
    );

    expect(created[0].id).toBe("forest-1");
    expect(entities["forest"]).toBeDefined();
    expect(entities["forest-1"]).toBeDefined();
  });

  it("should support mixed full entities and creation requests", () => {
    const existingEntities: Record<string, LocalEntity> = {};
    const mixed = [
      { id: "existing-1", title: "Existing", type: "note" } as LocalEntity,
      { type: "character", title: "New Character", initialData: {} },
    ];

    const { entities, created } = batchCreateEntities(
      existingEntities,
      mixed as any,
    );

    expect(created).toHaveLength(2);
    expect(entities["existing-1"]).toBeDefined();
    expect(entities["new-character"]).toBeDefined();
  });
});
