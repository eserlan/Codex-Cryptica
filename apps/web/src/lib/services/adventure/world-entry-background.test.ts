import { describe, expect, it } from "vitest";
import {
  buildAdventurePrompt,
  detectHiddenLeakage,
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
  it("establishes paired hidden rumours without leaking them", () => {
    let n = 0;
    const seeded = seedWorldEntryBackground(session(), () => `seed-${++n}`);
    expect(seeded.hiddenState.secrets).toHaveLength(6);
    expect(seeded.hiddenState.gmThreads).toHaveLength(3);
    expect(seeded.hiddenState.secrets[0]?.status).toBe("hidden");
    expect(seeded.hiddenState.gmThreads[0]?.status).toBe("hidden");
    expect(seeded.hiddenState.secrets[0]?.text).not.toContain(
      "World-entry seed",
    );
    expect(seeded.hiddenState.secrets[1]?.text).not.toContain(
      "If investigated:",
    );
    expect(seeded.hiddenState.gmThreads[0]?.text).toContain("UNNOTICED");
    expect(seeded.hiddenState.gmThreads[0]?.text).toContain(
      "Stage: unnoticed.",
    );
    expect(seeded.hiddenState.gmThreads[0]?.text).toContain(
      "traces, changed behaviour, notices, consequences or talk",
    );

    const prompt = buildAdventurePrompt({
      session: seeded,
      phase: "opening",
      anchors: [],
      relevant: [],
    });
    expect(prompt.state).toContain("UNNOTICED");
    expect(prompt.behavior).toContain("reveal at most one");
  });

  it("seeds older World Entry sessions but never reseeds", () => {
    const older = session();
    older.turns = [{ id: "old-turn" } as AdventureSession["turns"][number]];
    const seeded = seedWorldEntryBackground(older, () => "new-id");
    expect(seeded.hiddenState.gmThreads).toHaveLength(3);
    expect(seedWorldEntryBackground(seeded, () => "extra")).toBe(seeded);
  });

  it("keeps seeds stable and leaves ordinary adventures alone", () => {
    let n = 0;
    const first = seedWorldEntryBackground(session(), () => `id-${++n}`);
    n = 0;
    const second = seedWorldEntryBackground(session(), () => `id-${++n}`);
    expect(first.hiddenState).toEqual(second.hiddenState);
    const ordinary = session();
    delete ordinary.worldEntry;
    expect(seedWorldEntryBackground(ordinary, () => "id")).toBe(ordinary);
  });

  it("rejects narration that copies only an unrevealed seed truth", () => {
    const seeded = seedWorldEntryBackground(session(), () =>
      crypto.randomUUID(),
    );
    const secret = seeded.hiddenState.secrets[0]!;
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
    const realities = seededFromOneCategory.hiddenState.gmThreads.map(
      (thread) => thread.text.match(/— (.*?); UNFOLDING/)?.[1],
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
    expect(seededFromOversized.hiddenState.secrets).toHaveLength(6);
    expect(
      seededFromOversized.hiddenState.secrets.every(
        (secret) => secret.text.length <= 600,
      ),
    ).toBe(true);
    expect(
      seededFromOversized.hiddenState.secrets.some((secret) =>
        secret.text.startsWith("x".repeat(100)),
      ),
    ).toBe(false);
  });
});
