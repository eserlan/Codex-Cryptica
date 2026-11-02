import { describe, expect, it } from "vitest";
import { generateRumourLocal, parseRumourResponse } from "./public-rumour";
import {
  RumourSelectionError,
  selectRumourForPlay,
} from "./rumour-play-selection";

function seededRng(seed = 17): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("selectRumourForPlay", () => {
  const local = generateRumourLocal({}, seededRng());

  it("correctly pairs all six entries without including any other rumour", () => {
    for (let index = 1; index <= 6; index += 1) {
      const selected = selectRumourForPlay(local, index, "saved-note-1");
      expect(selected.origin).toEqual({
        kind: "rumour",
        batchTitle: local.title,
        index,
        sourceRecordId: "saved-note-1",
      });
      expect(selected.playerVisible.rumour).toBeTruthy();
      expect(selected.playerVisible.lead).toBeTruthy();
      expect(selected.playerVisible.source).toBeTruthy();
      expect(selected.gmOnly.whatsActuallyHappening).toBeTruthy();
      const other = selectRumourForPlay(local, index === 6 ? 1 : index + 1);
      expect(selected.playerVisible.rumour).not.toEqual(
        other.playerVisible.rumour,
      );
      expect(JSON.stringify(selected)).not.toContain(
        other.gmOnly.whatsActuallyHappening,
      );
      expect(JSON.stringify(selected)).not.toContain(
        other.playerVisible.rumour,
      );
    }
    expect(local.content).toContain("### Rumour 6");
  });

  it("protects GM truth classification from the player projection", () => {
    for (let index = 1; index <= 6; index += 1) {
      const { playerVisible, gmOnly } = selectRumourForPlay(local, index);
      expect(JSON.stringify(playerVisible)).not.toMatch(
        /essentially true|dangerous misconception|exaggeration/,
      );
      expect([
        "essentially true",
        "dangerous misconception",
        "exaggeration",
      ]).toContain(gmOnly.reality);
    }
  });

  it("works with AI-generated JSON-shaped output", () => {
    const result = parseRumourResponse(
      JSON.stringify({
        title: local.title,
        content: local.content,
        lore: local.lore,
      }),
    );
    expect(selectRumourForPlay(result, 4).origin.index).toBe(4);
  });

  it.each([0, 7, -1, 1.5, NaN])("rejects invalid index %s", (index) => {
    expect(() => selectRumourForPlay(local, index)).toThrow(
      RumourSelectionError,
    );
  });

  it("rejects duplicate, missing, reordered and unpaired headings", () => {
    for (const content of [
      local.content.replace("### Rumour 3", "### Rumour 9"),
      local.content.replace("### Rumour 3", "### Rumour 2"),
      local.content.replace("### Rumour 3", "### Rumour 7"),
    ]) {
      expect(() => selectRumourForPlay({ ...local, content }, 1)).toThrow(
        new RumourSelectionError("malformed-content"),
      );
    }
    for (const lore of [
      local.lore.replace("### GM Notes — Rumour 2", "### GM Notes — Rumour 5"),
      local.lore.replace("### GM Notes — Rumour 2", "### GM Notes — Rumour 8"),
      local.lore.replace("- **Reality**:", "- **Rumour reality**:"),
      local.lore.replace(
        "- **If Investigated**:",
        "- **If Investigated**:\n- **If Investigated**: duplicate",
      ),
    ]) {
      expect(() => selectRumourForPlay({ ...local, lore }, 1)).toThrow(
        RumourSelectionError,
      );
    }
  });

  it("rejects missing required player information", () => {
    const content = local.content.replace(
      "### Rumour 3\n",
      "### Rumour 3\n- **Something Else**: invalid extra field\n",
    );
    expect(() => selectRumourForPlay({ ...local, content }, 3)).toThrow(
      new RumourSelectionError("malformed-content"),
    );
  });

  it("supports CRLF batches", () => {
    expect(
      selectRumourForPlay(
        {
          ...local,
          content: local.content.replace(/\n/g, "\r\n"),
          lore: local.lore.replace(/\n/g, "\r\n"),
        },
        2,
      ).index,
    ).toBe(2);
  });

  /** The raw field value under a numbered heading, read independently. */
  function fieldUnder(
    markdown: string,
    heading: string,
    label: string,
  ): string {
    const start = markdown.indexOf(heading + "\n");
    expect(start).toBeGreaterThanOrEqual(0);
    const rest = markdown.slice(start + heading.length + 1);
    const block = rest.split(/\n### /)[0]!;
    const line = block
      .split("\n")
      .find((row) => row.startsWith("- **" + label + "**:"));
    return line!.replace("- **" + label + "**:", "").trim();
  }

  it("pairs each player entry with the GM note under the same number", () => {
    for (let index = 1; index <= 6; index += 1) {
      const selected = selectRumourForPlay(local, index);
      const player = "### Rumour " + index;
      const gm = "### GM Notes — Rumour " + index;
      expect(selected.playerVisible).toEqual({
        rumour: fieldUnder(local.content, player, "Rumour"),
        lead: fieldUnder(local.content, player, "Lead"),
        source: fieldUnder(local.content, player, "Source"),
      });
      expect(selected.gmOnly).toEqual({
        reality: fieldUnder(local.lore, gm, "Reality"),
        whatsActuallyHappening: fieldUnder(
          local.lore,
          gm,
          "What's Actually Happening",
        ),
        ifInvestigated: fieldUnder(local.lore, gm, "If Investigated"),
      });
    }
  });

  function swapLines(markdown: string, heading: string, a: string, b: string) {
    const start = markdown.indexOf(heading + "\n");
    const end = markdown.indexOf("\n### ", start + 1);
    const block = markdown.slice(start, end === -1 ? undefined : end);
    const lines = block.split("\n");
    const ia = lines.findIndex((line) => line.startsWith("- **" + a + "**:"));
    const ib = lines.findIndex((line) => line.startsWith("- **" + b + "**:"));
    [lines[ia], lines[ib]] = [lines[ib]!, lines[ia]!];
    return markdown.replace(block, lines.join("\n"));
  }

  it("rejects fields that appear out of order on either side", () => {
    const content = swapLines(local.content, "### Rumour 1", "Rumour", "Lead");
    expect(() => selectRumourForPlay({ ...local, content }, 1)).toThrow(
      new RumourSelectionError("malformed-content"),
    );
    const lore = swapLines(
      local.lore,
      "### GM Notes — Rumour 1",
      "Reality",
      "What's Actually Happening",
    );
    expect(() => selectRumourForPlay({ ...local, lore }, 1)).toThrow(
      new RumourSelectionError("malformed-lore"),
    );
  });

  it("rejects a batch whose unselected entry is malformed", () => {
    const missingLead = local.content.replace(
      /(### Rumour 3\n(?:.*\n)*?)- \*\*Lead\*\*:[^\n]*\n/,
      "$1",
    );
    expect(missingLead).not.toBe(local.content);
    expect(() =>
      selectRumourForPlay({ ...local, content: missingLead }, 1),
    ).toThrow(new RumourSelectionError("malformed-content"));

    const badReality = local.lore.replace(
      /(### GM Notes — Rumour 5\n- \*\*Reality\*\*:)[^\n]*/,
      "$1 probably",
    );
    expect(badReality).not.toBe(local.lore);
    expect(() =>
      selectRumourForPlay({ ...local, lore: badReality }, 1),
    ).toThrow(new RumourSelectionError("malformed-lore"));
  });
});
