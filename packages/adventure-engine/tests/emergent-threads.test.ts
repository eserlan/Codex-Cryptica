import { describe, expect, it } from "vitest";
import {
  applyCompletedTurn,
  buildAdventureRecap,
  buildGMDirectorBrief,
  closeEmergentThread,
  followEmergentThread,
  linkEmergentThreadToScenario,
  parseAdventureSession,
  projectPlayerEmergentThreads,
  unfollowEmergentThread,
  type AdventureSession,
  type CompletedTurnProposal,
} from "../src";
import { meta, proposal, scenario, session } from "./reducer-fixtures";

let counter = 0;
const nextId = () => `em-${++counter}`;

function baseTurn(overrides: Partial<CompletedTurnProposal> = {}) {
  return { ...proposal(), ...overrides };
}

function commit(
  s: AdventureSession,
  turnOverrides: Partial<CompletedTurnProposal> & { playerAction?: string },
  step: number,
): AdventureSession {
  const { playerAction, ...proposalOverrides } = turnOverrides;
  const turnMeta = {
    ...meta,
    turnId: `turn-${step}`,
    inputId: `input-${step}`,
    ...(playerAction !== undefined ? { playerAction } : {}),
  };
  const res = applyCompletedTurn(
    s,
    baseTurn(proposalOverrides),
    turnMeta,
    turnMeta.now,
    nextId,
  );
  if (!res.ok) throw new Error(res.errors.map((e) => e.message).join("; "));
  return res.value;
}

describe("Emergent player-led GM threads (#5177)", () => {
  it("1 & 2. promotes an improvised water-access case into one durable thread across places, NPCs, and reload without touching dormant rumours", () => {
    let s = session();
    s.places = [{ id: "p-square", name: "Well Square" }];
    s.currentPlaceId = "p-square";
    s.people = [
      {
        id: "p-clerk",
        name: "Clerk Tomas",
        aliases: ["Tomas"],
        linkedFactIds: [],
      },
      {
        id: "p-envoy",
        name: "Envoy Ilona",
        aliases: ["Ilona"],
        linkedFactIds: [],
      },
    ];
    s.scenarioCollection = {
      version: 1,
      focusedScenarioId: null,
      items: [
        {
          ...scenario(),
          id: "dormant-rumour-1",
          status: "open",
          knowledge: "unheard",
          stage: "hearsay",
          playerVisible: {
            rumour: "Old mill ghost",
            lead: "Mill",
            source: "Baker",
          },
          gmOnly: { truth: "Bandits in mill" },
          secretBindings: { truth: "sec-1", eventIds: {} },
          revealedSecretIds: [],
          events: [],
        },
      ],
    };

    // Turn 1: Initial water distribution inquiry + provisional clue
    s = commit(
      s,
      {
        playerAction:
          "Ask Envoy Ilona why water access to the lower cisterns was cut.",
        narration:
          "Ilona explains the water rationing order came from Clerk Tomas.",
        provisionalFacts: [
          {
            kind: "clue",
            name: "Water Rationing Order",
            summary: "Lower cisterns were shut by Clerk Tomas.",
            visibility: "player-visible",
          },
        ],
        visiblePatch: {
          ...baseTurn().visiblePatch,
          knownFacts: {
            add: [
              {
                text: "Lower cistern water access was shut by Clerk Tomas.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
          activeCharacters: {
            add: [{ text: "Envoy Ilona", source: "provisional" }],
            update: [],
            removeIds: [],
          },
        },
      },
      1,
    );
    expect(s.emergentThreads).toHaveLength(1);
    const threadId = s.emergentThreads![0]!.id;

    // Turns 2-4: Follow water trail across 3 more places and another NPC
    for (const [step, place, action, fact] of [
      [
        2,
        "Canal Lock",
        "Inspect the canal lock ledger for water diversions.",
        "Lock ledger shows water diverted to upper estates.",
      ],
      [
        3,
        "Council Hall",
        "Question Clerk Tomas about the water diversion ledger.",
        "Clerk Tomas admits signing the water diversion under pressure.",
      ],
      [
        4,
        "Pump House",
        "Check the pump house valve for water tampering.",
        "Pump house valve seal was broken recently.",
      ],
    ] as const) {
      s = commit(
        s,
        {
          playerAction: action,
          narration: fact,
          moveTo: { name: place },
          visiblePatch: {
            ...baseTurn().visiblePatch,
            knownFacts: {
              add: [{ text: fact, source: "provisional" }],
              update: [],
              removeIds: [],
            },
          },
        },
        step,
      );
    }

    expect(s.emergentThreads).toHaveLength(1);
    const thread = s.emergentThreads![0]!;
    expect(thread.id).toBe(threadId);
    expect(thread.turnCount).toBe(4);
    expect(thread.linkedPlaceIds.length).toBe(4);
    expect(thread.linkedPersonIds).toContain("p-envoy");
    expect(thread.linkedFactIds.length).toBeGreaterThanOrEqual(1);
    expect(s.scenarioCollection?.items[0]?.knowledge).toBe("unheard");

    // Rehydrate via parseAdventureSession (reload/reset continuity)
    const reloaded = parseAdventureSession(JSON.parse(JSON.stringify(s)));
    expect(reloaded.emergentThreads).toHaveLength(1);
    const brief = buildGMDirectorBrief({
      session: reloaded,
      phase: "action",
    });
    expect(brief?.mode).toBe("active-pursuit");
    expect(brief?.pursuedEmergentThread?.threadId).toBe(threadId);
    expect(brief?.pursuedScenarios).toHaveLength(0);
  });

  it("3. does not hijack free play when the player ignores the case to explore a market", () => {
    let s = session();
    s = commit(
      s,
      {
        playerAction: "Ask about the missing water ledger.",
        narration: "A clerk confirms the water ledger is missing.",
        provisionalFacts: [
          {
            kind: "clue",
            name: "Missing Water Ledger",
            summary: "The ledger vanished last night.",
            visibility: "player-visible",
          },
        ],
      },
      1,
    );
    expect(s.emergentThreads).toHaveLength(1);

    const brief = buildGMDirectorBrief({
      session: s,
      phase: "action",
      playerAction: "Explore the market stalls and browse spice wares",
    });
    expect(brief?.pursuedEmergentThread).toBeUndefined();
    expect(brief?.mode).toBe("open-world");
  });

  it("4. does not spawn a thread on casual shop-price chatter and keeps unrelated investigations at the same place separate", () => {
    let s = session();
    s.places = [{ id: "p-hall", name: "Town Hall" }];
    s.currentPlaceId = "p-hall";

    // Casual shop price question should NOT spawn a thread
    s = commit(
      s,
      {
        playerAction: "Ask the vendor how much the price of bread is?",
        narration: "Two coppers a loaf.",
      },
      1,
    );
    expect(s.emergentThreads ?? []).toHaveLength(0);

    // Investigation A at Town Hall: water rationing
    s = commit(
      s,
      {
        playerAction: "Ask about the water rationing decree.",
        narration: "The clerk hands over a torn water decree.",
        provisionalFacts: [
          {
            kind: "clue",
            name: "Water Decree",
            summary: "Water rationing decree signed at Town Hall.",
            visibility: "player-visible",
          },
        ],
      },
      2,
    );
    // Investigation B at Town Hall: stolen bell clapper (unrelated topic)
    s = commit(
      s,
      {
        playerAction: "Ask who stole the bell clapper.",
        narration: "A witness points to scratches on the belfry door.",
        provisionalFacts: [
          {
            kind: "clue",
            name: "Belfry Scratches",
            summary: "Pry marks around the stolen bell clapper.",
            visibility: "player-visible",
          },
        ],
      },
      3,
    );
    expect(s.emergentThreads).toHaveLength(2);
    expect(s.emergentThreads![0]!.id).not.toBe(s.emergentThreads![1]!.id);
  });

  it("5 & 6. supports compatible rumour linking, player follow/unfollow/close, dead-ends, and spoiler-safe projection", () => {
    let s = session();
    s.scenarioCollection = {
      focusedScenarioId: null,
      items: [
        {
          id: "rumour-water",
          kind: "rumour",
          status: "open",
          knowledge: "heard",
          stage: "hearsay",
          origin: { sourceRecordId: "src-1", kind: "seed" },
          anchorRefs: [],
          playerVisible: {
            rumour: "Cisterns run dry",
            lead: "Cistern",
          },
          gmOnly: { truth: "Hidden saboteur" },
          secretBindings: { truth: "sec-w", eventIds: {} },
          revealedSecretIds: [],
          events: [],
        } as any,
      ],
    };

    s = commit(
      s,
      {
        playerAction: "Investigate the dry cisterns.",
        narration: "You find fresh mortar sealing the intake.",
        provisionalFacts: [
          {
            kind: "clue",
            name: "Fresh Mortar",
            summary: "Intake sealed intentionally.",
            visibility: "player-visible",
          },
        ],
        causalCommitments: [
          {
            kind: "mechanism",
            commitmentClass: "supporting-explanation",
            subject: "Intake Seal",
            summary: "GM note: Mason guild paid off.",
          },
        ],
      },
      1,
    );

    const threadId = s.emergentThreads![0]!.id;
    s = linkEmergentThreadToScenario(s, threadId, "rumour-water");
    expect(s.emergentThreads![0]!.linkedScenarioId).toBe("rumour-water");
    // Authored scenario remains intact and unconverted
    expect(s.scenarioCollection!.items[0]!.gmOnly.truth).toBe(
      "Hidden saboteur",
    );

    // Player projection strips gmOnlyDevelopments
    const projected = projectPlayerEmergentThreads(s);
    expect("gmOnlyDevelopments" in projected[0]!).toBe(false);

    // Voluntary follow -> recap shows focused emergentLead -> unfollow -> close as cold
    s = followEmergentThread(s, threadId);
    expect(buildAdventureRecap(s).emergentLeads?.[0]?.focused).toBe(true);
    s = unfollowEmergentThread(s);
    expect(buildAdventureRecap(s).emergentLeads?.[0]?.focused).toBe(false);
    s = closeEmergentThread(s, threadId, "cold");
    expect(s.emergentThreads![0]!.status).toBe("cold");
  });
});
