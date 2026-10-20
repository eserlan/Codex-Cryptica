import { describe, expect, it } from "vitest";
import { generateBusinessStaged } from "./business-staged";
import { checkBusiness } from "./business-checks";
import { generateBusinessLocal } from "./business-local";
import { seeded } from "./business-test-helpers";

const OPTS = {
  genre: "Cyberpunk / Corporate",
  businessType: "Ripper clinic",
  scale: "small" as const,
  legitimacy: "legitimate" as const,
};

const identityReply = JSON.stringify({
  identity: {
    name: "Chrome Lily",
    type: "Ripper clinic",
    description: "A clinic above the noodle stalls.",
    reputationLine: "Discreet and fast.",
    distinctive: "Clean surgical kit.",
  },
  operations: {
    provides: "Implant repair.",
    payers: "Couriers and dockworkers.",
    whyHere: "Near the tram stop.",
    mainIncome: "Repeat repairs.",
    model: "It earns a fee for the work it does.",
    size: "A small shop with a few staff.",
    position: "Steady, with little to spare.",
  },
  leadership: {
    name: "Nadia Vale",
    goal: "Stay open another year.",
    style: "Hands-on.",
    trait: "Blunt.",
    pressure: "Owes the landlord.",
  },
  staff: [
    {
      name: "Tomo Ruiz",
      role: "Technician",
      goal: "Save for a flat.",
      trait: "Quick hands.",
    },
  ],
  clientele: {
    typical: "Couriers.",
    valuable: "A corporate medic.",
    undesirable: "Drunk street fighters.",
  },
});

const connectionsReply = JSON.stringify({
  dependencies: [
    {
      input: "Black-clinic parts",
      kind: "materials",
      ifItFails: "Repairs stop.",
    },
  ],
  relationships: [
    {
      name: "Helix Medical Corp",
      kind: "competitor",
      partyKind: "organisation",
      reason: "Undercuts every quote.",
    },
  ],
  reputation: {
    perception: "Discreet.",
    consequence: "Quiet credit from regulars.",
  },
});

const troubleReply = JSON.stringify({
  pressure: "The grid keeps failing.",
  asset: "A generator nobody else can afford.",
  secret: "A back door for patients the city has lost track of.",
  opportunity: "A corporate medic wants a discreet partner.",
  complication: "A drone followed a courier home.",
  hooks: [
    "Nadia Vale needs a courier to the blackout block tonight.",
    "Helix Medical Corp is buying up the clinic's regulars.",
    "Black-clinic parts are running out before the next shift.",
  ],
});

function queue(...replies: string[]) {
  const calls: string[] = [];
  const pending = [...replies];
  const send = async (message: string) => {
    calls.push(message);
    return pending.shift() ?? "";
  };
  return { send, calls };
}

describe("generateBusinessStaged", () => {
  it("runs three turns on one session and keeps the AI sections", async () => {
    const { send, calls } = queue(
      identityReply,
      connectionsReply,
      troubleReply,
    );
    const steps: string[] = [];
    const doc = await generateBusinessStaged(OPTS, {
      send,
      rng: seeded(11),
      onProgress: (list) =>
        steps.push(list.map((s) => `${s.id}:${s.status}`).join(",")),
    });
    expect(calls).toHaveLength(3);
    expect(doc.identity.name).toBe("Chrome Lily");
    expect(doc.relationships[0].name).toBe("Helix Medical Corp");
    expect(doc.fallbackSections).toEqual([]);
    expect(checkBusiness(doc)).toEqual([]);
    expect(steps.at(-1)).toContain("trouble:done");
  });

  it("retries an unusable stage with the problem named", async () => {
    const { send, calls } = queue(
      "sorry",
      identityReply,
      connectionsReply,
      troubleReply,
    );
    const doc = await generateBusinessStaged(OPTS, { send, rng: seeded(12) });
    expect(calls).toHaveLength(4);
    expect(calls[1]).toContain("not usable");
    expect(doc.identity.name).toBe("Chrome Lily");
    expect(doc.fallbackSections).toEqual([]);
  });

  it("falls back to local tables for only the stage that keeps failing", async () => {
    const { send } = queue(
      "nope",
      "still nope",
      connectionsReply,
      troubleReply,
    );
    const doc = await generateBusinessStaged(OPTS, { send, rng: seeded(13) });
    expect(doc.fallbackSections).toEqual(
      expect.arrayContaining(["identity", "operations", "clientele"]),
    );
    expect(doc.fallbackSections).not.toContain("relationships");
    expect(doc.relationships[0].name).toBe("Helix Medical Corp");
    expect(checkBusiness(doc)).toEqual([]);
  });

  it("reports a fallback in the progress list", async () => {
    const { send } = queue("nope", "nope", connectionsReply, troubleReply);
    let last = "";
    await generateBusinessStaged(OPTS, {
      send,
      rng: seeded(14),
      onProgress: (list) =>
        (last = list.map((s) => `${s.id}:${s.status}`).join(",")),
    });
    expect(last).toContain("identity:fallback");
  });

  it("rejects a criminal secret in a legitimate business and retries the trouble stage", async () => {
    const criminal = JSON.parse(troubleReply);
    criminal.secret = "The owner runs a smuggling ring out of the back room.";
    const { send, calls } = queue(
      identityReply,
      connectionsReply,
      JSON.stringify(criminal),
      troubleReply,
    );
    const doc = await generateBusinessStaged(OPTS, { send, rng: seeded(15) });
    expect(calls).toHaveLength(4);
    expect(doc.secret).not.toMatch(/smuggl/i);
  });

  it("requires management from the trouble stage when the players own the business", async () => {
    const withManagement = JSON.parse(troubleReply);
    withManagement.management = {
      strengths: ["Loyal crew", "Good name"],
      liabilities: ["Old tools", "Thin cash"],
      upgrades: ["A second bench"],
      obligations: ["Rent"],
      successAttracts: ["Corporate attention"],
    };
    const { send, calls } = queue(
      identityReply,
      connectionsReply,
      troubleReply,
      JSON.stringify(withManagement),
    );
    const doc = await generateBusinessStaged(
      { ...OPTS, playersOwn: true },
      { send, rng: seeded(16) },
    );
    expect(calls).toHaveLength(4);
    expect(doc.management?.obligations).toEqual(["Rent"]);
    expect(doc.leadership.role).toBe("manager");
  });

  it("propagates cancellation and does not fall back", async () => {
    const controller = new AbortController();
    const send = async () => {
      controller.abort();
      throw new DOMException("cancelled", "AbortError");
    };
    await expect(
      generateBusinessStaged(OPTS, {
        send,
        signal: controller.signal,
        rng: seeded(17),
      }),
    ).rejects.toThrow();
  });
});

describe("established facts and name continuity", () => {
  it("tells the later stages the business and its people", async () => {
    const { send, calls } = queue(
      identityReply,
      connectionsReply,
      troubleReply,
    );
    await generateBusinessStaged(OPTS, { send, rng: seeded(21) });
    expect(calls[0]).not.toContain("Established facts");
    for (const later of [calls[1], calls[2]]) {
      expect(later).toContain("Established facts");
      expect(later).toContain("Chrome Lily");
      expect(later).toContain("Nadia Vale");
      expect(later).toContain("Tomo Ruiz");
    }
    // The parties are only known once the connections stage has set them.
    expect(calls[1]).not.toContain("Helix Medical Corp (competitor");
    expect(calls[2]).toContain("Helix Medical Corp (competitor");
  });

  it("describes the local business to the later stages when the identity stage falls back", async () => {
    // The sample in the review: stage one failed, later stages invented their own cast.
    const local = generateBusinessLocal(OPTS, seeded(22));
    const { send, calls } = queue(
      "nope",
      "still nope",
      connectionsReply,
      troubleReply,
    );
    const doc = await generateBusinessStaged(OPTS, { send, rng: seeded(22) });
    expect(doc.identity.name).toBe(local.identity.name);
    const connectionsMessage = calls[2];
    expect(connectionsMessage).toContain("Established facts");
    expect(connectionsMessage).toContain(local.identity.name);
    expect(connectionsMessage).toContain(local.leadership.name);
  });

  it("retries a stage that introduces someone nobody defined", async () => {
    const stranger = JSON.parse(troubleReply);
    stranger.hooks = [
      "Edran Pell wants the ledgers before Nima Quill finds them.",
      "Helix Medical Corp is buying up the clinic's regulars.",
    ];
    const { send, calls } = queue(
      identityReply,
      connectionsReply,
      JSON.stringify(stranger),
      troubleReply,
    );
    const doc = await generateBusinessStaged(OPTS, { send, rng: seeded(23) });
    expect(calls).toHaveLength(4);
    expect(calls[3]).toContain("Edran Pell");
    expect(doc.hooks.join(" ")).not.toContain("Edran Pell");
    expect(doc.warnings).toBeUndefined();
  });

  it("records a warning when a stranger survives the retry", async () => {
    const stranger = JSON.parse(troubleReply);
    stranger.hooks = [
      "Nadia Vale wants the ledgers before Edran Pell finds them.",
      "Helix Medical Corp is courting Nima Quill.",
    ];
    const bad = JSON.stringify(stranger);
    const { send } = queue(identityReply, connectionsReply, bad, bad);
    const doc = await generateBusinessStaged(OPTS, { send, rng: seeded(24) });
    expect(doc.warnings).toEqual(
      expect.arrayContaining(["Edran Pell", "Nima Quill"]),
    );
  });

  it("rejects a connections reply whose label does not fit the party", async () => {
    const mislabelled = JSON.parse(connectionsReply);
    mislabelled.relationships = [
      {
        name: "The Reedknife Circle",
        kind: "criminal",
        partyKind: "organisation",
        label: "located in",
        reason: "A smuggling network testing the clinic.",
      },
    ];
    const { send, calls } = queue(
      identityReply,
      JSON.stringify(mislabelled),
      connectionsReply,
      troubleReply,
    );
    const doc = await generateBusinessStaged(OPTS, { send, rng: seeded(25) });
    expect(calls).toHaveLength(4);
    expect(doc.relationships.every((r) => r.label !== "located in")).toBe(true);
  });
});
