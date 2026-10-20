import { describe, expect, it, vi } from "vitest";
import { buildBusinessSavePlan, generateBusinessLocal } from "generator-engine";
import {
  applyBusinessChoices,
  saveBusinessToVault,
  type BusinessVaultGateway,
} from "./business-vault-save";

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gateway(overrides: Partial<BusinessVaultGateway> = {}) {
  let n = 0;
  const vault = {
    createEntity: vi.fn(
      async (_type: string, title: string) => `ent-${++n}-${title}`,
    ),
    addConnection: vi.fn(async () => true),
    bulkDelete: vi.fn(async () => ({ failedIds: [], cancelledIds: [] })),
    ...overrides,
  } as unknown as BusinessVaultGateway & {
    createEntity: ReturnType<typeof vi.fn>;
    addConnection: ReturnType<typeof vi.fn>;
    bulkDelete: ReturnType<typeof vi.fn>;
  };
  return vault;
}

function plan(seed = 41, existing: Array<[string, string]> = []) {
  const doc = generateBusinessLocal(
    {
      genre: "Classic Fantasy",
      businessType: "Blacksmith",
      scale: "established",
    },
    seeded(seed),
  );
  return buildBusinessSavePlan(doc, { existingTitles: new Map(existing) });
}

describe("saveBusinessToVault", () => {
  it("creates the Faction and the ticked people, then links them", async () => {
    const p = plan();
    const vault = gateway();
    const result = await saveBusinessToVault(p, vault);
    expect(vault.createEntity).toHaveBeenCalledWith(
      "faction",
      p.business.title,
      expect.any(Object),
    );
    const characterCalls = vault.createEntity.mock.calls.filter(
      (c) => c[0] === "character",
    );
    expect(characterCalls).toHaveLength(p.people.length);
    expect(result.businessId).toBeTruthy();
    expect(vault.addConnection).toHaveBeenCalledWith(
      result.businessId,
      expect.any(String),
      "owned by",
    );
  });

  it("only connects a matched party and never updates its entity", async () => {
    const p = plan(42, []);
    const doc = generateBusinessLocal(
      {
        genre: "Classic Fantasy",
        businessType: "Blacksmith",
        scale: "established",
      },
      seeded(42),
    );
    const existing = doc.relationships[0];
    const matched = buildBusinessSavePlan(doc, {
      existingTitles: new Map([[existing.name.toLowerCase(), "ent-existing"]]),
    });
    const vault = gateway();
    await saveBusinessToVault(matched, vault);
    expect(vault.addConnection).toHaveBeenCalledWith(
      expect.any(String),
      "ent-existing",
      existing.label,
    );
    const creates = vault.createEntity.mock.calls.map((c) => c[1]);
    expect(creates).not.toContain(existing.name);
    expect(p).toBeDefined();
  });

  it("creates a new party only when it is ticked", async () => {
    const doc = generateBusinessLocal(
      {
        genre: "Classic Fantasy",
        businessType: "Blacksmith",
        scale: "established",
      },
      seeded(43),
    );
    const unticked = buildBusinessSavePlan(doc, { existingTitles: new Map() });
    const vault = gateway();
    await saveBusinessToVault(unticked, vault);
    const titles = vault.createEntity.mock.calls.map((c) => c[1]);
    expect(titles).not.toContain(doc.relationships[0].name);
  });

  it("skips unticked people and writes no connection to them", async () => {
    const p = plan(44);
    p.people = p.people.map((person) => ({ ...person, ticked: false }));
    const vault = gateway();
    await saveBusinessToVault(p, vault);
    expect(
      vault.createEntity.mock.calls.filter((c) => c[0] === "character"),
    ).toHaveLength(0);
  });

  it("removes everything it created and rethrows when a connection fails", async () => {
    const vault = gateway({
      addConnection: vi.fn(async () => {
        throw new Error("write failed");
      }),
    });
    await expect(saveBusinessToVault(plan(45), vault)).rejects.toThrow(
      "write failed",
    );
    expect(vault.bulkDelete).toHaveBeenCalledTimes(1);
    const removed = vault.bulkDelete.mock.calls[0][0] as string[];
    expect(removed.length).toBeGreaterThan(0);
  });

  it("removes everything it created when a later entity fails", async () => {
    let calls = 0;
    const vault = gateway({
      createEntity: vi.fn(async (_t: string, title: string) => {
        calls++;
        if (calls === 3) throw new Error("disk full");
        return `ent-${calls}-${title}`;
      }),
    });
    await expect(saveBusinessToVault(plan(46), vault)).rejects.toThrow(
      "disk full",
    );
    // The business and the first person were created before the failure; both are removed.
    expect(vault.bulkDelete).toHaveBeenCalledTimes(1);
    expect(vault.bulkDelete.mock.calls[0][0]).toHaveLength(2);
  });

  it("writes nothing when the save was cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    const vault = gateway();
    await expect(
      saveBusinessToVault(plan(47), vault, { signal: controller.signal }),
    ).rejects.toThrow();
    expect(vault.createEntity).not.toHaveBeenCalled();
  });

  it("applies the user's choices before saving: untick a person, tick a new party", async () => {
    const doc = generateBusinessLocal(
      {
        genre: "Classic Fantasy",
        businessType: "Blacksmith",
        scale: "established",
      },
      seeded(48),
    );
    const p = buildBusinessSavePlan(doc, { existingTitles: new Map() });
    const vault = gateway();
    await saveBusinessToVault(p, vault, {
      tickedPersonIds: [doc.leadership.id],
      partyTicks: { [doc.relationships[0].id]: true },
    });
    const titles = vault.createEntity.mock.calls.map((c) => c[1]);
    expect(titles).toContain(doc.relationships[0].name);
    expect(titles).not.toContain(doc.staff[0]?.name ?? "__none__");
  });
});

describe("applyBusinessChoices renames", () => {
  it("renames a person in the business text as well as in the Character title", async () => {
    const doc = generateBusinessLocal(
      {
        genre: "Classic Fantasy",
        businessType: "Blacksmith",
        scale: "established",
      },
      seeded(49),
    );
    const p = buildBusinessSavePlan(doc, { existingTitles: new Map() });
    const applied = applyBusinessChoices(p, {
      renames: { [doc.leadership.id]: "Iska Venn" },
    });
    expect(applied.people[0].draft.title).toBe("Iska Venn");
    expect(applied.business.content).not.toContain(doc.leadership.name);
    expect(applied.business.content).toContain("Iska Venn");
  });

  it("keeps the business text when nothing is renamed", () => {
    const doc = generateBusinessLocal(
      {
        genre: "Classic Fantasy",
        businessType: "Blacksmith",
        scale: "established",
      },
      seeded(50),
    );
    const p = buildBusinessSavePlan(doc, { existingTitles: new Map() });
    expect(applyBusinessChoices(p, {}).business.content).toBe(
      p.business.content,
    );
  });
});

describe("saveBusinessToVault rollback", () => {
  it("reports incomplete rollback when bulkDelete resolves with failed or cancelled ids", async () => {
    const vault = gateway({
      addConnection: vi.fn(async () => {
        throw new Error("write failed");
      }),
      bulkDelete: vi.fn(async (ids: string[]) => ({
        failedIds: [ids[0]],
        cancelledIds: [ids[1]],
      })),
    });
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(saveBusinessToVault(plan(59), vault)).rejects.toThrow(
      "rollback was incomplete",
    );
    expect(logged).toHaveBeenCalledWith(
      "Could not remove all entities from a partial business save:",
      expect.any(Array),
    );
    logged.mockRestore();
  });

  it("rethrows the original write error even when the cleanup also fails", async () => {
    const vault = gateway({
      addConnection: vi.fn(async () => {
        throw new Error("write failed");
      }),
      bulkDelete: vi.fn(async () => {
        throw new Error("cleanup failed");
      }),
    });
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(saveBusinessToVault(plan(60), vault)).rejects.toThrow(
      "rollback was incomplete",
    );
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });
});
