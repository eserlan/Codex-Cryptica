import { describe, expect, it } from "vitest";
import { describeVisiblePlace, artworkGenreForTheme } from "./artwork-resolver";
describe("visible artwork subject", () => {
  it("derives bounded catalogue cues from a visible place", () => {
    expect(
      describeVisiblePlace(
        { id: "p1", name: "Forest road", sourceRecordId: "r1" },
        "fantasy",
      ),
    ).toEqual({
      subject: { kind: "entity", id: "r1" },
      type: "location",
      genre: "fantasy",
      primaryCues: ["forest", "road"],
    });
  });
  it("does not invent a subject or use unknown theme defaults", () => {
    expect(describeVisiblePlace(undefined, "fantasy")).toBeNull();
    expect(artworkGenreForTheme("workspace")).toBeUndefined();
    expect(artworkGenreForTheme("unknown")).toBeUndefined();
    expect(artworkGenreForTheme("scifi_light")).toBe("science-fiction");
  });
});
