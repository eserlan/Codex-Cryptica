import { describe, expect, it } from "vitest";
import { toRouteSlug } from "./slug";

describe("toRouteSlug", () => {
  it("transliterates accented Latin titles without dropping their letters", () => {
    expect(toRouteSlug("Sziklakönny Grotto")).toBe("sziklakonny-grotto");
    expect(toRouteSlug("Cripta de la Forja Ósea")).toBe(
      "cripta-de-la-forja-osea",
    );
  });

  it("collapses punctuation and returns an empty slug for symbol-only input", () => {
    expect(toRouteSlug("  The Bell — Below  ")).toBe("the-bell-below");
    expect(toRouteSlug("!!!")).toBe("");
  });
});
