import { describe, expect, it } from "vitest";
import {
  AnswerConfigSchema,
  type AnswerBlock,
  type AnswerConfigInput,
} from "./schema";

const definition: AnswerConfigInput = {
  slug: "what-is-a-point-crawl",
  question: "What is a point crawl?",
  kind: "definition",
  category: "worldbuilding",
  publishedAt: "2026-10-08",
  shortAnswer: "A point crawl maps named places and the routes between them.",
  sections: [
    {
      kind: "prose",
      paragraphs: [
        "A ferry and a chapel are points; the road joining them is a link. A route can carry a travel time or hazard.",
      ],
    },
  ],
  relatedAnswers: ["point-crawl-vs-hex-crawl"],
  seo: {
    title: "What is a point crawl?",
    description: "Named places and routes explained.",
  },
};

describe("intent-fit Answer authoring contract", () => {
  it("accepts a concise definition with only a neighbouring Answer link", () => {
    const answer = AnswerConfigSchema.parse(definition);
    expect(answer.sections).toEqual(definition.sections);
    expect(answer.shortAnswer).toBe(definition.shortAnswer);
    expect(answer.codexConnection).toBeUndefined();
    expect(answer.relatedTools).toEqual([]);
    expect(answer.relatedTopics).toEqual([]);
    expect(answer.relatedForPages).toEqual([]);
    expect(answer.relatedAnswers).toEqual(["point-crawl-vs-hex-crawl"]);
  });

  const blocks: AnswerBlock[] = [
    {
      kind: "prose",
      paragraphs: ["Choose the route whose cost suits the party."],
    },
    {
      kind: "list",
      items: [{ term: "Road", text: "Fast but watched." }],
    },
    {
      kind: "example",
      heading: "The ferry or the fen path",
      paragraphs: [
        "The ferry takes half a day; the unwatched fen path takes two days.",
      ],
    },
    {
      kind: "checklist",
      heading: "Route notes",
      items: ["Record the travel time.", "Name the hazard."],
    },
    {
      kind: "table",
      headers: ["Route", "Cost"],
      rows: [["Ferry", "Half a day and a fare"]],
    },
  ];

  it.each(blocks)("retains the supported $kind block", (block) => {
    const answer = AnswerConfigSchema.parse({
      ...definition,
      sections: [block],
    });
    expect(answer.sections).toEqual([block]);
  });

  it("accepts a comparison table without a forced example or checklist", () => {
    const answer = AnswerConfigSchema.parse({
      ...definition,
      kind: "comparison",
      sections: [blocks[4]],
    });
    expect(answer.kind).toBe("comparison");
    expect(answer.sections.map((block) => block.kind)).toEqual(["table"]);
  });

  it.each([
    { sections: [] },
    { shortAnswer: "" },
    { sections: [{ kind: "prose", paragraphs: [] }] },
    { sections: [{ kind: "example", heading: "", paragraphs: ["A route."] }] },
    {
      sections: [
        { kind: "checklist", heading: "Route notes", items: ["One item"] },
      ],
    },
    {
      sections: [
        { kind: "table", headers: ["Route", "Cost"], rows: [["Ferry"]] },
      ],
    },
    {
      relatedTools: [
        {
          title: "Route tool",
          description: "Build routes.",
          href: "https://example.com",
        },
      ],
    },
    {
      codexConnection: {
        heading: "Route notes",
        paragraphs: ["Keep route notes."],
        linkText: "Read more",
        href: "https://example.com",
      },
    },
  ])(
    "rejects malformed content even when teaching blocks are optional: %j",
    (overrides) => {
      expect(
        AnswerConfigSchema.safeParse({ ...definition, ...overrides }).success,
      ).toBe(false);
    },
  );
});
