import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AdventureJsonV1Schema,
  type AdventureJsonV1,
} from "../../src/adventure-json";

const REPO_ROOT = resolve(import.meta.dir, "../../../..");
const REFERENCE = "fixtures/adventures/reference-one-shot/adventure.v1.json";
const REFERENCE_COPIES = [
  REFERENCE,
  "apps/web/static/schemas/adventure-json/examples/reference-one-shot.v1.json",
  "apps/web/static/schemas/adventure/examples/reference-one-shot.v1.json",
];
const MINIMAL_COPIES = [
  "apps/web/static/schemas/adventure-json/examples/minimal.v1.json",
  "apps/web/static/schemas/adventure/examples/minimal.v1.json",
];

function load(relPath: string): AdventureJsonV1 {
  const raw = JSON.parse(readFileSync(resolve(REPO_ROOT, relPath), "utf8"));
  return AdventureJsonV1Schema.parse(raw);
}

function records(adventure: AdventureJsonV1) {
  return [
    adventure.locations,
    adventure.actors,
    adventure.factions,
    adventure.scenes,
    adventure.encounters,
    adventure.clues,
    adventure.rumours,
    adventure.items,
  ].flat();
}

/**
 * The conservative player-safe reading of v1: `visibility` covers the whole
 * record, so the safe projection keeps `player-visible` records verbatim and
 * drops everything `gm-only`, including every secret.
 */
function playerSafeText(adventure: AdventureJsonV1): string {
  const visible = records(adventure).filter(
    (record) => record.visibility === "player-visible",
  );
  return JSON.stringify(visible).toLowerCase();
}

/** Short lowercase phrases that must live only in `gm-only` reference records. */
const HIDDEN_FACTS = [
  "wants the mill to fail so the bailiff will sell it cheaply",
  "water in the cellar starts to rise",
  "floods once the sluice lever is pulled",
  "about five turns",
  "bound and gagged",
  "receipt for the lock on the sluice pin",
  "aldous speaks freely",
  "maren is absent",
  "arrives from the wheel room",
  "unpaid wages",
  "names tobiah's debt",
  "yields if his hound is hurt",
  "lock fitted to the sluice pin",
  "calm blessing",
];

function auditProjection(adventure: AdventureJsonV1, text: string): string[] {
  const leaks: string[] = [];
  for (const secret of adventure.secrets) {
    if (text.includes(secret.text.toLowerCase())) {
      leaks.push(`secret ${secret.id} text is player-visible`);
    }
  }
  for (const record of records(adventure)) {
    const own = JSON.stringify(record).toLowerCase();
    if (record.visibility === "gm-only" && text.includes(own)) {
      leaks.push(`gm-only ${record.id} is projected`);
    }
  }
  return leaks;
}

function auditConditions(adventure: AdventureJsonV1): string[] {
  const leaks: string[] = [];
  const visibleScenes = adventure.scenes.filter(
    (scene) => scene.visibility === "player-visible",
  );
  for (const scene of visibleScenes.filter((s) => s.conditions?.length)) {
    leaks.push(`visible scene ${scene.id} has conditions`);
  }
  const visibleEncounters = adventure.encounters.filter(
    (encounter) => encounter.visibility === "player-visible",
  );
  for (const encounter of visibleEncounters) {
    if (encounter.conditions?.length) {
      leaks.push(`visible encounter ${encounter.id} has conditions`);
    }
    if (encounter.alternativeSolutions?.length) {
      leaks.push(`visible encounter ${encounter.id} has alternativeSolutions`);
    }
  }
  return leaks;
}

function auditHiddenFacts(
  adventure: AdventureJsonV1,
  text: string,
  facts: string[],
): string[] {
  const hidden = [
    ...records(adventure).filter((record) => record.visibility === "gm-only"),
    ...adventure.secrets,
  ].map((record) => JSON.stringify(record).toLowerCase());
  const leaks: string[] = [];
  for (const fact of facts) {
    if (text.includes(fact))
      leaks.push(`hidden fact is player-visible: ${fact}`);
    if (!hidden.some((h) => h.includes(fact))) {
      leaks.push(`hidden fact is in no gm-only record: ${fact}`);
    }
  }
  return leaks;
}

/** Returns every spoiler leak found; an empty list means the audit passes. */
function auditSpoilers(
  adventure: AdventureJsonV1,
  knownHiddenFacts: string[] = [],
): string[] {
  const text = playerSafeText(adventure);
  return [
    ...auditProjection(adventure, text),
    ...auditConditions(adventure),
    ...auditHiddenFacts(adventure, text, knownHiddenFacts),
  ];
}

const MOTIVE = "wants the mill to fail so the bailiff will sell it cheaply";

describe("fixture-level spoiler audit (#5000)", () => {
  it.each(REFERENCE_COPIES)("%s has no spoiler leaks", (relPath) => {
    expect(auditSpoilers(load(relPath), HIDDEN_FACTS)).toEqual([]);
  });

  it.each(MINIMAL_COPIES)("%s has no spoiler leaks", (relPath) => {
    expect(auditSpoilers(load(relPath))).toEqual([]);
  });

  it("keeps the reference copies and the minimal copies identical", () => {
    const read = (p: string) => readFileSync(resolve(REPO_ROOT, p), "utf8");
    for (const copy of REFERENCE_COPIES) {
      expect(read(copy)).toBe(read(REFERENCE_COPIES[0]!));
    }
    expect(read(MINIMAL_COPIES[1]!)).toBe(read(MINIMAL_COPIES[0]!));
  });

  it("makes the logic-only records gm-only as whole records", () => {
    const adventure = load(REFERENCE);
    const scene = adventure.scenes.find((s) => s.id === "ros-scene-4-cellar");
    const encounter = adventure.encounters.find(
      (e) => e.id === "enc-wheel-room-wick",
    );
    const clue = adventure.clues.find((c) => c.id === "clue-sluice-sabotage");

    expect(scene?.visibility).toBe("gm-only");
    expect(scene?.conditions).toHaveLength(2);
    expect(encounter?.visibility).toBe("gm-only");
    expect(encounter?.alternativeSolutions).toHaveLength(2);
    expect(
      encounter?.alternativeSolutions?.some((s) => s.socialBypassOfCombat),
    ).toBe(true);
    expect(clue?.visibility).toBe("gm-only");
  });
});

describe("spoiler-safe visibility (#4894)", () => {
  it.each(REFERENCE_COPIES)(
    "%s keeps a discoverable antagonist's motive out of player-visible records",
    (relPath) => {
      const adventure = load(relPath);
      const tobiah = adventure.actors.find((a) => a.id === "actor-tobiah-reed");

      expect(tobiah?.visibility).toBe("player-visible");
      expect(tobiah?.motivation).toBeUndefined();
      expect(tobiah?.role?.toLowerCase()).not.toContain("antagonist");
      expect(playerSafeText(adventure)).not.toContain(MOTIVE);
      expect(playerSafeText(adventure)).not.toContain("antagonist");
    },
  );

  it.each(REFERENCE_COPIES)(
    "%s stores the concealed motive as a gm-only secret linked to the actor",
    (relPath) => {
      const secret = load(relPath).secrets.find(
        (s) => s.id === "secret-tobiah-motive",
      );

      expect(secret?.visibility).toBe("gm-only");
      expect(secret?.relatedEntityIds).toContain("actor-tobiah-reed");
      expect(secret?.text.toLowerCase()).toContain(MOTIVE);
    },
  );

  it("gives every secret a gm-only visibility, an anchor and related records", () => {
    for (const secret of load(REFERENCE).secrets) {
      expect(secret.visibility).toBe("gm-only");
      expect(secret.sourceRef?.anchor).toBeTruthy();
      expect(secret.relatedEntityIds?.length).toBeGreaterThan(0);
    }
  });
});

describe("spoiler audit negative tests", () => {
  const leaky = (mutate: (adventure: AdventureJsonV1) => void) => {
    const clone = structuredClone(load(REFERENCE));
    mutate(clone);
    return auditSpoilers(clone, HIDDEN_FACTS);
  };

  it("detects the leak when a visible record carries the hidden motive", () => {
    const leaks = leaky((adventure) => {
      const tobiah = adventure.actors.find(
        (a) => a.id === "actor-tobiah-reed",
      )!;
      tobiah.motivation =
        "Wants the mill to fail so the bailiff will sell it cheaply to him.";
    });
    expect(leaks.length).toBeGreaterThan(0);
  });

  it("detects the original cellar summary", () => {
    const leaks = leaky((adventure) => {
      adventure.locations.find((l) => l.id === "loc-miller-cellar")!.summary =
        "Cold stone cellar below the mill that floods once the sluice lever is pulled.";
    });
    expect(leaks.length).toBeGreaterThan(0);
  });

  it("detects the original Aldous summary", () => {
    const leaks = leaky((adventure) => {
      adventure.actors.find((a) => a.id === "actor-aldous-holt")!.summary =
        "The missing miller, found bound and gagged in the cellar.";
    });
    expect(leaks.length).toBeGreaterThan(0);
  });

  it("detects restored wheel room conditions", () => {
    const leaks = leaky((adventure) => {
      adventure.scenes.find(
        (s) => s.id === "ros-scene-3-wheel-room",
      )!.conditions = [
        "Once the lever is pulled, the wheel turns and the water in the cellar starts to rise. The party has about five turns to finish the cellar.",
      ];
    });
    expect(leaks.length).toBeGreaterThan(0);
  });

  it("detects the Wick encounter flipped back to player-visible", () => {
    const leaks = leaky((adventure) => {
      adventure.encounters.find(
        (e) => e.id === "enc-wheel-room-wick",
      )!.visibility = "player-visible";
    });
    expect(leaks.length).toBeGreaterThan(0);
  });
});
