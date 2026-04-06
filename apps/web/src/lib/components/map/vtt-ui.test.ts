import { describe, expect, it } from "vitest";
import { shouldShowInitiativePanel } from "./vtt-ui";

describe("shouldShowInitiativePanel", () => {
  it("hides the initiative panel outside combat mode", () => {
    expect(shouldShowInitiativePanel(true, "exploration")).toBe(false);
    expect(shouldShowInitiativePanel(false, "combat")).toBe(false);
  });

  it("shows the initiative panel only when VTT is enabled and combat mode is active", () => {
    expect(shouldShowInitiativePanel(true, "combat")).toBe(true);
  });
});
