import { describe, expect, it } from "vitest";
import { generateRumourLocal, parseRumourResponse } from "./public-rumour";
import { RumourSelectionError, selectRumourForPlay } from "./rumour-play-selection";

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
        kind: "rumour", batchTitle: local.title, index, sourceRecordId: "saved-note-1",
      });
      expect(selected.playerVisible.rumour).toBeTruthy();
      expect(selected.playerVisible.lead).toBeTruthy();
      expect(selected.playerVisible.source).toBeTruthy();
      expect(selected.gmOnly.whatsActuallyHappening).toBeTruthy();
      const other = selectRumourForPlay(local, index === 6 ? 1 : index + 1);
      expect(selected.playerVisible.rumour).not.toEqual(other.playerVisible.rumour);
      expect(JSON.stringify(selected)).not.toContain(other.gmOnly.whatsActuallyHappening);
      expect(JSON.stringify(selected)).not.toContain(other.playerVisible.rumour);
    }
    expect(local.content).toContain("### Rumour 6");
  });

  it("protects GM truth classification from the player projection", () => {
    for (let index = 1; index <= 6; index += 1) {
      const { playerVisible, gmOnly } = selectRumourForPlay(local, index);
      expect(JSON.stringify(playerVisible)).not.toMatch(/essentially true|dangerous misconception|exaggeration/);
      expect(["essentially true", "dangerous misconception", "exaggeration"]).toContain(gmOnly.reality);
    }
  });

  it("works with AI-generated JSON-shaped output", () => {
    const result = parseRumourResponse(JSON.stringify({
      title: local.title, content: local.content, lore: local.lore,
    }));
    expect(selectRumourForPlay(result, 4).origin.index).toBe(4);
  });

  it.each([0, 7, -1, 1.5, NaN])("rejects invalid index %s", (index) => {
    expect(() => selectRumourForPlay(local, index)).toThrow(RumourSelectionError);
  });

  it("rejects duplicate, missing, reordered and unpaired headings", () => {
    for (const content of [
      local.content.replace("### Rumour 3", "### Rumour 9"),
      local.content.replace("### Rumour 3", "### Rumour 2"),
      local.content.replace("### Rumour 3", "### Rumour 7"),
    ]) {
      expect(() => selectRumourForPlay({ ...local, content }, 1))
        .toThrow(new RumourSelectionError("malformed-content"));
    }
    for (const lore of [
      local.lore.replace("### GM Notes — Rumour 2", "### GM Notes — Rumour 5"),
      local.lore.replace("### GM Notes — Rumour 2", "### GM Notes — Rumour 8"),
      local.lore.replace("- **Reality**:", "- **Rumour reality**:"),
      local.lore.replace("- **If Investigated**:", "- **If Investigated**:\n- **If Investigated**: duplicate"),
    ]) {
      expect(() => selectRumourForPlay({ ...local, lore }, 1)).toThrow(RumourSelectionError);
    }
  });

  it("rejects missing required player information", () => {
    const content = local.content.replace("- **Lead**:", "- **Something Else**:");
    expect(() => selectRumourForPlay({ ...local, content }, 3))
      .toThrow(new RumourSelectionError("malformed-content"));
  });

  it("supports CRLF batches", () => {
    expect(selectRumourForPlay({
      ...local, content: local.content.replace(/\n/g, "\r\n"),
      lore: local.lore.replace(/\n/g, "\r\n"),
    }, 2).index).toBe(2);
  });
});
