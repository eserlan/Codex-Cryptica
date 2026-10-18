import { describe, expect, it } from "vitest";
import { isKnownAnswerSlug } from "../answer-slugs";

describe("answer slug allowlist", () => {
  it("accepts the newly published squad answer for community feedback", () => {
    expect(
      isKnownAnswerSlug(
        "how-do-i-combine-multiple-enemies-into-one-squad-in-an-rpg",
      ),
    ).toBe(true);
    expect(
      isKnownAnswerSlug("which-tabletop-rpgs-have-squad-and-mass-battle-rules"),
    ).toBe(true);
  });

  it("rejects unknown answer slugs", () => {
    expect(isKnownAnswerSlug("not-a-published-answer")).toBe(false);
  });
});
