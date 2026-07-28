import { describe, expect, it } from "vitest";
import {
  getDelveCanvasLabel,
  getDelveLocationTypeLabel,
  getDelveTerm,
} from "./delve-terminology";

describe("delve terminology", () => {
  it.each([
    ["fantasy", "Delve"],
    ["western", "Delve"],
    ["steampunk", "Delve"],
    ["scifi", "Facility"],
    ["cyberpunk_light", "Facility"],
    ["lancer", "Facility"],
    ["horror", "Lair"],
    ["apocalyptic_light", "Lair"],
    ["pirate_dark", "Hideout"],
  ])("uses the %s theme's term", (themeId, expected) => {
    expect(getDelveTerm(themeId)).toBe(expected);
  });

  it("falls back to delve terminology for an unknown theme", () => {
    expect(getDelveCanvasLabel("custom-theme")).toBe("Delve Canvas");
    expect(getDelveLocationTypeLabel(undefined)).toBe("Location (Delve)");
  });
});
