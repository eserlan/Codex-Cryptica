import { describe, expect, it } from "bun:test";
import {
  applyMilestone,
  backStep,
  currentStep,
  exitJourney,
  resumeJourney,
  returnToCurrent,
  skipStep,
  startJourney,
  stepPosition,
  stepState,
} from "../src/progress";
import { connected, created, defaults, fixture, graph } from "./fixtures";

const start = () => startJourney(fixture, 100);
const apply = (p = start(), ...ms: Parameters<typeof applyMilestone>[2][]) =>
  ms.reduce((acc, m) => applyMilestone(acc, fixture, m, defaults), p);

describe("startJourney", () => {
  it("starts a running journey on its first step", () => {
    const p = start();
    expect(p).toEqual({
      schema: 1,
      journeyId: "worldbuilder",
      journeyVersion: 2,
      startedAt: 100,
      completed: [],
      skipped: [],
      viewing: null,
      outcome: "running",
    });
    expect(currentStep(p, fixture)?.id).toBe("add-place");
    expect(stepPosition(p, fixture)).toEqual({ index: 0, total: 4 });
  });
});

describe("applyMilestone", () => {
  it("completes a step on its milestone", () => {
    const p = apply(start(), created("location"));
    expect(p.completed).toEqual(["add-place"]);
    expect(currentStep(p, fixture)?.id).toBe("add-character");
  });

  it("ignores milestones from before the journey started", () => {
    const p = start();
    expect(applyMilestone(p, fixture, created("location", 99), defaults)).toBe(
      p,
    );
  });

  it("ignores milestones unless the journey is running", () => {
    const p = exitJourney(start());
    expect(applyMilestone(p, fixture, created("location"), defaults)).toBe(p);
  });

  it("is idempotent for a repeated milestone", () => {
    const once = apply(start(), created("location"));
    expect(applyMilestone(once, fixture, created("location"), defaults)).toBe(
      once,
    );
  });

  it("does not count an entry of the wrong category", () => {
    const p = start();
    expect(applyMilestone(p, fixture, created("item"), defaults)).toBe(p);
  });

  it("completes out-of-order steps and keeps showing the first one not done", () => {
    const p = apply(start(), created("character"));
    expect(p.completed).toEqual(["add-character"]);
    expect(currentStep(p, fixture)?.id).toBe("add-place");
    const next = apply(p, created("location"));
    expect(currentStep(next, fixture)?.id).toBe("connect");
  });

  it("gates `after` on the state before the milestone", () => {
    // Graph showing from the start does nothing.
    const p = apply(start(), graph());
    expect(p.completed).toEqual([]);
    const ready = apply(
      p,
      created("location"),
      created("character"),
      connected(),
    );
    expect(ready.completed).not.toContain("see-graph");
    const done = apply(ready, graph());
    expect(done.completed).toContain("see-graph");
    expect(done.outcome).toBe("finished");
    expect(currentStep(done, fixture)).toBeNull();
    expect(stepPosition(done, fixture)).toEqual({ index: 4, total: 4 });
  });

  it("lets one batch complete several independent steps", () => {
    const p = apply(start(), created("location"), created("character"));
    expect(p.completed.sort()).toEqual(["add-character", "add-place"]);
  });

  it("moves a skipped step to completed when it happens later", () => {
    const skipped = skipStep(start(), fixture);
    expect(skipped.skipped).toEqual(["add-place"]);
    const p = apply(skipped, created("location"));
    expect(p.completed).toEqual(["add-place"]);
    expect(p.skipped).toEqual([]);
  });

  it("keeps a completed step completed (nothing reacts to deletions)", () => {
    const p = apply(start(), created("location"));
    const later = apply(p, created("item"), connected());
    expect(later.completed).toContain("add-place");
  });
});

describe("skip, back and exit", () => {
  it("skip records the step as skipped, never completed", () => {
    const p = skipStep(start(), fixture);
    expect(p.skipped).toEqual(["add-place"]);
    expect(p.completed).toEqual([]);
    expect(stepState(p, "add-place")).toBe("skipped");
    expect(currentStep(p, fixture)?.id).toBe("add-character");
  });

  it("finishes when the last open step is skipped", () => {
    let p = start();
    for (let i = 0; i < 4; i++) p = skipStep(p, fixture);
    expect(p.outcome).toBe("finished");
    expect(p.completed).toEqual([]);
  });

  it("back shows the step before the one on screen, in journey order", () => {
    const p = apply(start(), created("location"), created("character"));
    const back1 = backStep(p, fixture);
    expect(back1.viewing).toBe("add-character");
    const back2 = backStep(back1, fixture);
    expect(back2.viewing).toBe("add-place");
    expect(backStep(back2, fixture)).toBe(back2);
    expect(back2.completed).toEqual(p.completed);
  });

  it("back on the first step is a no-op", () => {
    const p = start();
    expect(backStep(p, fixture)).toBe(p);
  });

  it("returnToCurrent clears viewing", () => {
    const p = backStep(apply(start(), created("location")), fixture);
    const r = returnToCurrent(p);
    expect(r.viewing).toBeNull();
    expect(currentStep(r, fixture)?.id).toBe("add-character");
    expect(returnToCurrent(r)).toBe(r);
  });

  it("a completing milestone clears viewing", () => {
    const p = backStep(apply(start(), created("location")), fixture);
    expect(apply(p, created("character")).viewing).toBeNull();
  });

  it("skip while viewing a done step changes nothing", () => {
    const p = backStep(apply(start(), created("location")), fixture);
    expect(skipStep(p, fixture)).toBe(p);
  });

  it("skip while viewing a not-done step skips it and clears viewing", () => {
    // Back only reaches done steps in practice; a restored record can still
    // point `viewing` at an open one.
    const p = apply(start(), created("location"), created("character"));
    const viewingOpen = { ...p, viewing: "connect" };
    const s = skipStep(viewingOpen, fixture);
    expect(s.skipped).toEqual(["connect"]);
    expect(s.viewing).toBeNull();
  });

  it("exit and resume keep progress", () => {
    const p = apply(start(), created("location"));
    const exited = exitJourney(p);
    expect(exited.outcome).toBe("exited");
    expect(exitJourney(exited)).toBe(exited);
    const resumed = resumeJourney(exited);
    expect(resumed.outcome).toBe("running");
    expect(resumed.completed).toEqual(["add-place"]);
    expect(resumeJourney(resumed)).toBe(resumed);
  });

  it("does nothing to a finished journey", () => {
    let p = start();
    for (let i = 0; i < 4; i++) p = skipStep(p, fixture);
    expect(resumeJourney(p)).toBe(p);
    expect(skipStep(p, fixture)).toBe(p);
    expect(backStep(p, fixture)).toBe(p);
  });
});
