import { describe, expect, it } from "vitest";
import {
  buildAdventurePrompt,
  type AdventureSession,
} from "@codex/adventure-engine";
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
    expect(seeded.hiddenState.secrets).toHaveLength(3);
    expect(seeded.hiddenState.gmThreads).toHaveLength(3);
    expect(seeded.hiddenState.secrets[0]?.status).toBe("hidden");
    expect(seeded.hiddenState.gmThreads[0]?.status).toBe("hidden");
    expect(seeded.hiddenState.secrets[0]?.text).toContain("essentially true");
    expect(seeded.hiddenState.secrets[1]?.text).toContain("exaggeration");
    expect(seeded.hiddenState.secrets[2]?.text).toContain("misconception");
    expect(seeded.hiddenState.gmThreads[0]?.text).toContain("NOT YET HEARD");

    const prompt = buildAdventurePrompt({
      session: seeded,
      phase: "opening",
      anchors: [],
      relevant: [],
    });
    expect(prompt.state).toContain("NOT YET HEARD");
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
});
