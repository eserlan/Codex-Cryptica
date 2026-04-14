import { describe, expect, it } from "vitest";
import {
  buildGuestRoutePath,
  getGuestViewFromPathname,
  normalizeGuestView,
} from "./guest-session";

describe("guest-session helpers", () => {
  it("normalizes guest views", () => {
    expect(normalizeGuestView(" /map/ ")).toBe("map");
    expect(normalizeGuestView("")).toBeNull();
    expect(normalizeGuestView(null)).toBeNull();
  });

  it("derives a guest view from the current pathname", () => {
    expect(getGuestViewFromPathname("/map", "")).toBe("map");
    expect(getGuestViewFromPathname("/app/map", "/app")).toBe("map");
    expect(getGuestViewFromPathname("/app", "/app")).toBeNull();
  });

  it("builds a guest route path from a base and view", () => {
    expect(buildGuestRoutePath("", "map")).toBe("/map");
    expect(buildGuestRoutePath("/app", "map")).toBe("/app/map");
    expect(buildGuestRoutePath("/app", null)).toBeNull();
  });
});
