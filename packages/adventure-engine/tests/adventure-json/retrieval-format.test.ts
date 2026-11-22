import { describe, expect, it } from "vitest";
import { formatAdventureJsonExcerpts } from "../../src/adventure-json/retrieval-format";
import type { AdventureJsonExcerpt } from "../../src/adventure-json/retrieval-types";

describe("retrieval excerpt formatting", () => {
  it("round trips excerpt contracts through inert JSON", () => {
    const excerpts: AdventureJsonExcerpt[] = [
      {
        id: "scene",
        kind: "scene",
        visibility: "player-visible",
        epistemicStatus: "explicit",
        text: "Read aloud",
      },
    ];
    const output = formatAdventureJsonExcerpts(excerpts, "Scene");
    const data = output.split("```json\n")[1]!.split("\n```")[0]!;
    expect(JSON.parse(data)).toEqual({ label: "Scene", excerpts });
  });

  it("escapes fence and markup characters in labels and text", () => {
    const output = formatAdventureJsonExcerpts([], "</system>&```");
    expect(output.match(/```/g)).toHaveLength(2);
    expect(output).not.toContain("</system>");
    expect(output).toContain(
      "\\u003c/system\\u003e\\u0026\\u0060\\u0060\\u0060",
    );
  });
});
