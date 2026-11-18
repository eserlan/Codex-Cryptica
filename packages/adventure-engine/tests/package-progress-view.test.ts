import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AdventureJsonV1Schema,
  applyPackageProgressEvents,
  packageProgressIndex,
  projectPackageProgressAudit,
  projectPlayerPackageProgress,
  type PackageProgress,
  type PackageProgressInput,
} from "../src";

const base = AdventureJsonV1Schema.parse(
  JSON.parse(
    readFileSync(
      resolve(
        import.meta.dir,
        "../../../fixtures/adventures/reference-one-shot/adventure.v1.json",
      ),
      "utf8",
    ),
  ),
);
const LANDING = "ros-scene-1-landing";
const YARD = "ros-scene-2-yard";
const SHRINE = "ros-branch-shrine";
const WHEEL = "ros-scene-3-wheel-room";
const CELLAR = "ros-scene-4-cellar";
const CLUE = "clue-sluice-sabotage";
const SECRET = "secret-filed-pin";

// The cellar is made GM-only so a GM-only visited scene can be tested.
const pkg = AdventureJsonV1Schema.parse({
  ...structuredClone(base),
  scenes: base.scenes.map((scene) =>
    scene.id === CELLAR ? { ...scene, visibility: "gm-only" } : scene,
  ),
});
const index = packageProgressIndex(pkg);

type Step = Omit<PackageProgressInput, "kind" | "certainty" | "note"> &
  Partial<Pick<PackageProgressInput, "kind" | "certainty" | "note">>;

function ledger(turns: Step[][], sceneId = LANDING): PackageProgress {
  let progress: PackageProgress = { sceneId };
  turns.forEach((steps, i) => {
    progress = applyPackageProgressEvents(
      progress,
      steps.map((step) => ({
        kind: index.packageRecordKinds[step.recordId],
        certainty: "confirmed",
        note: `note ${step.recordId}`,
        ...step,
      })),
      { turnId: `t${i + 1}`, index },
    ).progress;
  });
  return progress;
}

const empty = { visitedScenes: [], foundClues: [] };

describe("projectPlayerPackageProgress", () => {
  it("hides a GM-only visited scene", () => {
    const progress = ledger([[{ recordId: CELLAR, to: "active" }]], CELLAR);
    expect(projectPlayerPackageProgress(pkg, progress)).toEqual(empty);
  });

  it("hides a scene with only a claimed event", () => {
    const progress = ledger([
      [{ recordId: YARD, to: "active", certainty: "claimed" }],
    ]);
    expect(projectPlayerPackageProgress(pkg, progress)).toEqual(empty);
  });

  it("hides a scene whose only activating event was superseded", () => {
    const progress = ledger([
      [{ recordId: YARD, to: "active" }],
      [{ recordId: YARD, to: "skipped", supersedes: "t1:pkg:1" }],
    ]);
    expect(projectPlayerPackageProgress(pkg, progress)).toEqual(empty);
  });

  it("hides unvisited and merely available scenes", () => {
    const progress = ledger([[{ recordId: SHRINE, to: "available" }]]);
    const view = projectPlayerPackageProgress(pkg, progress);
    expect(view).toEqual(empty);
    expect(JSON.stringify(view)).not.toContain(WHEEL);
  });

  it("shows confirmed scenes, the current scene and a clue", () => {
    const progress = ledger(
      [
        [{ recordId: LANDING, to: "active" }],
        [
          { recordId: LANDING, to: "resolved" },
          { recordId: YARD, to: "active" },
          { recordId: CLUE, to: "resolved" },
        ],
      ],
      YARD,
    );
    const landing = base.scenes.find((s) => s.id === LANDING)!;
    const yard = base.scenes.find((s) => s.id === YARD)!;
    const clue = base.clues.find((c) => c.id === CLUE)!;
    expect(projectPlayerPackageProgress(pkg, progress)).toEqual({
      currentScene: { id: YARD, title: yard.title, summary: yard.summary },
      visitedScenes: [
        { id: LANDING, title: landing.title, summary: landing.summary },
      ],
      foundClues: [{ id: CLUE, text: clue.text }],
    });
  });

  it("has no current scene until the current scene is confirmed visited", () => {
    const progress = ledger([[{ recordId: YARD, to: "active" }]], LANDING);
    const view = projectPlayerPackageProgress(pkg, progress);
    expect(view.currentScene).toBeUndefined();
    expect(view.visitedScenes.map((s) => s.id)).toEqual([YARD]);
  });

  it("exposes no counts, totals, notes or secrets", () => {
    const progress = ledger([
      [
        { recordId: LANDING, to: "active", note: "NOTE-TOKEN" },
        { recordId: SECRET, to: "resolved" },
      ],
    ]);
    const view = projectPlayerPackageProgress(pkg, progress);
    expect(Object.keys(view).sort()).toEqual([
      "currentScene",
      "foundClues",
      "visitedScenes",
    ]);
    const json = JSON.stringify(view);
    expect(json).not.toContain("NOTE-TOKEN");
    expect(json).not.toContain(SECRET);
    expect(json).not.toContain(String(pkg.scenes.length));
    expect(json).not.toMatch(/total|count|remaining/i);
  });

  it("ignores events for records missing from the package", () => {
    const progress: PackageProgress = {
      sceneId: LANDING,
      version: 1,
      records: [],
      events: [
        {
          id: "e1",
          turnId: "t",
          recordId: "nope",
          kind: "scene",
          from: "unvisited",
          to: "active",
          certainty: "confirmed",
          note: "x",
        },
      ],
    };
    expect(projectPlayerPackageProgress(pkg, progress)).toEqual(empty);
  });

  it("is empty for undefined and legacy progress", () => {
    expect(projectPlayerPackageProgress(pkg, undefined)).toEqual(empty);
    expect(projectPlayerPackageProgress(pkg, { sceneId: LANDING })).toEqual(
      empty,
    );
  });
});

describe("projectPackageProgressAudit", () => {
  it("lists claims, including claims on records missing from records", () => {
    const progress = ledger([
      [
        { recordId: LANDING, to: "active" },
        { recordId: SECRET, to: "resolved", certainty: "claimed" },
      ],
    ]);
    expect(progress.records?.some((r) => r.id === SECRET)).toBe(false);
    const audit = projectPackageProgressAudit(pkg, progress);
    expect(audit.map((entry) => entry.recordId)).toEqual([LANDING, SECRET]);
    const secret = audit[1]!;
    expect(secret).toMatchObject({
      kind: "secret",
      visibility: "gm-only",
      status: "unvisited",
    });
    expect(secret.events[0]).toMatchObject({
      certainty: "claimed",
      to: "resolved",
      note: `note ${SECRET}`,
    });
    expect(audit[0]).toMatchObject({ status: "active" });
  });

  it("lists superseded events with supersededBy", () => {
    const progress = ledger([
      [{ recordId: YARD, to: "active" }],
      [{ recordId: YARD, to: "skipped", supersedes: "t1:pkg:1" }],
    ]);
    const [entry] = projectPackageProgressAudit(pkg, progress);
    expect(entry!.events).toHaveLength(2);
    expect(entry!.events[0]).toMatchObject({ supersededBy: "t2:pkg:1" });
    expect(entry!.events[1]).toMatchObject({ supersedes: "t1:pkg:1" });
    expect(entry!.label).toBe(base.scenes.find((s) => s.id === YARD)!.title);
  });

  it("is empty for undefined and legacy progress", () => {
    expect(projectPackageProgressAudit(pkg, undefined)).toEqual([]);
    expect(projectPackageProgressAudit(pkg, { sceneId: LANDING })).toEqual([]);
  });
});
