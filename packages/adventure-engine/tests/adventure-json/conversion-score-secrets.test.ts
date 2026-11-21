import { describe, expect, it } from "vitest";
import { scoreSecrets } from "../../src/adventure-json/conversion-score-secrets";
import { makeDocument, makeKey } from "./conversion-score-fixtures";

const secret = {
  id: "theft",
  text: "The bailiff plans to steal the mill.",
  gmOnly: true,
  sourceId: "mill",
};
const key = () =>
  makeKey({ secrets: [secret, { ...secret, id: "public", gmOnly: false }] });

describe("conversion secret scoring", () => {
  it("accepts a GM secret matched by ID or text and ignores non-GM key facts", () => {
    expect(
      scoreSecrets(makeDocument({ secrets: [{ id: secret.id }] }), key())
        .status,
    ).toBe("pass");
    expect(
      scoreSecrets(
        makeDocument({ secrets: [{ id: "renamed", text: secret.text }] }),
        key(),
      ).status,
    ).toBe("pass");
  });

  it("reports missing secrets before their first player-visible leak", () => {
    const doc = makeDocument({
      title: secret.text,
      scenes: [{ id: "room", visibility: "player-visible", body: secret.text }],
    });
    expect(scoreSecrets(doc, key())).toEqual({
      status: "fail",
      details: ["missing secret theft", "leaked secret theft in title"],
    });
  });

  it("finds nested leaks while excluding GM-only records", () => {
    const doc = makeDocument({
      secrets: [{ id: secret.id, text: secret.text }],
      scenes: [
        {
          id: "room",
          visibility: "gm-only",
          branches: [{ description: secret.text }],
        },
      ],
    });
    expect(scoreSecrets(doc, key()).status).toBe("pass");
    doc.scenes[0]!["visibility"] = "player-visible";
    expect(scoreSecrets(doc, key()).details).toEqual([
      "leaked secret theft in scenes room.branches[0].description",
    ]);
  });
});
