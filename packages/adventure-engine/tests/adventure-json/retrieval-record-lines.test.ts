import { describe, expect, it } from "vitest";
import {
  actorLines,
  clueLines,
  encounterLines,
  itemLines,
  locationLines,
  premiseLines,
  rumourLines,
  sceneLines,
  secretLines,
  systemLines,
} from "../../src/adventure-json/retrieval-record-lines";
import { buildText } from "../../src/adventure-json/retrieval-text";

const metadata = {
  visibility: "player-visible" as const,
  epistemicStatus: "explicit" as const,
};

describe("retrieval record line projections", () => {
  it("projects scene branches and read-aloud arrays in source order", () => {
    const lines = [
      ...sceneLines({
        ...metadata,
        id: "scene",
        title: "Arrival",
        summary: "At the gate",
        readAloud: ["First", "Second"],
        branches: [
          {
            targetSceneId: "next",
            description: "Proceed",
            condition: "If open",
          },
          { targetSceneId: "last", description: "Wait" },
        ],
      }),
    ];
    expect(buildText(lines, 1000)).toBe(
      "Title: Arrival\nSummary: At the gate\nRead aloud: First; Second\nBranch target: next\nBranch: Proceed; If open\nBranch target: last\nBranch: Wait",
    );
    expect(lines).toContainEqual([
      "Branch target",
      "next",
      undefined,
      ["next"],
    ]);
  });

  it("preserves connection references and missing connection descriptions", () => {
    const lines = [
      ...locationLines({
        ...metadata,
        id: "hall",
        name: "Hall",
        summary: "",
        connections: [
          { targetLocationId: "tower", travelConditions: ["Daylight"] },
          { targetLocationId: "yard" },
        ],
      }),
    ];
    expect(lines).toContainEqual([
      "Connection target",
      "tower",
      undefined,
      ["tower"],
    ]);
    expect(buildText(lines, 1000)).toBe(
      "Name: Hall\nSummary: \nConnection target: tower\nConnection: Daylight\nConnection target: yard",
    );
  });

  it("formats overview lines and partial party ranges without inventing bounds", () => {
    expect(
      buildText(
        premiseLines({
          background: "Before",
          hook: "Now",
          theme: ["Mystery"],
          tone: "Quiet",
        }),
        1000,
      ),
    ).toBe("Background: Before\nHook: Now\nTheme: Mystery\nTone: Quiet");
    expect(
      buildText(
        systemLines({ name: "Game", targetParty: { sizeMin: 2, levelMax: 5 } }),
        1000,
      ),
    ).toBe("Name: Game\nParty size: 2-?\nParty level: ?-5");
    expect(buildText(systemLines({ name: "Game" }), 1000)).toBe("Name: Game");
  });

  it("projects encounter actors and alternative solutions", () => {
    const lines = [
      ...encounterLines({
        ...metadata,
        id: "meeting",
        title: "Meeting",
        description: "Talk",
        sceneId: "scene",
        actorIds: ["actor"],
        alternativeSolutions: [
          { method: "Negotiate", description: "Offer help" },
        ],
      }),
    ];
    expect(lines).toContainEqual(["Actors", ["actor"], undefined, ["actor"]]);
    expect(buildText(lines, 1000)).toBe(
      "Title: Meeting\nScene: scene\nDescription: Talk\nActors: actor\nAlternative solution: Negotiate; Offer help",
    );
  });

  it("marks protected clue and rumour fields while retaining structured links", () => {
    const clue = clueLines({
      ...metadata,
      id: "clue",
      text: "Tracks",
      reveals: "A spy",
      placedActorId: "actor",
      leadTargetId: "tower",
    });
    expect([...clue]).toContainEqual(["Reveals", "A spy", true]);
    const rumour = rumourLines({
      ...metadata,
      id: "rumour",
      text: "A tale",
      truth: "false",
      targetEntityId: "tower",
    });
    expect([...rumour]).toContainEqual(["Truth", "false", true]);
    expect(
      buildText(
        actorLines({
          ...metadata,
          id: "actor",
          name: "Guard",
          summary: "On watch",
          factionId: "watch",
          locationId: "hall",
        }),
        1000,
      ),
    ).toBe("Name: Guard\nSummary: On watch\nFaction: watch\nLocation: hall");
    expect(
      buildText(
        itemLines({
          ...metadata,
          id: "item",
          name: "Key",
          summary: "A key",
          actorId: "actor",
        }),
        1000,
      ),
    ).toBe("Name: Key\nSummary: A key\nActor: actor");
    expect([
      ...secretLines({
        id: "secret",
        text: "A secret",
        relatedEntityIds: ["scene"],
        visibility: "gm-only",
        epistemicStatus: "explicit",
      }),
    ]).toEqual([
      ["Text", "A secret"],
      ["Related", ["scene"], undefined, ["scene"]],
    ]);
  });

  it("does not read nested scene data once bounded text fills", () => {
    const scene = {
      ...metadata,
      id: "scene",
      title: "x".repeat(100),
      summary: "Summary",
      get branches(): never {
        throw new Error("Late branches were read");
      },
    };
    expect(buildText(sceneLines(scene), 10)).toHaveLength(11);
  });
});
