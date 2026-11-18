import { describe, expect, it } from "vitest";
import {
  buildCreatureEntryText,
  buildCreatureProposals,
  type AdventureJsonV1,
} from "../src";

const actor = (
  id: string,
  name: string,
  extra: Record<string, unknown> = {},
) => ({
  id,
  name,
  summary: `${name} summary`,
  visibility: "player-visible",
  epistemicStatus: "source-stated",
  ...extra,
});

const encounter = (
  id: string,
  actorIds: string[],
  extra: Record<string, unknown> = {},
) => ({
  id,
  description: "",
  actorIds,
  alternativeSolutions: [],
  visibility: "player-visible",
  epistemicStatus: "source-stated",
  ...extra,
});

const pkg = {
  id: "gnoll-lair",
  version: "1.0.0",
  source: {
    title: "The Gnoll Lair",
    authors: ["A. Writer"],
    license: "CC BY 4.0",
  },
  actors: [
    actor("a-gnoll-1", "Gnoll", {
      description: "Hyena-headed raider.",
      role: "Raider",
      sourceRef: { page: 4 },
    }),
    actor("a-gnoll-2", "  gnoll ", {
      description: "Hyena-headed raider.",
      motivation: "Hungry",
      sourceRef: { page: 2, pageEnd: 3 },
    }),
    actor("a-chief", "Gnoll Chieftain", { disposition: "Cruel" }),
    actor("a-wolf", "Guard Wolf"),
    actor("a-spider", "Treasure-hoard Spider", { visibility: "gm-only" }),
    actor("a-unused", "Lonely Hermit"),
  ],
  encounters: [
    encounter("e-gate", ["a-gnoll-1", "a-wolf", "a-missing"], {
      title: "Gate",
      sourceRef: { page: 4 },
    }),
    encounter("e-den", ["a-gnoll-2", "a-chief"], {
      sourceRef: { page: 6, pageEnd: 7 },
    }),
    encounter("e-hoard", ["a-spider", "a-chief"], {
      title: "Hoard Web",
      visibility: "gm-only",
      sourceRef: { page: 9 },
    }),
  ],
} as unknown as AdventureJsonV1;

describe("buildCreatureProposals", () => {
  const proposals = buildCreatureProposals(pkg);

  it("merges same-name actors and keeps variants apart", () => {
    expect(proposals.map((p) => p.name)).toEqual([
      "Gnoll",
      "Gnoll Chieftain",
      "Guard Wolf",
      "Treasure-hoard Spider",
    ]);
    expect(proposals[0]!.actorIds).toEqual(["a-gnoll-1", "a-gnoll-2"]);
    expect(proposals.flatMap((p) => p.actorIds)).not.toContain("a-unused");
    expect(proposals.flatMap((p) => p.actorIds)).not.toContain("a-missing");
  });

  it("carries pages, encounters and verbatim text", () => {
    const gnoll = proposals[0]!;
    expect(gnoll.pages).toEqual([2, 3, 4]);
    expect(gnoll.description).toEqual(["Hyena-headed raider."]);
    expect(gnoll.summary).toEqual(["Gnoll summary", "  gnoll  summary"]);
    expect(gnoll.role).toEqual(["Raider"]);
    expect(gnoll.motivation).toEqual(["Hungry"]);
    expect(gnoll.encounters).toEqual([
      { id: "e-gate", title: "Gate", pages: [4], visibility: "player-visible" },
      {
        id: "e-den",
        title: "Untitled encounter",
        pages: [6, 7],
        visibility: "player-visible",
      },
    ]);
  });

  it("conceals gm-only actors and encounters only", () => {
    expect(proposals[3]!.concealed).toBe(true);
    expect(proposals[1]!.concealed).toBe(true);
    expect(proposals[2]!.concealed).toBe(false);
    expect(proposals[0]!.concealed).toBe(false);
  });
});

describe("buildCreatureEntryText", () => {
  const chief = buildCreatureProposals(pkg)[1]!;

  it("keeps gm-only encounters out of content", () => {
    const { content, lore } = buildCreatureEntryText(
      chief,
      pkg.source,
      "J. Artist",
    );
    expect(content).not.toContain("Hoard Web");
    expect(content).toContain("Untitled encounter (pp. 6–7)");
    expect(content).toContain("**Disposition:** Cruel");
    expect(content).toContain("The Gnoll Lair");
    expect(content).toContain("CC BY 4.0");
    expect(content).toContain("Art: J. Artist");
    expect(lore).toContain("Hoard Web (p. 9)");
  });

  it("omits lore and art credit when there is nothing to add", () => {
    const wolf = buildCreatureProposals(pkg)[2]!;
    const text = buildCreatureEntryText(wolf, pkg.source);
    expect(text.lore).toBeUndefined();
    expect(text.content).not.toContain("Art:");
  });
});

describe("entry text safety", () => {
  const hostile = {
    ...pkg,
    source: { title: "![](https://t.example/s.gif)", license: "<b>x</b>" },
    actors: [
      actor("a-bad", "Gnoll", {
        summary: "![](https://t.example/a.gif)",
        description: "<img src=https://t.example/b.gif>\n# Heading",
        role: "[x](https://t.example/c)",
      }),
    ],
    encounters: [
      encounter("e1", ["a-bad"], { title: "![](https://t.example/e.gif)" }),
    ],
  } as unknown as AdventureJsonV1;

  it("never leaves an image, tag, link or heading token unescaped", () => {
    const proposal = buildCreatureProposals(hostile)[0]!;
    const { content } = buildCreatureEntryText(
      proposal,
      hostile.source,
      "![](https://t.example/credit.gif)",
    );
    expect(content).not.toMatch(/(^|[^\\])!\[/);
    expect(content).not.toMatch(/(^|[^\\])</);
    expect(content).not.toMatch(/(^|[^\\])\]\(/);
    expect(content).not.toMatch(/^\s*#/m);
  });

  it("keeps ordinary text readable", () => {
    const text = buildCreatureEntryText(
      buildCreatureProposals(pkg)[2]!,
      pkg.source,
    );
    expect(text.content).toContain("Guard Wolf summary");
  });
});
