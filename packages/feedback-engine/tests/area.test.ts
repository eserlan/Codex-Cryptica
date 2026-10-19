import { describe, expect, test } from "bun:test";
import { FEEDBACK_AREAS, feedbackAreaFor } from "../src/area";

describe("FEEDBACK_AREAS", () => {
  test("contains the places only reports come from", () => {
    for (const area of [
      "tabletop",
      "help",
      "public-generators",
      "public-tools",
      "public-site",
      "other",
    ]) {
      expect(FEEDBACK_AREAS).toContain(area as never);
    }
  });
});

describe("feedbackAreaFor", () => {
  test("the tabletop when the map is open with VTT on", () => {
    expect(
      feedbackAreaFor({ pathname: "/map", vttActive: true, surface: "app" }),
    ).toBe("tabletop");
  });

  test("the map when VTT is off", () => {
    expect(
      feedbackAreaFor({ pathname: "/map", vttActive: false, surface: "app" }),
    ).toBe("map");
  });

  test("public generator and tool pages", () => {
    expect(
      feedbackAreaFor({ pathname: "/generators/npc", surface: "public" }),
    ).toBe("public-generators");
    expect(
      feedbackAreaFor({ pathname: "/tools/initiative", surface: "public" }),
    ).toBe("public-tools");
  });

  test("other public pages", () => {
    expect(feedbackAreaFor({ pathname: "/", surface: "public" })).toBe(
      "public-site",
    );
    expect(
      feedbackAreaFor({ pathname: "/blog/some-post", surface: "public" }),
    ).toBe("public-site");
  });

  test("an explicit area wins when it is valid", () => {
    expect(
      feedbackAreaFor({
        pathname: "/map",
        surface: "app",
        helpArea: "generators",
      }),
    ).toBe("generators");
  });

  test("an unknown area is ignored in favour of the page", () => {
    expect(
      feedbackAreaFor({
        pathname: "/map",
        surface: "app",
        helpArea: "made-up",
      }),
    ).toBe("map");
  });

  test("unknown in-app paths give other, never a path fragment", () => {
    const area = feedbackAreaFor({
      pathname: "/vault/secret-id?q=x#frag",
      surface: "app",
    });
    expect(area).toBe("other");
    expect(area).not.toContain("secret");
  });
});
