import { describe, expect, it } from "vitest";
import { businessTypeAfterGenreChange } from "./business-form";

describe("businessTypeAfterGenreChange", () => {
  it("resets a type from the old genre to the new genre's first type", () => {
    expect(
      businessTypeAfterGenreChange(
        "Classic Fantasy",
        "Cyberpunk / Corporate",
        "Blacksmith",
      ),
    ).toBe("Ripper clinic");
  });

  it("keeps a type that the new genre also offers", () => {
    expect(
      businessTypeAfterGenreChange(
        "Classic Fantasy",
        "Dark Fantasy",
        "Apothecary",
      ),
    ).toBe("Apothecary");
  });

  it("keeps a custom type that is on no list", () => {
    expect(
      businessTypeAfterGenreChange(
        "Classic Fantasy",
        "Cyberpunk / Corporate",
        "Bee farm",
      ),
    ).toBe("Bee farm");
  });
});
