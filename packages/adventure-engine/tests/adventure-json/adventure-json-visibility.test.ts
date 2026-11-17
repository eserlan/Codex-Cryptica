import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AdventureJsonV1Schema,
  type AdventureJsonV1,
} from "../../src/adventure-json";

const REPO_ROOT = resolve(import.meta.dir, "../../../..");
const EXAMPLES = [
  "apps/web/static/schemas/adventure-json/examples/reference-one-shot.v1.json",
  "apps/web/static/schemas/adventure/examples/reference-one-shot.v1.json",
];

function load(relPath: string): AdventureJsonV1 {
  const raw = JSON.parse(readFileSync(resolve(REPO_ROOT, relPath), "utf8"));
  return AdventureJsonV1Schema.parse(raw);
}

/**
 * The conservative player-safe reading of v1: `visibility` covers the whole
 * record, so the safe projection keeps `player-visible` records verbatim and
 * drops everything `gm-only`, including every secret.
 */
function playerSafeText(adventure: AdventureJsonV1): string {
  const visible = [
    adventure.locations,
    adventure.actors,
    adventure.factions,
    adventure.scenes,
    adventure.encounters,
    adventure.clues,
    adventure.rumours,
    adventure.items,
  ]
    .flat()
    .filter((record) => record.visibility === "player-visible");
  return JSON.stringify(visible).toLowerCase();
}

const MOTIVE = "wants the mill to fail so the bailiff will sell it cheaply";

describe("spoiler-safe visibility (#4894)", () => {
  it.each(EXAMPLES)(
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

  it.each(EXAMPLES)(
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

  it("detects the leak when a visible record carries the hidden motive", () => {
    const adventure = load(EXAMPLES[0]!);
    const leaky = structuredClone(adventure);
    const tobiah = leaky.actors.find((a) => a.id === "actor-tobiah-reed")!;
    tobiah.role = "Antagonist";
    tobiah.motivation =
      "Wants the mill to fail so the bailiff will sell it cheaply to him.";

    expect(playerSafeText(leaky)).toContain(MOTIVE);
    expect(playerSafeText(leaky)).toContain("antagonist");
  });

  it("does not let record visibility alone reveal a gm-only record", () => {
    const adventure = load(EXAMPLES[0]!);
    const text = playerSafeText(adventure);

    for (const secret of adventure.secrets) {
      expect(text).not.toContain(secret.text.toLowerCase());
    }
  });
});
