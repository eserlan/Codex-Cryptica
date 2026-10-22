import { describe, expect, it } from "vitest";
import {
  systemFor,
  foundationMessage,
  sectorsMessage,
  factionsMessage,
  reviewMessage,
  DUNGEON_REVIEW_MARKER,
} from "./dungeon-stage-prompts";
import {
  OPTIONS,
  setup,
  foundation,
  sectors,
} from "./dungeon-staged.test-fixtures";
import type { DungeonJson } from "./public-dungeon";

describe("dungeon stage prompts", () => {
  it("keeps context, instructions, fixed ids and stock types in the right stages", () => {
    const resolved = setup();
    const options = {
      ...OPTIONS,
      campaignContext: "The Brass Guild built the furnace.",
      instruction: "Keep it flooded.",
    };
    const facts = foundation(resolved);
    const geography = sectors(resolved);
    const messages = [
      foundationMessage(options, resolved, "VAULT\n"),
      sectorsMessage(options, resolved, facts, "VAULT\n"),
      factionsMessage(options, resolved, { ...facts, ...geography }, "VAULT\n"),
    ];
    for (const [i, message] of messages.entries()) {
      expect(message).toContain(`Stage ${i + 1} of 3`);
      expect(message).toContain("VAULT\nSetting Context:");
      expect(message).toContain(options.campaignContext);
      expect(message).toContain("Special Instructions: Keep it flooded.");
    }
    expect(systemFor(resolved, "foundation")).toContain(
      `${resolved.genre} delve`,
    );
    expect(messages[0]).toContain(`EXACTLY ${resolved.sectors.length} entries`);
    expect(messages[1]).toContain(
      `${resolved.sectors[0].id}: ${resolved.sectors[0].stockType}`,
    );
    expect(messages[2]).toContain("sector-1 (Hollow 1) ↔ sector-2 (Hollow 2)");
    expect(messages[2]).toContain(`Faction 1: ${resolved.factions[0].drive}`);
  });

  it("handles absent optional context, names and plan values without undefined text", () => {
    const resolved = setup();
    resolved.genre = "Unknown genre";
    resolved.sectors[0].stockType = undefined;
    resolved.factions = [];
    expect(sectorsMessage({}, resolved, {})).toContain("sector-1: Lore");
    const message = factionsMessage({}, resolved, {});
    expect(message).toContain('"drive": ""');
    expect(message).not.toContain("undefined");
    expect(message).not.toContain("Special Instructions:");
    expect(message).toContain("sector-1 ↔ sector-2");
    expect(foundationMessage({}, resolved)).not.toContain("undefined");
  });

  it("marks the review and includes only the fixed layout and assembled facts", () => {
    const resolved = setup();
    const dungeon = {
      ...foundation(resolved),
      ...sectors(resolved),
    } as unknown as DungeonJson;
    const message = reviewMessage(dungeon, resolved, "VAULT\n");
    expect(message.startsWith(`VAULT\n${DUNGEON_REVIEW_MARKER}`)).toBe(true);
    expect(message).toContain(JSON.stringify(dungeon, null, 2));
    expect(message).toContain("sector-1 (Hollow 1) ↔ sector-2 (Hollow 2)");
    expect(
      reviewMessage(dungeon, resolved).startsWith(DUNGEON_REVIEW_MARKER),
    ).toBe(true);
  });
});
