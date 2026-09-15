import { describe, expect, it } from "vitest";
import type { Entity } from "schema";
import {
  MAX_PARTICIPANT_LORE_CHARS,
  buildParticipantLore,
} from "./faction-turn-ai-context";

function entity(over: Partial<Entity> = {}): Entity {
  return {
    id: "entity-a",
    type: "faction",
    title: "Black Eagles",
    labels: [],
    aliases: [],
    connections: [],
    content: "",
    status: "active",
    ...over,
  } as Entity;
}

describe("buildParticipantLore", () => {
  it("returns aliases, bounded world text, and named outgoing connections", () => {
    const participant = entity({
      aliases: ["The Eagles", "Northern talons"],
      content: "A mercenary company.",
      lore: "They once ruled the northern lakes.",
      connections: [
        { target: "lakeguard", type: "ally", strength: 8 },
        { target: "missing", type: "rival", strength: 3 },
      ],
    });

    expect(
      buildParticipantLore(participant, [
        participant,
        entity({ id: "lakeguard", title: "Lakeguard" }),
      ]),
    ).toEqual({
      aliases: ["The Eagles", "Northern talons"],
      lore: "A mercenary company.\n\nThey once ruled the northern lakes.",
      connections: [{ entityTitle: "Lakeguard", type: "ally", strength: 8 }],
    });
  });

  it("does not exceed the per-participant lore limit", () => {
    const lore = buildParticipantLore(
      entity({ lore: "x".repeat(MAX_PARTICIPANT_LORE_CHARS + 50) }),
      [],
    );

    expect(lore.lore).toHaveLength(MAX_PARTICIPANT_LORE_CHARS);
  });
});
