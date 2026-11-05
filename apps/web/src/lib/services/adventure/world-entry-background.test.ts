import { describe, expect, it } from "vitest";
import {
  buildAdventurePrompt,
  detectHiddenLeakage,
  ensureScenarioSecrets,
  type AdventureSession,
} from "@codex/adventure-engine";
import { generateRumourLocal } from "generator-engine";
import { seedWorldEntryBackground } from "./world-entry-background";

function session(): AdventureSession {
  return {
    id: "local-session-123",
    worldEntry: {
      version: 1,
      location: { kind: "provisional", name: "Northbrook" },
      intent: "explore",
    },
    hiddenState: { secrets: [], gmThreads: [] },
    turns: [],
  } as unknown as AdventureSession;
}

describe("world entry background situations", () => {
  it("establishes three structured unheard situations without leaking them", () => {
    let n = 0;
    const seeded = seedWorldEntryBackground(session(), () => `seed-${++n}`);
    expect(seeded.scenarioCollection?.items).toHaveLength(3);
    expect(
      seeded.scenarioCollection?.items.every(
        (item) => item.knowledge === "unheard",
      ),
    ).toBe(true);
    expect(seeded.hiddenState.gmThreads).toEqual([]);
    expect(ensureScenarioSecrets(seeded).hiddenState.secrets).toHaveLength(0);
    expect(
      seeded.scenarioCollection?.items.every(
        (item) => item.secretBindings.truth,
      ),
    ).toBe(true);

    const prompt = buildAdventurePrompt({
      session: seeded,
      phase: "opening",
      anchors: [],
      relevant: [],
    });
    expect(JSON.parse(prompt.state).playerScenarios.items).toEqual([]);
    expect(JSON.parse(prompt.state)["GM-ONLY scenarios"]).toHaveLength(3);
    expect(prompt.behavior).toContain("reveal at most one");
  });

  it("seeds older World Entry sessions but never reseeds", () => {
    const older = session();
    older.turns = [{ id: "old-turn" } as AdventureSession["turns"][number]];
    const seeded = seedWorldEntryBackground(older, () => "new-id");
    expect(seeded.scenarioCollection?.items).toHaveLength(3);
    expect(seedWorldEntryBackground(seeded, () => "extra")).toBe(seeded);
  });

  it("keeps seeds stable and leaves ordinary adventures alone", () => {
    let n = 0;
    const first = seedWorldEntryBackground(session(), () => `id-${++n}`);
    n = 0;
    const second = seedWorldEntryBackground(session(), () => `id-${++n}`);
    expect(first.scenarioCollection).toEqual(second.scenarioCollection);
    const ordinary = session();
    delete ordinary.worldEntry;
    expect(seedWorldEntryBackground(ordinary, () => "id")).toBe(ordinary);
  });

  it("rejects narration that copies only an unrevealed seed truth", () => {
    const seeded = seedWorldEntryBackground(session(), () =>
      crypto.randomUUID(),
    );
    const scenario = seeded.scenarioCollection?.items[0];
    if (!scenario) throw new Error("expected a seeded scenario");
    const secret = {
      id: scenario.secretBindings.truth,
      text: scenario.gmOnly.truth,
    };
    const findings = detectHiddenLeakage(seeded, {
      kind: "complete",
      narration: secret.text,
      revealSecretIds: [],
    } as never);

    expect(findings).toContainEqual({
      field: "root.narration",
      secretId: secret.id,
    });
  });

  it("uses a complete fallback when generated categories or packed text are invalid", () => {
    const generated = generateRumourLocal({});
    const sameCategory = {
      ...generated,
      lore: generated.lore.replace(
        /- \*\*Reality\*\*: .+/g,
        "- **Reality**: essentially true",
      ),
    };
    const seededFromOneCategory = seedWorldEntryBackground(
      session(),
      () => crypto.randomUUID(),
      sameCategory,
    );
    const realities = seededFromOneCategory.scenarioCollection?.items.map(
      (item) => item.gmOnly.truth.split(":")[0],
    );
    expect(realities).toEqual([
      "essentially true",
      "exaggeration",
      "dangerous misconception",
    ]);

    const oversized = {
      ...generated,
      lore: generated.lore.replace(
        /(- \*\*What's Actually Happening\*\*: ).+/g,
        `$1${"x".repeat(650)}`,
      ),
    };
    const seededFromOversized = seedWorldEntryBackground(
      session(),
      () => crypto.randomUUID(),
      oversized,
    );
    expect(seededFromOversized.scenarioCollection?.items).toHaveLength(3);
    expect(
      seededFromOversized.scenarioCollection?.items.every(
        (item) => item.gmOnly.truth.length <= 600,
      ),
    ).toBe(true);
    expect(
      seededFromOversized.scenarioCollection?.items.some((item) =>
        item.gmOnly.truth.startsWith("x".repeat(100)),
      ),
    ).toBe(false);
  });
});
