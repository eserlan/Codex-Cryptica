import { describe, expect, it } from "vitest";
import { parseGenericGeneratorOutput } from "./campaign-generator-output-parsing";

describe("parseGenericGeneratorOutput", () => {
  it("maps complete generic output and filters malformed optional collections", () => {
    const output = parseGenericGeneratorOutput(
      JSON.stringify({
        title: "The Lantern Feast",
        summary: "A winter observance.",
        lore: "The town lights its old bridge.",
        content: "A full account.",
        labels: ["festival"],
        observances: [
          {
            name: "First Flame",
            type: "rite",
            when: "dusk",
            observers: "all",
            traditions: "lanterns",
            tension: "old feud",
          },
        ],
        bodies: [
          { name: "Vey", type: "star" },
          { name: 3, type: "planet" },
        ],
        starType: "red dwarf",
        connections: [{ targetTitle: "The Bridge" }],
      }),
      "star-system",
    );

    expect(output).toMatchObject({
      title: "The Lantern Feast",
      summary: "A winter observance.",
      lore: "The town lights its old bridge.",
      content: "A full account.",
      labels: ["festival"],
      observances: [
        {
          name: "First Flame",
          type: "rite",
          when: "dusk",
          observers: "all",
          traditions: "lanterns",
          tension: "old feud",
        },
      ],
      bodies: [{ name: "Vey", type: "star" }],
      starType: "red dwarf",
    });
    expect(output?.connections).toEqual([
      { targetTitle: "The Bridge", relationship: "related" },
    ]);
  });

  it("rejects invalid JSON, incomplete output, and incomplete society dossiers", () => {
    expect(parseGenericGeneratorOutput("not-json", "npc")).toBeNull();
    expect(
      parseGenericGeneratorOutput('{"title":"Only a title"}', "npc"),
    ).toBeNull();
    expect(
      parseGenericGeneratorOutput(
        JSON.stringify({
          title: "Society",
          summary: "A note",
          lore: " ",
          content: "",
        }),
        "secret-society",
      ),
    ).toBeNull();
  });
});
