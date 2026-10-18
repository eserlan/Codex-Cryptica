import { describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";
import {
  CONVERTED_LABEL,
  StatBlockImportController,
  type StatBlockImportDeps,
} from "./stat-block-import-controller.svelte";
import { TOV_MONSTER_TEMPLATE_ID } from "@codex/stat-sheet-engine";

const STAT_BLOCK = `Hill Brute
Large giant, chaotic evil
Armor Class 13 (hide armor)
Hit Points 45 (6d10+12)
STR 18 (+4) DEX 8 (-1) CON 14 (+2) INT 6 (-2) WIS 9 (-1) CHA 7 (-2)
Challenge 3 (Doom 2)
Greatclub. Melee Attack: +6 to hit, 1d10+4 bludgeoning damage.`;

const REPLY = {
  outcome: "ok",
  looksLike: "tov",
  kind: "creature",
  name: "Hill Brute",
  values: {
    size: "Large",
    creatureType: "giant",
    alignment: "chaotic evil",
    cr: "3",
    doom: 2,
    ac: 13,
    hp: 45,
    abilityScores: { str: 18, dex: 8, con: 14, int: 6, wis: 9, cha: 7 },
    actions: [
      { name: "Greatclub", attackFormula: "1d20+6", damageFormula: "1d10+4" },
    ],
  },
  notes: [],
  leftovers: [],
};

function entity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: "goblin-1",
    type: "creature",
    title: "Goblin",
    labels: [],
    content: "",
    ...overrides,
  } as unknown as Entity;
}

function makeDeps(overrides: Partial<StatBlockImportDeps> = {}) {
  const deps: StatBlockImportDeps = {
    gateway: { complete: vi.fn(async () => JSON.stringify(REPLY)) },
    aiDisabled: () => false,
    targetEntity: () => null,
    findEntityByTitle: () => null,
    updateEntity: vi.fn(async () => undefined),
    createEntity: vi.fn(() => "new-1"),
    entityTypeFor: () => "creature",
    ...overrides,
  };
  return deps;
}

async function readAndReview(deps: StatBlockImportDeps, source = STAT_BLOCK) {
  const controller = new StatBlockImportController(deps);
  controller.setSource(source);
  await controller.read();
  return controller;
}

describe("StatBlockImportController: reading", () => {
  it("moves from paste to review on a clean read", async () => {
    const controller = await readAndReview(makeDeps());
    expect(controller.step).toBe("review");
    expect(controller.result?.values).toMatchObject({ ac: 13, hp: 45 });
    expect(controller.canSave).toBe(true);
  });

  it("refuses an empty paste without calling the gateway", async () => {
    const deps = makeDeps();
    const controller = new StatBlockImportController(deps);
    controller.setSource("   ");
    await controller.read();
    expect(controller.step).toBe("paste");
    expect(controller.error).toMatch(/Paste a stat block/);
    expect(deps.gateway.complete).not.toHaveBeenCalled();
  });

  it("explains a paste with no stat block and stays on paste", async () => {
    const deps = makeDeps({
      gateway: {
        complete: vi.fn(async () =>
          JSON.stringify({ outcome: "no-stat-block" }),
        ),
      },
    });
    const controller = await readAndReview(deps, "A quiet lake at dusk.");
    expect(controller.step).toBe("paste");
    expect(controller.error).toBe("No stat block was found in that text.");
    expect(controller.result).toBeNull();
  });

  it("keeps the pasted text and offers a retry when the AI request fails", async () => {
    const deps = makeDeps({
      gateway: {
        complete: vi.fn(async () => {
          throw new Error("proxy down");
        }),
      },
    });
    const controller = await readAndReview(deps);
    expect(controller.step).toBe("paste");
    expect(controller.source).toBe(STAT_BLOCK);
    expect(controller.canRetry).toBe(true);
    expect(controller.error).toBeTruthy();
  });

  it("stays cancelled when the modal is closed during an AI read", async () => {
    const deps = makeDeps({
      gateway: { complete: vi.fn(() => new Promise<string>(() => {})) },
    });
    const controller = new StatBlockImportController(deps);
    controller.setSource(STAT_BLOCK);
    const pending = controller.read();

    controller.cancel();
    await pending;

    expect(controller.step).toBe("cancelled");
    expect(controller.error).toBeNull();
  });

  it("refuses a paste over the limit before calling the gateway", async () => {
    const deps = makeDeps();
    const controller = await readAndReview(deps, "a".repeat(12_001));
    expect(controller.error).toMatch(/Paste just the stat block/);
    expect(deps.gateway.complete).not.toHaveBeenCalled();
  });
});

describe("StatBlockImportController: AI off", () => {
  it("reads with the rule-based reader and never calls the gateway", async () => {
    const deps = makeDeps({ aiDisabled: () => true });
    const controller = await readAndReview(deps);
    expect(deps.gateway.complete).not.toHaveBeenCalled();
    expect(controller.result?.reader).toBe("rules");
  });

  it("does not allow Convert from 5e", () => {
    const controller = new StatBlockImportController(
      makeDeps({ aiDisabled: () => true }),
    );
    controller.setMode("convert-5e");
    expect(controller.mode).toBe("copy");
  });
});

describe("StatBlockImportController: saving to an existing entity", () => {
  it("writes nothing when cancelled at review", async () => {
    const deps = makeDeps({ targetEntity: () => entity() });
    const controller = await readAndReview(deps);
    controller.cancel();
    expect(controller.step).toBe("cancelled");
    expect(deps.updateEntity).not.toHaveBeenCalled();
    expect(deps.createEntity).not.toHaveBeenCalled();
  });

  it("saves straight away when nothing would be overwritten", async () => {
    const deps = makeDeps({ targetEntity: () => entity() });
    const controller = await readAndReview(deps);
    await controller.save();
    expect(controller.step).toBe("saved");
    expect(deps.updateEntity).toHaveBeenCalledTimes(1);
    const [id, updates] = (deps.updateEntity as ReturnType<typeof vi.fn>).mock
      .calls[0]!;
    expect(id).toBe("goblin-1");
    expect(updates.statSheet.templateId).toBe(TOV_MONSTER_TEMPLATE_ID);
  });

  it("keeps the review open and shows an error when the target no longer exists", async () => {
    const deps = makeDeps({
      targetEntity: () => entity(),
      updateEntity: vi.fn(async () => false),
    });
    const controller = await readAndReview(deps);

    await controller.save();

    expect(controller.step).toBe("review");
    expect(controller.error).toMatch(/entity no longer exists/i);
  });

  it("asks first when existing values would be overwritten, and writes only after confirm", async () => {
    const deps = makeDeps({
      targetEntity: () =>
        entity({
          statSheet: {
            templateId: TOV_MONSTER_TEMPLATE_ID,
            fields: [{ id: "ac", label: "AC", type: "number", value: 10 }],
          } as Entity["statSheet"],
        }),
    });
    const controller = await readAndReview(deps);
    await controller.save();
    expect(controller.step).toBe("confirm");
    expect(deps.updateEntity).not.toHaveBeenCalled();
    await controller.commit();
    expect(controller.step).toBe("saved");
    expect(deps.updateEntity).toHaveBeenCalledTimes(1);
  });

  it("goes back to review from the confirmation without writing", async () => {
    const deps = makeDeps({
      targetEntity: () =>
        entity({
          statSheet: {
            templateId: TOV_MONSTER_TEMPLATE_ID,
            fields: [{ id: "ac", label: "AC", type: "number", value: 10 }],
          } as Entity["statSheet"],
        }),
    });
    const controller = await readAndReview(deps);
    await controller.save();
    controller.backToReview();
    expect(controller.step).toBe("review");
    expect(deps.updateEntity).not.toHaveBeenCalled();
  });
});

describe("StatBlockImportController: FR-015a required values", () => {
  it("disables save and names the missing value when HP is absent", async () => {
    const deps = makeDeps({
      gateway: {
        complete: vi.fn(async () =>
          JSON.stringify({
            ...REPLY,
            values: { ...REPLY.values, hp: undefined },
          }),
        ),
      },
    });
    const controller = await readAndReview(deps);
    expect(controller.canSave).toBe(false);
    expect(controller.missingRequired).toEqual(["Hit Points"]);
    await controller.save();
    expect(deps.updateEntity).not.toHaveBeenCalled();
    expect(deps.createEntity).not.toHaveBeenCalled();
  });

  it("enables save once the GM types the missing value", async () => {
    const deps = makeDeps({
      gateway: {
        complete: vi.fn(async () =>
          JSON.stringify({
            ...REPLY,
            values: { ...REPLY.values, hp: undefined },
          }),
        ),
      },
    });
    const controller = await readAndReview(deps);
    controller.edit("hp", 40);
    expect(controller.canSave).toBe(true);
  });
});

describe("StatBlockImportController: conversion and kept text", () => {
  it("adds the converted-from-5e label only in convert mode", async () => {
    const deps = makeDeps({ targetEntity: () => entity({ labels: ["Boss"] }) });
    const controller = await readAndReview(deps);
    controller.setMode("convert-5e");
    await controller.read();
    await controller.save();
    const [, updates] = (deps.updateEntity as ReturnType<typeof vi.fn>).mock
      .calls[0]!;
    expect(updates.labels).toEqual(["Boss", CONVERTED_LABEL]);
  });

  it("leaves the original text out of notes by default", async () => {
    const deps = makeDeps({ targetEntity: () => entity() });
    const controller = await readAndReview(deps);
    await controller.save();
    const [, updates] = (deps.updateEntity as ReturnType<typeof vi.fn>).mock
      .calls[0]!;
    expect(updates).not.toHaveProperty("content");
  });

  it("appends the original text to notes when the GM ticks the box", async () => {
    const deps = makeDeps({
      targetEntity: () => entity({ content: "Old notes." }),
    });
    const controller = await readAndReview(deps);
    controller.setKeepText(true);
    await controller.save();
    const [, updates] = (deps.updateEntity as ReturnType<typeof vi.fn>).mock
      .calls[0]!;
    expect(updates.content).toContain("Old notes.");
    expect(updates.content).toContain("## Original stat block");
    expect(updates.content).toContain("Armor Class 13");
  });
});

describe("StatBlockImportController: new entity", () => {
  it("creates a creature entity with the read name and the stat sheet", async () => {
    const deps = makeDeps();
    const controller = await readAndReview(deps);
    await controller.save();
    expect(controller.step).toBe("saved");
    expect(deps.createEntity).toHaveBeenCalledWith(
      "creature",
      "Hill Brute",
      expect.objectContaining({ statSheet: expect.any(Object) }),
    );
  });

  it("stops at a name clash and creates nothing", async () => {
    const deps = makeDeps({
      findEntityByTitle: () => entity({ title: "Hill Brute" }),
    });
    const controller = await readAndReview(deps);
    await controller.save();
    expect(controller.step).toBe("name-clash");
    expect(deps.createEntity).not.toHaveBeenCalled();
  });

  it("creates a separate entity when the GM chooses that after a clash", async () => {
    const deps = makeDeps({
      findEntityByTitle: () => entity({ title: "Hill Brute" }),
    });
    const controller = await readAndReview(deps);
    await controller.save();
    await controller.createSeparate();
    expect(controller.step).toBe("saved");
    expect(deps.createEntity).toHaveBeenCalledTimes(1);
  });

  it("imports into the existing entity when the GM chooses that after a clash", async () => {
    const existing = entity({ id: "brute-2", title: "Hill Brute" });
    const deps = makeDeps({ findEntityByTitle: () => existing });
    const controller = await readAndReview(deps);
    await controller.save();
    await controller.importIntoExisting();
    expect(deps.createEntity).not.toHaveBeenCalled();
    expect(deps.updateEntity).toHaveBeenCalledWith(
      "brute-2",
      expect.any(Object),
    );
  });
});

describe("StatBlockImportController: edits", () => {
  it("applies a GM correction to a read value", async () => {
    const controller = await readAndReview(makeDeps());
    controller.edit("ac", 14);
    expect(controller.result?.values).toMatchObject({ ac: 14 });
    expect(controller.result?.corrected).toContain("ac");
  });
});

describe("StatBlockImportController: write safety", () => {
  it("creates one entity when Save is pressed twice before the first write finishes", async () => {
    let finish!: (id: string) => void;
    const deps = makeDeps({
      createEntity: vi.fn(
        () => new Promise<string>((resolve) => (finish = resolve)),
      ),
    });
    const controller = await readAndReview(deps);
    const first = controller.save();
    const second = controller.save();
    finish("new-1");
    await Promise.all([first, second]);
    expect(deps.createEntity).toHaveBeenCalledTimes(1);
    expect(controller.committing).toBe(false);
  });

  it("keeps pasted text that contains backticks inside a fence longer than any run in it", async () => {
    const source = `${STAT_BLOCK}\n\`\`\`\n<img src="https://tracker.example/x.png">`;
    const deps = makeDeps({ targetEntity: () => entity({ content: "" }) });
    const controller = await readAndReview(deps, source);
    controller.setKeepText(true);
    await controller.save();
    const [, updates] = (deps.updateEntity as ReturnType<typeof vi.fn>).mock
      .calls[0]!;
    // The source has a run of three backticks, so the fence must be four.
    expect(updates.content).toContain("````\n");
    expect(updates.content.trimEnd().endsWith("````")).toBe(true);
  });
});
