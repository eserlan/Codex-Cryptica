import { describe, expect, it } from "vitest";
import {
  CASTLE_FLOORPLAN_RESOURCES,
  getResourcesByCategory,
} from "./castle-floorplans";

describe("getResourcesByCategory", () => {
  it("returns only resources matching the given category", () => {
    const resources = getResourcesByCategory("palaces-manor-houses");

    expect(resources.length).toBeGreaterThan(0);
    for (const resource of resources) {
      expect(resource.category).toBe("palaces-manor-houses");
    }
    expect(resources.map((resource) => resource.id)).toContain(
      "biltmore-estate",
    );
  });

  it("returns an empty array for a category with no assigned resources", () => {
    expect(getResourcesByCategory("fortresses")).toEqual([]);
  });

  it("never drops or duplicates a resource across all categories", () => {
    const categories = new Set(
      CASTLE_FLOORPLAN_RESOURCES.map((resource) => resource.category),
    );
    const total = [...categories].reduce(
      (count, categoryId) => count + getResourcesByCategory(categoryId).length,
      0,
    );
    expect(total).toBe(CASTLE_FLOORPLAN_RESOURCES.length);
  });
});
