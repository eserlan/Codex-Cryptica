import { describe, it, expect, vi } from "vitest";
import type { Entity } from "schema";

// The module imports the vault singleton for its default dep; stub it so the
// import graph stays light. All tests pass an explicit fake vault.
vi.mock("../vault.svelte", () => ({ vault: { entities: {} } }));

import {
  addFamilyLink,
  removeFamilyLink,
  type FamilyMutationVault,
} from "./family-mutations";

type Conn = { target: string; type: string; strength: number };

function char(id: string, connections: Conn[] = []): Entity {
  return { id, type: "character", title: id, connections } as unknown as Entity;
}

function fakeVault(entities: Record<string, Entity>): FamilyMutationVault {
  return {
    entities,
    addConnection: (s, t, type) => {
      (entities[s].connections as Conn[]).push({
        target: t,
        type,
        strength: 1,
      });
      return true;
    },
    removeConnection: (s, t, type) => {
      entities[s].connections = (entities[s].connections as Conn[]).filter(
        (c) => !(c.target === t && c.type === type),
      );
    },
  };
}

describe("addFamilyLink", () => {
  it("writes both sides with the correct inverse type", async () => {
    const entities = { a: char("a"), b: char("b") };
    const deps = fakeVault(entities);

    const res = await addFamilyLink("a", "b", "parent_of", deps);
    expect(res.ok).toBe(true);

    expect(entities.a.connections).toContainEqual({
      target: "b",
      type: "parent_of",
      strength: 1,
    });
    expect(entities.b.connections).toContainEqual({
      target: "a",
      type: "child_of",
      strength: 1,
    });
  });

  it("stores family links as plain Connection records (no separate store)", async () => {
    const entities = { a: char("a"), b: char("b") };
    await addFamilyLink("a", "b", "spouse_of", fakeVault(entities));
    const conn = entities.a.connections[0] as Conn;
    // A plain connection object living in the entity's connections[] array.
    expect(Object.keys(conn).sort()).toEqual(["strength", "target", "type"]);
    expect(entities.b.connections[0]).toMatchObject({
      target: "a",
      type: "spouse_of",
    });
  });

  it("rejects circular ancestry without writing anything", async () => {
    // a -> b (a parent of b). Now try to make b a parent of a.
    const entities = {
      a: char("a", [{ target: "b", type: "parent_of", strength: 1 }]),
      b: char("b", [{ target: "a", type: "child_of", strength: 1 }]),
    };
    const before = JSON.stringify(entities);

    const res = await addFamilyLink("b", "a", "parent_of", fakeVault(entities));
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/ancestor/i);
    expect(JSON.stringify(entities)).toBe(before);
  });

  it("rejects non-character targets", async () => {
    const entities = {
      a: char("a"),
      place: {
        id: "place",
        type: "location",
        title: "Place",
        connections: [],
      } as unknown as Entity,
    };
    const res = await addFamilyLink(
      "a",
      "place",
      "parent_of",
      fakeVault(entities),
    );
    expect(res.ok).toBe(false);
    expect(entities.a.connections).toHaveLength(0);
  });

  it("rejects self-links", async () => {
    const entities = { a: char("a") };
    const res = await addFamilyLink("a", "a", "spouse_of", fakeVault(entities));
    expect(res.ok).toBe(false);
  });

  it("is idempotent — repeated calls do not duplicate connections", async () => {
    const entities = { a: char("a"), b: char("b") };
    const deps = fakeVault(entities);
    await addFamilyLink("a", "b", "parent_of", deps);
    await addFamilyLink("a", "b", "parent_of", deps);
    expect(entities.a.connections).toHaveLength(1);
    expect(entities.b.connections).toHaveLength(1);
  });

  it("rolls back the forward write if the inverse write fails", async () => {
    const entities: Record<string, Entity> = { a: char("a"), b: char("b") };
    const deps: FamilyMutationVault = {
      entities,
      // Succeed writing on `a`, fail writing the inverse on `b`.
      addConnection: (s, t, type) => {
        if (s === "b") return false;
        (entities[s].connections as Conn[]).push({
          target: t,
          type,
          strength: 1,
        });
        return true;
      },
      removeConnection: (s, t, type) => {
        entities[s].connections = (entities[s].connections as Conn[]).filter(
          (c) => !(c.target === t && c.type === type),
        );
      },
    };

    const res = await addFamilyLink("a", "b", "parent_of", deps);
    expect(res.ok).toBe(false);
    // Forward write was rolled back — no one-sided link left behind.
    expect(entities.a.connections).toHaveLength(0);
    expect(entities.b.connections).toHaveLength(0);
  });
});

describe("removeFamilyLink", () => {
  it("removes both sides", async () => {
    const entities = {
      a: char("a", [{ target: "b", type: "parent_of", strength: 1 }]),
      b: char("b", [{ target: "a", type: "child_of", strength: 1 }]),
    };
    const res = await removeFamilyLink(
      "a",
      "b",
      "parent_of",
      fakeVault(entities),
    );
    expect(res.ok).toBe(true);
    expect(entities.a.connections).toHaveLength(0);
    expect(entities.b.connections).toHaveLength(0);
  });
});
