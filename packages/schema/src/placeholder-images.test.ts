import { describe, it, expect } from "vitest";
import { isPlaceholderImageUrl } from "./placeholder-images";

describe("isPlaceholderImageUrl", () => {
  it("recognises Scabard's stock category icons", () => {
    expect(
      isPlaceholderImageUrl(
        "https://www.scabard.com/images/cross_categories/event.png",
      ),
    ).toBe(true);
    expect(
      isPlaceholderImageUrl(
        " https://scabard.com/images/cross_categories/note.png?v=2 ",
      ),
    ).toBe(true);
  });

  it("keeps real pictures, including other Scabard images (negative)", () => {
    expect(
      isPlaceholderImageUrl(
        "https://www.scabard.com/images/rf_images/event/30118617_s_1.jpg",
      ),
    ).toBe(false);
    expect(
      isPlaceholderImageUrl(
        "https://example.com/images/cross_categories/a.png",
      ),
    ).toBe(false);
    expect(isPlaceholderImageUrl("")).toBe(false);
    expect(isPlaceholderImageUrl(undefined)).toBe(false);
  });
});
