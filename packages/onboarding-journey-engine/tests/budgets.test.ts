import { describe, expect, it } from "bun:test";
import { applyMilestone, startJourney } from "../src/progress";
import { decideTip, emptyTipsRecord, TIP_CATALOGUE } from "../src/tips";
import { created, defaults, fixture } from "./fixtures";

describe("budgets (plan Performance Goals)", () => {
  it("applies a 100-entry batch in under 16 ms", () => {
    const batch = Array.from({ length: 100 }, (_, i) =>
      created(i % 2 ? "character" : "location", 200 + i),
    );
    const runs: number[] = [];
    for (let r = 0; r < 5; r++) {
      const t0 = performance.now();
      batch.reduce(
        (p, m) => applyMilestone(p, fixture, m, defaults),
        startJourney(fixture, 100),
      );
      runs.push(performance.now() - t0);
    }
    runs.sort((a, b) => a - b);
    expect(runs[2]!).toBeLessThan(16);
  });

  it("adds under 10 KB gzipped to the app bundle", async () => {
    const out = await Bun.build({
      entrypoints: [new URL("../src/index.ts", import.meta.url).pathname],
      minify: true,
      external: ["help-engine", "zod"],
      target: "browser",
    });
    expect(out.success).toBe(true);
    const code = await out.outputs[0]!.text();
    expect(Bun.gzipSync(new TextEncoder().encode(code)).length).toBeLessThan(
      10_240,
    );
  });

  it("decides a tip in under 1 ms on average (spec 176 plan)", () => {
    const input = {
      record: { ...emptyTipsRecord(), enabled: true },
      aiAvailable: true,
      goal: "world" as const,
      goalInvitation: "goal" as const,
      setupEnded: true,
      area: TIP_CATALOGUE[0]!.area,
      shownThisSession: false,
      blockers: {
        typing: false,
        dialogOpen: false,
        tourActive: false,
        journeyOrInvitationActive: false,
        cifOpen: false,
        firstRunPage: false,
      },
      unavailableAreas: [],
    };
    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) decideTip(input);
    expect((performance.now() - t0) / 1000).toBeLessThan(1);
  });
});
