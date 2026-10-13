import { describe, expect, it } from "bun:test";
import {
  actOnTip,
  decideTip,
  dismissTip,
  finishArea,
  emptyTipsRecord,
  SILENCE_AFTER_DISMISSALS,
  TIP_CATALOGUE,
  type TipBlockers,
  type TipDecisionInput,
  type TipsRecord,
} from "../src/tips";

const NO_BLOCKERS: TipBlockers = {
  typing: false,
  dialogOpen: false,
  tourActive: false,
  journeyOrInvitationActive: false,
  cifOpen: false,
};

const ON: TipsRecord = { ...emptyTipsRecord(), enabled: true };

function input(over: Partial<TipDecisionInput> = {}): TipDecisionInput {
  return {
    record: ON,
    aiAvailable: true,
    goal: "world",
    goalInvitation: "goal",
    setupEnded: true,
    area: "graph",
    shownThisSession: false,
    blockers: NO_BLOCKERS,
    unavailableAreas: [],
    ...over,
  };
}

const reason = (d: ReturnType<typeof decideTip>) =>
  d.kind === "none" ? d.reason : "show";

describe("decideTip: showing a tip (FR-010, FR-013)", () => {
  it("shows the goal's tip for the current screen when every condition holds", () => {
    const d = decideTip(input());
    expect(d.kind).toBe("show");
    if (d.kind === "show") {
      expect(d.tip.goal).toBe("world");
      expect(d.tip.area).toBe("graph");
    }
  });

  it("is pure: the same input gives the same output and the input is not changed", () => {
    const i = input();
    const snapshot = JSON.stringify(i);
    expect(decideTip(i)).toEqual(decideTip(i));
    expect(JSON.stringify(i)).toBe(snapshot);
  });

  it("chooses a tip that matches the goal, not another goal's", () => {
    const d = decideTip(input({ goal: "story", area: "tables" }));
    expect(d.kind).toBe("show");
    if (d.kind === "show") expect(d.tip.goal).toBe("story");
  });
});

describe("decideTip: reasons, in the documented order", () => {
  it("is disabled when the switch is off (FR-005)", () => {
    expect(reason(decideTip(input({ record: emptyTipsRecord() })))).toBe(
      "disabled",
    );
  });

  it("is ai-unavailable when AI is off, even with tips on (FR-002)", () => {
    expect(reason(decideTip(input({ aiAvailable: false })))).toBe(
      "ai-unavailable",
    );
  });

  it("is no-goal for explore, dismissed, unanswered or missing goals (FR-024)", () => {
    for (const goalInvitation of ["explore", "dismissed", null] as const) {
      expect(reason(decideTip(input({ goalInvitation })))).toBe("no-goal");
    }
    expect(reason(decideTip(input({ goal: null })))).toBe("no-goal");
  });

  it("is setup-not-ended until guided setup is finished or left", () => {
    expect(reason(decideTip(input({ setupEnded: false })))).toBe(
      "setup-not-ended",
    );
  });

  it("is session-limit once a tip has shown this session (FR-008)", () => {
    expect(reason(decideTip(input({ shownThisSession: true })))).toBe(
      "session-limit",
    );
  });

  it("is feature-unavailable when the area's feature is not offered (FR-013)", () => {
    expect(
      reason(decideTip(input({ area: "map", unavailableAreas: ["map"] }))),
    ).toBe("feature-unavailable");
  });

  it("is no-eligible-tip on a screen with no tip for this goal", () => {
    expect(reason(decideTip(input({ area: "settings" })))).toBe(
      "no-eligible-tip",
    );
  });
});

describe("decideTip: quiet rules (FR-012, FR-014, FR-015)", () => {
  const blockerNames = [
    "typing",
    "dialogOpen",
    "tourActive",
    "journeyOrInvitationActive",
    "cifOpen",
  ] as const;

  for (const name of blockerNames) {
    it(`is blocked while ${name} is true, alone`, () => {
      const d = decideTip(
        input({ blockers: { ...NO_BLOCKERS, [name]: true } }),
      );
      expect(reason(d)).toBe("blocked");
    });
  }

  it("is blocked when every blocker is active at once", () => {
    const all = Object.fromEntries(
      blockerNames.map((n) => [n, true]),
    ) as TipBlockers;
    expect(reason(decideTip(input({ blockers: all })))).toBe("blocked");
  });

  it("ranks blocked after session-limit and before area-silenced", () => {
    const blocked = input({
      blockers: { ...NO_BLOCKERS, typing: true },
      shownThisSession: true,
    });
    expect(reason(decideTip(blocked))).toBe("session-limit");
  });
});

describe("dismissal, acting and silencing (FR-022, FR-023)", () => {
  const tip = TIP_CATALOGUE.find((t) => t.id === "world-explore-graph")!;

  it("never offers a dismissed tip again", () => {
    const record = dismissTip(ON, tip);
    expect(reason(decideTip(input({ record })))).toBe("no-eligible-tip");
  });

  it("never offers a tip the person acted on again", () => {
    const record = actOnTip(ON, tip);
    expect(reason(decideTip(input({ record })))).toBe("no-eligible-tip");
  });

  it("silences a screen after repeated dismissals", () => {
    // Each goal has one tip per screen; two goals' generator tips make two dismissals on one screen.
    const worldGen = TIP_CATALOGUE.find(
      (t) => t.id === "world-generate-faction",
    )!;
    const campaignGen = TIP_CATALOGUE.find(
      (t) => t.id === "campaign-generator-or-oracle",
    )!;
    let record = dismissTip(ON, worldGen);
    expect(record.silencedAreas).toEqual([]);
    record = dismissTip(record, campaignGen);
    expect(record.dismissCounts.generators).toBe(SILENCE_AFTER_DISMISSALS);
    expect(record.silencedAreas).toEqual(["generators"]);
    expect(
      reason(decideTip(input({ record, goal: "story", area: "generators" }))),
    ).toBe("area-silenced");
  });

  it("does not double-count the same tip dismissed twice (negative case)", () => {
    const once = dismissTip(ON, tip);
    const twice = dismissTip(once, tip);
    expect(twice.dismissed).toEqual(["world-explore-graph"]);
    expect(twice.dismissCounts.graph).toBe(1);
  });

  it("leaves other screens unaffected by a silenced screen", () => {
    const silenced: TipsRecord = {
      ...ON,
      dismissCounts: { generators: 2 },
      silencedAreas: ["generators"],
    };
    const d = decideTip(input({ record: silenced, area: "graph" }));
    expect(d.kind).toBe("show");
  });
});

describe("goal change (FR-025)", () => {
  it("follows the new goal without resetting what was dismissed", () => {
    const world = TIP_CATALOGUE.find((t) => t.id === "world-explore-graph")!;
    const record = dismissTip(ON, world);
    const campaign = decideTip(
      input({ record, goal: "campaign", area: "tables" }),
    );
    expect(campaign.kind).toBe("show");
    if (campaign.kind === "show") expect(campaign.tip.goal).toBe("campaign");
    expect(record.dismissed).toEqual(["world-explore-graph"]);
  });
});

describe("finish-target skip (research D8)", () => {
  it("names each goal's finish screen from its journey", () => {
    expect(finishArea("world")).toBe("map");
    expect(finishArea("campaign")).toBe("map");
    expect(finishArea("story")).toBe("canvas");
  });

  it("does not suggest the screen a goal already ends on", () => {
    expect(reason(decideTip(input({ goal: "world", area: "map" })))).toBe(
      "no-eligible-tip",
    );
    expect(reason(decideTip(input({ goal: "story", area: "canvas" })))).toBe(
      "no-eligible-tip",
    );
  });

  it("still suggests other screens for the same goal (negative case)", () => {
    const d = decideTip(input({ goal: "world", area: "graph" }));
    expect(d.kind).toBe("show");
  });
});
