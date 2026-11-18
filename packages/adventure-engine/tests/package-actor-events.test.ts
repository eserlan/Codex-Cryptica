import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AdventureJsonV1Schema,
  MAX_ACTOR_FACT_CHARS,
  MAX_ACTOR_REMEMBERED_FACTS,
  MAX_PACKAGE_PROGRESS_ENTRIES,
  MAX_PACKAGE_PROGRESS_PROMPT_CHARS,
  applyCompletedTurn,
  applyPackageActorEvents,
  buildAdventurePrompt,
  packageProgressIndex,
  packageProgressPromptSummary,
  retrieveAdventureJsonContext,
  type ActorEventProposal,
  type AdventureJsonV1,
  type AdventureSession,
  type PackageActorState,
  type PackageProgress,
} from "../src";
import { proposal, session } from "./reducer-fixtures";

const refPkg: AdventureJsonV1 = AdventureJsonV1Schema.parse(
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

const MAREN = "actor-maren-holt";
const SCENE_1 = "ros-scene-1-landing";
const SCENE_2 = "ros-scene-2-yard";

function packageSession(
  progress: PackageProgress = { sceneId: SCENE_1 },
): AdventureSession {
  return {
    ...session(),
    sourcePackage: {
      packageId: refPkg.id,
      version: refPkg.version,
      formatVersion: refPkg.formatVersion,
      hash: "a".repeat(64),
    },
    packageProgress: progress,
  };
}

function commitActors(
  current: AdventureSession,
  actorEvents: ActorEventProposal[],
  overrides: {
    turnId?: string;
    inputId?: string;
    sceneId?: string;
    narration?: string;
    noPackageMeta?: boolean;
  } = {},
) {
  const index = packageProgressIndex(refPkg);
  const turnId = overrides.turnId ?? "turn-1";
  const baseProposal = proposal();
  return applyCompletedTurn(
    current,
    {
      ...baseProposal,
      ...(overrides.narration ? { narration: overrides.narration } : {}),
      visiblePatch: {
        ...baseProposal.visiblePatch,
        ...(overrides.sceneId ? { packageSceneId: overrides.sceneId } : {}),
      },
      actorEvents,
    },
    {
      turnId,
      inputId: overrides.inputId ?? `input-${turnId}`,
      now: "2026-04-01T12:00:00.000Z",
      ...(overrides.noPackageMeta
        ? {}
        : {
            ...index,
            packageRecordIds: [],
          }),
    },
  );
}

function ok(result: ReturnType<typeof applyCompletedTurn>): AdventureSession {
  expect(result.ok).toBe(true);
  if (!result.ok)
    throw new Error(result.errors.map((e) => e.message).join(", "));
  return result.value;
}

function actorOf(
  progress: PackageProgress | undefined,
  actorId: string,
): PackageActorState | undefined {
  return progress?.actors?.find((a) => a.actorId === actorId);
}

describe("actor progress transitions and corrections", () => {
  it("tracks status, disposition, and remembered facts across turns and scene revisits", () => {
    const turn1 = ok(
      commitActors(packageSession(), [
        {
          actorId: MAREN,
          status: "present",
          disposition: "hostile",
          fact: "Refused to share the mill's ledger.",
          certainty: "confirmed",
          note: "Player accused Maren of sabotaging the sluice.",
        },
      ]),
    );
    expect(actorOf(turn1.packageProgress, MAREN)).toEqual({
      actorId: MAREN,
      status: "present",
      disposition: "hostile",
      facts: ["Refused to share the mill's ledger."],
    });

    const moved = ok(
      commitActors(turn1, [], {
        turnId: "turn-2",
        sceneId: SCENE_2,
      }),
    );
    const scene2Prompt = buildAdventurePrompt({
      session: moved,
      phase: "action",
      playerAction: "Look around",
      anchors: [],
      relevant: [],
      adventurePackage: retrieveAdventureJsonContext(refPkg, {
        sceneId: SCENE_2,
      }),
    });
    const scene2Progress = JSON.parse(scene2Prompt.state)[
      "GM-ONLY package progress"
    ];
    expect(scene2Progress.actors).toBeUndefined();
    expect(scene2Progress.recentActorEvents).toBeUndefined();

    const revisited = ok(
      commitActors(moved, [], {
        turnId: "turn-3",
        sceneId: SCENE_1,
      }),
    );
    const scene1Prompt = buildAdventurePrompt({
      session: revisited,
      phase: "action",
      playerAction: "Talk to Maren",
      anchors: [],
      relevant: [],
      adventurePackage: retrieveAdventureJsonContext(refPkg, {
        sceneId: SCENE_1,
      }),
    });
    const scene1Progress = JSON.parse(scene1Prompt.state)[
      "GM-ONLY package progress"
    ];
    expect(scene1Progress.actors).toEqual([
      {
        actorId: MAREN,
        status: "present",
        disposition: "hostile",
        facts: ["Refused to share the mill's ledger."],
      },
    ]);
    expect(scene1Progress.recentActorEvents).toHaveLength(1);
  });

  it("blocks dead -> present/absent/dead without a confirmed supersedes correction", () => {
    const died = ok(
      commitActors(packageSession(), [
        {
          actorId: MAREN,
          status: "dead",
          certainty: "confirmed",
          note: "Maren fell into the millrace.",
        },
      ]),
    );
    const deathEvent = died.packageProgress!.actorEvents![0]!;
    expect(actorOf(died.packageProgress, MAREN)?.status).toBe("dead");

    // Without supersedes
    const noSupersede = ok(
      commitActors(
        died,
        [
          {
            actorId: MAREN,
            status: "present",
            certainty: "confirmed",
            note: "Maren walks back in.",
          },
          {
            actorId: MAREN,
            status: "absent",
            certainty: "confirmed",
            note: "Maren slipped away.",
          },
          {
            actorId: MAREN,
            status: "dead",
            certainty: "confirmed",
            note: "Still dead.",
          },
        ],
        { turnId: "turn-2" },
      ),
    );
    expect(noSupersede.turns.at(-1)?.dropped).toEqual([
      `actorEvents: transition not allowed ${MAREN}`,
      `actorEvents: transition not allowed ${MAREN}`,
      `actorEvents: transition not allowed ${MAREN}`,
    ]);
    expect(actorOf(noSupersede.packageProgress, MAREN)?.status).toBe("dead");

    // Claimed supersedes cannot supersede a confirmed death event
    const claimedSupersede = ok(
      commitActors(
        noSupersede,
        [
          {
            actorId: MAREN,
            status: "present",
            certainty: "claimed",
            note: "Someone claims Maren survived.",
            supersedes: deathEvent.id,
          },
        ],
        { turnId: "turn-3" },
      ),
    );
    expect(claimedSupersede.turns.at(-1)?.dropped).toEqual([
      `actorEvents: invalid supersede ${MAREN}`,
    ]);
    expect(actorOf(claimedSupersede.packageProgress, MAREN)?.status).toBe(
      "dead",
    );

    // Wrong target event ID
    const wrongTarget = ok(
      commitActors(
        claimedSupersede,
        [
          {
            actorId: MAREN,
            status: "present",
            certainty: "confirmed",
            note: "Correction targeting wrong id.",
            supersedes: "turn-999:actor:1",
          },
        ],
        { turnId: "turn-4" },
      ),
    );
    expect(wrongTarget.turns.at(-1)?.dropped).toEqual([
      `actorEvents: invalid supersede ${MAREN}`,
    ]);
    expect(actorOf(wrongTarget.packageProgress, MAREN)?.status).toBe("dead");
  });

  it("allows a confirmed supersedes correction to update a dead actor and rejects re-superseding", () => {
    const died = ok(
      commitActors(packageSession(), [
        {
          actorId: MAREN,
          status: "dead",
          certainty: "confirmed",
          note: "Maren fell into the millrace.",
        },
      ]),
    );
    const deathEvent = died.packageProgress!.actorEvents![0]!;

    const corrected = ok(
      commitActors(
        died,
        [
          {
            actorId: MAREN,
            status: "present",
            certainty: "confirmed",
            note: "OOC correction: Maren only fainted.",
            supersedes: deathEvent.id,
          },
        ],
        { turnId: "turn-2" },
      ),
    );
    expect(corrected.turns.at(-1)?.dropped).toBeUndefined();
    expect(actorOf(corrected.packageProgress, MAREN)?.status).toBe("present");

    const reusedSupersede = ok(
      commitActors(
        corrected,
        [
          {
            actorId: MAREN,
            status: "absent",
            certainty: "confirmed",
            note: "Trying to supersede again.",
            supersedes: deathEvent.id,
          },
        ],
        { turnId: "turn-3" },
      ),
    );
    expect(reusedSupersede.turns.at(-1)?.dropped).toEqual([
      `actorEvents: invalid supersede ${MAREN}`,
    ]);
    expect(actorOf(reusedSupersede.packageProgress, MAREN)?.status).toBe(
      "present",
    );
  });

  it("blocks confirmed disposition changes on a dead actor without supersedes", () => {
    const died = ok(
      commitActors(packageSession(), [
        {
          actorId: MAREN,
          status: "dead",
          disposition: "wary",
          certainty: "confirmed",
          note: "Maren fell into the millrace.",
        },
      ]),
    );
    const rejected = ok(
      commitActors(
        died,
        [
          {
            actorId: MAREN,
            disposition: "allied",
            certainty: "confirmed",
            note: "Trying to change disposition while dead.",
          },
        ],
        { turnId: "turn-2" },
      ),
    );
    expect(rejected.turns.at(-1)?.dropped).toEqual([
      `actorEvents: transition not allowed ${MAREN}`,
    ]);
    expect(actorOf(rejected.packageProgress, MAREN)?.disposition).toBe("wary");
  });

  it("rejects later turns that echo a stored remembered fact", () => {
    const saved = ok(
      commitActors(packageSession(), [
        {
          actorId: MAREN,
          fact: "Secretly keeps the brass sluice key.",
          certainty: "confirmed",
          note: "Maren hid the key.",
        },
      ]),
    );
    const leaked = commitActors(saved, [], {
      turnId: "turn-2",
      narration: "You recall that she secretly keeps the brass sluice key.",
    });
    expect(leaked.ok).toBe(false);
    if (!leaked.ok) {
      expect(leaked.errors.some((e) => e.code === "hidden-leakage")).toBe(true);
    }
  });

  it("records claimed actor events without mutating active state", () => {
    const claimed = ok(
      commitActors(packageSession(), [
        {
          actorId: MAREN,
          disposition: "hostile",
          fact: "Rumoured to meet smugglers at midnight.",
          certainty: "claimed",
          note: "Tavern gossip.",
        },
      ]),
    );
    expect(claimed.packageProgress?.actorEvents).toHaveLength(1);
    expect(actorOf(claimed.packageProgress, MAREN)).toBeUndefined();
  });
});

describe("actor event validation, bounds, and drops", () => {
  it("drops unknown actor IDs, prototype keys, record IDs, and empty changes while committing", () => {
    const result = ok(
      commitActors(packageSession(), [
        {
          actorId: "actor-does-not-exist",
          disposition: "friendly",
          certainty: "confirmed",
          note: "Unknown actor.",
        },
        {
          actorId: "__proto__",
          status: "present",
          certainty: "confirmed",
          note: "Prototype key.",
        },
        {
          actorId: "constructor",
          status: "present",
          certainty: "confirmed",
          note: "Constructor key.",
        },
        {
          actorId: "toString",
          status: "present",
          certainty: "confirmed",
          note: "toString key.",
        },
        {
          actorId: SCENE_1,
          status: "present",
          certainty: "confirmed",
          note: "Scene ID used as actorId.",
        },
        {
          actorId: MAREN,
          certainty: "confirmed",
          note: "Empty change with no status, disposition, or fact.",
        },
      ]),
    );
    expect(result.turns.at(-1)?.dropped).toEqual([
      "actorEvents: unknown actor actor-does-not-exist",
      "actorEvents: unknown actor __proto__",
      "actorEvents: unknown actor constructor",
      "actorEvents: unknown actor toString",
      `actorEvents: unknown actor ${SCENE_1}`,
      `actorEvents: empty change ${MAREN}`,
    ]);
    expect(result.packageProgress?.actorEvents ?? []).toHaveLength(0);
  });

  it("drops invalid notes, duplicate event IDs, full ledgers, and non-package sessions", () => {
    const index = packageProgressIndex(refPkg);
    const base: PackageProgress = {
      sceneId: SCENE_1,
      version: 1,
      records: [],
      events: [],
    };
    const invalidNote = applyPackageActorEvents(
      base,
      [
        {
          actorId: MAREN,
          disposition: "wary",
          certainty: "confirmed",
          note: "   ",
        },
      ],
      { turnId: "turn-1", index },
    );
    expect(invalidNote.dropped).toEqual([`actorEvents: invalid note ${MAREN}`]);

    const first = applyPackageActorEvents(
      base,
      [
        {
          actorId: MAREN,
          disposition: "wary",
          certainty: "confirmed",
          note: "First event.",
        },
      ],
      { turnId: "turn-dup", index },
    );
    const duplicate = applyPackageActorEvents(
      first.progress,
      [
        {
          actorId: MAREN,
          disposition: "friendly",
          certainty: "confirmed",
          note: "Duplicate event id.",
        },
      ],
      { turnId: "turn-dup", index },
    );
    expect(duplicate.dropped).toEqual([
      `actorEvents: duplicate event ${MAREN}`,
    ]);

    const fullEvents = Array.from(
      { length: MAX_PACKAGE_PROGRESS_ENTRIES },
      (_, i) => ({
        id: `t-${i}:actor:1`,
        turnId: `t-${i}`,
        actorId: MAREN,
        disposition: "neutral" as const,
        certainty: "confirmed" as const,
        note: "Filled.",
      }),
    );
    const full = applyPackageActorEvents(
      { ...base, actorEvents: fullEvents },
      [
        {
          actorId: MAREN,
          disposition: "allied",
          certainty: "confirmed",
          note: "Overflow.",
        },
      ],
      { turnId: "turn-overflow", index },
    );
    expect(full.dropped).toEqual([`actorEvents: ledger full ${MAREN}`]);

    const nonPackage = ok(
      commitActors(
        session(),
        [
          {
            actorId: MAREN,
            disposition: "friendly",
            certainty: "confirmed",
            note: "No package session.",
          },
        ],
        { noPackageMeta: true },
      ),
    );
    expect(nonPackage.turns.at(-1)?.dropped).toEqual([
      `actorEvents: no package ${MAREN}`,
    ]);
  });

  it("deduplicates remembered facts, keeps the most recent 5, and bounds prompt summary <= 4000 chars", () => {
    const facts = [
      "Fact 1: Saw the broken lantern.",
      "Fact 2: Owes money to the mill.",
      "Fact 1: Saw the broken lantern.",
      "Fact 3: Keeps a silver key.",
      "Fact 4: Fears the river fog.",
      "Fact 5: Knows the hidden path.",
      "Fact 6: Helped the wounded guard.",
    ];
    let current = packageSession();
    facts.forEach((fact, i) => {
      current = ok(
        commitActors(
          current,
          [
            {
              actorId: MAREN,
              fact,
              certainty: "confirmed",
              note: `Confirmed fact ${i + 1}.`,
            },
          ],
          { turnId: `turn-${i + 1}` },
        ),
      );
    });
    const stored = actorOf(current.packageProgress, MAREN)!;
    expect(stored.facts).toHaveLength(MAX_ACTOR_REMEMBERED_FACTS);
    expect(stored.facts).toEqual([
      "Fact 1: Saw the broken lantern.",
      "Fact 3: Keeps a silver key.",
      "Fact 4: Fears the river fog.",
      "Fact 5: Knows the hidden path.",
      "Fact 6: Helped the wounded guard.",
    ]);

    const bigFact = "X".repeat(MAX_ACTOR_FACT_CHARS);
    const crowded: PackageProgress = {
      sceneId: SCENE_1,
      version: 1,
      records: [],
      events: [],
      actors: Array.from({ length: 15 }, (_, i) => ({
        actorId: `actor-${i}`,
        status: "present",
        disposition: "wary",
        facts: [bigFact, bigFact, bigFact],
      })),
      actorEvents: Array.from({ length: 12 }, (_, i) => ({
        id: `t-${i}:actor:1`,
        turnId: `t-${i}`,
        actorId: `actor-${i}`,
        disposition: "wary",
        fact: bigFact,
        certainty: "confirmed",
        note: "Y".repeat(120),
      })),
    };
    const summary = packageProgressPromptSummary(crowded);
    expect(summary).toBeDefined();
    expect(JSON.stringify(summary).length).toBeLessThanOrEqual(
      MAX_PACKAGE_PROGRESS_PROMPT_CHARS,
    );
  });
});
