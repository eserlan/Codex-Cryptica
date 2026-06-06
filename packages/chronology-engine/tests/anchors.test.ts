import { describe, expect, it } from "vitest";
import {
  deriveProjectedAnchors,
  removeAnchor,
  upsertAnchor,
  validateRange,
} from "../src";

describe("anchor helpers", () => {
  it("projects primary fields and additional anchors independently", () => {
    const projected = deriveProjectedAnchors({
      id: "char-1",
      type: "character",
      date: { year: 580 },
      temporalAnchors: [
        { id: "a1", type: "majorAppearance", date: { year: 621 } },
      ],
    });

    expect(projected.map((anchor) => anchor.anchorId)).toEqual([
      "primary",
      "a1",
    ]);
    expect(projected[0].primary).toBe(true);
    expect(projected[1].primary).toBe(false);
  });

  it("validates non-inverted ranges", () => {
    expect(validateRange({ year: 600 }, { year: 500 }).valid).toBe(false);
    expect(validateRange({ year: 500 }, { year: 600 }).valid).toBe(true);
  });

  it("upserts and removes a single anchor without mutating siblings", () => {
    const anchors = [
      { id: "a1", type: "born", date: { year: 580 } },
      { id: "a2", type: "appearance", date: { year: 621 } },
    ];

    const updated = upsertAnchor(anchors, {
      id: "a2",
      type: "appearance",
      date: { year: 622 },
    });

    expect(updated).toHaveLength(2);
    expect(updated[0].date?.year).toBe(580);
    expect(updated[1].date?.year).toBe(622);
    expect(removeAnchor(updated, "a1").map((anchor) => anchor.id)).toEqual([
      "a2",
    ]);
  });
});
