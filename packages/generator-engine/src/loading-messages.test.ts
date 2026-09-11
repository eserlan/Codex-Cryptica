import { describe, expect, it } from "vitest";
import { getThemeLoadingMessages } from "./loading-messages";
import { themeIdToLabel } from "./public-faction-constants";

describe("getThemeLoadingMessages", () => {
  it("uses cosmic-horror guidance for the cosmic_horror world theme", () => {
    const messages = getThemeLoadingMessages("cosmic_horror");

    expect(messages).toContain("Comparing impossible star charts...");
    expect(messages.join(" ").toLowerCase()).not.toContain("vampire");
  });

  it("falls back safely for an unknown theme", () => {
    expect(getThemeLoadingMessages("unknown-theme")).not.toHaveLength(0);
  });

  it("uses a separate generator label from Vampire / Gothic Noir", () => {
    expect(themeIdToLabel.cosmic_horror).toBe("Cosmic Horror");
    expect(themeIdToLabel.cosmic_horror).not.toBe(themeIdToLabel.horror);
  });
});
