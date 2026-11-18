import { describe, expect, it, vi } from "vitest";
import type { AdventureJsonV1 } from "@codex/adventure-engine";
import { buildCreatureProposals } from "@codex/adventure-engine";
import {
  importCreatures,
  initialCreatureChoices,
  type CreatureImportDeps,
  type ExistingCreature,
} from "./adventure-creature-import.js";

const pkg = {
  id: "lair",
  version: "1.0.0",
  source: { title: "The Lair", license: "CC BY 4.0" },
  actors: [
    {
      id: "a1",
      name: "Gnoll",
      summary: "s",
      visibility: "player-visible",
      epistemicStatus: "source-stated",
    },
    {
      id: "a2",
      name: "Spider",
      summary: "s",
      visibility: "gm-only",
      epistemicStatus: "source-stated",
    },
    {
      id: "a3",
      name: "Wolf",
      summary: "s",
      visibility: "player-visible",
      epistemicStatus: "source-stated",
    },
  ],
  encounters: [
    {
      id: "e1",
      title: "Gate",
      description: "",
      actorIds: ["a1", "a2", "a3"],
      alternativeSolutions: [],
      visibility: "player-visible",
      epistemicStatus: "source-stated",
    },
  ],
} as unknown as AdventureJsonV1;

function setup(
  creatures: ExistingCreature[] = [],
  overrides: Partial<CreatureImportDeps> = {},
) {
  const createEntity = vi.fn(
    async (_t: string, title: string, _data: Record<string, unknown>) =>
      `id-${title}`,
  );
  const saveImage = vi.fn(async () => ({ ok: true as const }));
  const deps: CreatureImportDeps = {
    getVaultId: () => "v1",
    createEntity,
    saveImage,
    ...overrides,
  };
  const choices = initialCreatureChoices(
    pkg,
    buildCreatureProposals(pkg),
    creatures,
  );
  return { deps, choices, createEntity, saveImage };
}

describe("importCreatures", () => {
  it("creates creatures, hiding concealed ones and recording provenance", async () => {
    const { deps, choices, createEntity, saveImage } = setup();
    const result = await importCreatures(pkg, "h".repeat(64), choices, deps);
    expect(result).toMatchObject({ created: 3, reused: 0, failures: [] });
    expect(createEntity).toHaveBeenCalledTimes(3);
    const spider = createEntity.mock.calls[1] as unknown as [
      string,
      string,
      Record<string, unknown>,
    ];
    expect(spider[0]).toBe("creature");
    expect(spider[2]).toMatchObject({
      labels: ["hidden"],
      visibility: "hidden",
      adventureSource: { packageId: "lair", actorIds: ["a2"] },
    });
    const gnoll = createEntity.mock.calls[0]![2] as Record<string, unknown>;
    expect(gnoll).not.toHaveProperty("labels");
    expect(gnoll).not.toHaveProperty("visibility");
    expect(saveImage).not.toHaveBeenCalled();
  });

  it("skips excluded choices without writing", async () => {
    const { deps, choices, createEntity } = setup();
    for (const choice of choices) choice.include = false;
    const result = await importCreatures(pkg, "h", choices, deps);
    expect(result.created).toBe(0);
    expect(createEntity).not.toHaveBeenCalled();
  });

  it("reuses matches by source actor id or title and writes nothing for them", async () => {
    const { deps, choices, createEntity, saveImage } = setup([
      {
        id: "x",
        title: "Other name",
        adventureSource: {
          packageId: "lair",
          packageVersion: "0.9.0",
          packageHash: "old",
          actorIds: ["a1"],
          encounterIds: [],
          sourceTitle: "The Lair",
        },
      },
      { id: "y", title: "  wolf " },
    ]);
    expect(choices[0]!.existing?.id).toBe("x");
    expect(choices[2]!.existing?.id).toBe("y");
    choices[0]!.file = new File(["x"], "a.png", { type: "image/png" });
    const result = await importCreatures(pkg, "h", choices, deps);
    expect(result).toMatchObject({ created: 1, reused: 2 });
    expect(createEntity).toHaveBeenCalledTimes(1);
    expect(createEntity.mock.calls[0]![1]).toBe("Spider");
    expect(saveImage).not.toHaveBeenCalled();
  });

  it("does not match a same-actor id from another package", () => {
    const { choices } = setup([
      {
        id: "z",
        title: "Unrelated",
        adventureSource: {
          packageId: "other",
          packageVersion: "1",
          packageHash: "h",
          actorIds: ["a1"],
          encounterIds: [],
          sourceTitle: "Other",
        },
      },
    ]);
    expect(choices[0]!.existing).toBeUndefined();
  });

  it("saves a chosen image with the new id and reports a failed save", async () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    const saveImage = vi.fn().mockRejectedValue(new Error("nope"));
    const { deps, choices, createEntity } = setup([], { saveImage });
    choices[0]!.file = file;
    choices[0]!.artCredit = "J. Artist";
    const result = await importCreatures(pkg, "h", choices, deps);
    expect(saveImage).toHaveBeenCalledWith("id-Gnoll", file, "v1");
    expect(createEntity).toHaveBeenCalledTimes(3);
    expect(result.created).toBe(3);
    expect(result.failures).toEqual(["Gnoll: created without its image."]);
    const data = createEntity.mock.calls[0]![2] as unknown as {
      content: string;
      adventureSource: { artCredit: string };
    };
    expect(data.content).toContain("Art: J. Artist");
    expect(data.adventureSource.artCredit).toBe("J. Artist");
  });

  it("reports a failed image save when saveImage resolves ok: false", async () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    const saveImage = vi.fn().mockResolvedValue({
      ok: false as const,
      error: "Failed to save image.",
    });
    const { deps, choices } = setup([], { saveImage });
    choices[0]!.file = file;
    const result = await importCreatures(pkg, "h", choices, deps);
    expect(result.created).toBe(3);
    expect(result.failures).toEqual(["Gnoll: created without its image."]);
  });

  it("stops writing when the Vault changes", async () => {
    let vaultId = "v1";
    const createEntity = vi.fn(
      async (_t: string, title: string, _data: Record<string, unknown>) => {
        vaultId = "v2";
        return `id-${title}`;
      },
    );
    const { deps, choices } = setup([], {
      getVaultId: () => vaultId,
      createEntity,
    });
    const result = await importCreatures(pkg, "h", choices, deps);
    expect(createEntity).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ created: 1, interrupted: true });
  });

  it("reports an in-flight image save interrupted when the Vault changes", async () => {
    let vaultId = "v1";
    const saveImage = vi.fn(async () => {
      vaultId = "v2";
      return { ok: false as const, error: "Vault changed" };
    });
    const { deps, choices, createEntity } = setup([], {
      getVaultId: () => vaultId,
      saveImage,
    });
    choices[0]!.file = new File(["x"], "a.png", { type: "image/png" });
    const result = await importCreatures(pkg, "h", choices, deps);
    expect(saveImage).toHaveBeenCalledWith("id-Gnoll", choices[0]!.file, "v1");
    expect(createEntity).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ created: 1, interrupted: true });
  });
});
