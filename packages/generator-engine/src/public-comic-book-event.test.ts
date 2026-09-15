import { describe, expect, it } from "vitest";
import {
  buildComicBookEventPrompt,
  generateComicBookEventLocal,
  parseComicBookEventResponse,
  comicBookEventConfig,
} from "./public-comic-book-event";
import { NAME_BAN_PROMPT } from "./public-npc";
import { SUPERHERO_POWER_SCALES } from "./superhero-power-scale";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("comicBookEventConfig", () => {
  it("lists all ten event types plus Random", () => {
    expect(comicBookEventConfig.eventTypes).toContain("Alien Invasion");
    expect(comicBookEventConfig.eventTypes).toContain("Reality Fracture");
    expect(comicBookEventConfig.eventTypes).toContain(
      "Registration / Political Crisis",
    );
    expect(comicBookEventConfig.eventTypes).toContain("Hero Civil War");
    expect(comicBookEventConfig.eventTypes).toContain("Cosmic Threat");
    expect(comicBookEventConfig.eventTypes).toContain("Mass Disappearance");
    expect(comicBookEventConfig.eventTypes).toContain("Timeline Rewrite");
    expect(comicBookEventConfig.eventTypes).toContain("Super-Prison Breakout");
    expect(comicBookEventConfig.eventTypes).toContain("Secret Invasion");
    expect(comicBookEventConfig.eventTypes).toContain(
      "Fallen / Corrupted Hero",
    );
    // 10 event types + "Random".
    expect(comicBookEventConfig.eventTypes.length).toBe(11);
  });

  it("restricts the scale pool to National-through-Multiversal, excluding Street/City", () => {
    expect(comicBookEventConfig.scales).not.toContain("Street");
    expect(comicBookEventConfig.scales).not.toContain("City");
    expect(comicBookEventConfig.scales).toEqual([
      "National",
      "Global",
      "Cosmic",
      "Multiversal",
    ]);
    for (const scale of comicBookEventConfig.scales) {
      expect(SUPERHERO_POWER_SCALES).toContain(scale);
    }
  });
});

describe("generateComicBookEventLocal", () => {
  it("returns the event structure with separated premise, unfolding, and consequences", () => {
    const out = generateComicBookEventLocal(
      { eventType: "Alien Invasion" },
      seededRng(5),
    );
    expect(out.type).toBe("event");
    expect(out.content).toContain("### The Event");
    expect(out.content).toContain("### Public Response");
    expect(out.content).toContain("### How It Unfolds");
    expect(out.content).toContain("**Stage 1:");
    expect(out.lore).toContain("### True Cause");
    expect(out.lore).toContain("### Lasting Consequences");
    expect(out.lore).toContain("### Campaign Hooks");
    expect(out.labels).toContain("comic-book-event");
  });

  it("honours an explicit event type and weaves in a concrete location", () => {
    const out = generateComicBookEventLocal(
      { eventType: "Reality Fracture" },
      seededRng(2),
    );
    expect(out.title).toContain("Reality Fracture");
    expect(out.lore).toContain("street grid");
    expect(out.lore).not.toContain("{{LOCATION}}");
    expect(out.content).not.toContain("{{LOCATION}}");
  });

  it("resolves the Random event type to a concrete one", () => {
    const out = generateComicBookEventLocal(
      { eventType: "Random" },
      seededRng(3),
    );
    expect(out.title).not.toContain("Random");
  });

  it("only ever picks from the restricted upper power scales", () => {
    for (let seed = 0; seed < 20; seed++) {
      const out = generateComicBookEventLocal({}, seededRng(seed));
      const match = out.content.match(/At (\w+) scale/);
      expect(match?.[1]).toBeDefined();
      expect(["National", "Global", "Cosmic", "Multiversal"]).toContain(
        match?.[1],
      );
    }
  });

  it("produces concrete, non-vague lasting consequences for every event type", () => {
    for (const eventType of comicBookEventConfig.eventTypes) {
      if (eventType === "Random") continue;
      const out = generateComicBookEventLocal({ eventType }, seededRng(7));
      expect(out.lore).toContain("### Lasting Consequences");
      expect(out.lore.toLowerCase()).not.toContain("the city was saved");
      expect(out.lore.toLowerCase()).not.toContain("life returned to normal");
      expect(out.lore.toLowerCase()).not.toContain("the heroes prevailed");
    }
  });

  it("is deterministic for a fixed seed", () => {
    expect(generateComicBookEventLocal({}, seededRng(9))).toEqual(
      generateComicBookEventLocal({}, seededRng(9)),
    );
  });
});

describe("buildComicBookEventPrompt", () => {
  it("embeds options, the ban prompt, and session context", () => {
    const { userMessage, resolved } = buildComicBookEventPrompt(
      {
        eventType: "Cosmic Threat",
        scale: "Cosmic",
        tone: "Grim",
        campaignContext: "a fractured pantheon of retired heroes",
      },
      "- Existing: The Vanguard (faction)",
      seededRng(4),
    );
    expect(userMessage).toContain("- Event Type: Cosmic Threat");
    expect(userMessage).toContain("- Scale: Cosmic");
    expect(userMessage).toContain("- Tone: Grim");
    expect(userMessage).toContain("a fractured pantheon of retired heroes");
    expect(userMessage).toContain(NAME_BAN_PROMPT);
    expect(userMessage).toContain("The Vanguard");
    expect(resolved.scale).toBe("Cosmic");
  });

  it("weaves the Superhero Power Scale hint into the Scale line", () => {
    const { userMessage } = buildComicBookEventPrompt(
      { scale: "Global" },
      "",
      seededRng(4),
    );
    expect(userMessage).toContain("- Scale: Global — Planetary in reach.");
  });

  it("asks for the three structurally separated sections by field/heading name", () => {
    const { userMessage } = buildComicBookEventPrompt({}, "", seededRng(1));
    expect(userMessage).toContain("'### The Event' (the premise");
    expect(userMessage).toContain("'### How It Unfolds'");
    expect(userMessage).toContain("'### Lasting Consequences'");
    expect(userMessage).toContain("'### True Cause'");
  });

  it("includes the field-specific consequences guardrail naming the anti-pattern", () => {
    const { userMessage } = buildComicBookEventPrompt({}, "", seededRng(1));
    expect(userMessage).toContain(
      "Every item under 'Lasting Consequences' must be a concrete, specific, permanent change",
    );
    expect(userMessage).toContain(
      'Do not write a vague resolution such as "the city was saved", "life returned to normal", or "the heroes prevailed"',
    );
  });

  it("includes the field-specific consistency-pass guardrail", () => {
    const { userMessage } = buildComicBookEventPrompt({}, "", seededRng(1));
    expect(userMessage).toContain(
      "the declared Scale must be reflected consistently across Public Response, How It Unfolds, and Lasting Consequences",
    );
    expect(userMessage).toContain(
      "each Lasting Consequence must be concrete and campaign-persistent, never a restatement that things returned to normal",
    );
    expect(userMessage).toContain(
      "the True Cause must be consistent with, not contradict, what is shown in How It Unfolds",
    );
    expect(userMessage).toContain(
      "every Campaign Hook must connect directly to an unresolved thread from True Cause or Lasting Consequences",
    );
  });

  it("warns against imitating existing comic-book crossover IP", () => {
    const { userMessage } = buildComicBookEventPrompt({}, "", seededRng(1));
    expect(userMessage).toContain(
      "do not imitate or rename any existing published comic-book crossover event, storyline, or title",
    );
  });

  it("resolves the Random event type to a concrete one", () => {
    const { resolved } = buildComicBookEventPrompt(
      { eventType: "Random" },
      "",
      seededRng(3),
    );
    expect(resolved.eventType).not.toBe("Random");
    expect(comicBookEventConfig.eventTypes).toContain(resolved.eventType);
  });
});

describe("parseComicBookEventResponse", () => {
  const { resolved } = buildComicBookEventPrompt({}, "", seededRng(3));

  it("parses fenced JSON and keeps the rich body", () => {
    const json =
      '```json\n{"title":"Zero Hour: Secret Invasion","content":"### The Event\\ny","lore":"### True Cause\\nz","labels":["comic-book-event"]}\n```';
    const out = parseComicBookEventResponse(json, resolved);
    expect(out.title).toBe("Zero Hour: Secret Invasion");
    expect(out.content).toContain("The Event");
    expect(out.lore).toContain("True Cause");
    expect(out.type).toBe("event");
  });

  it("falls back to the resolved name and throws on bad JSON", () => {
    const out = parseComicBookEventResponse(
      '{"content":"x","lore":"y"}',
      resolved,
    );
    expect(out.title).toBe(resolved.eventName);
    expect(() => parseComicBookEventResponse("nope", resolved)).toThrow();
  });
});
