import { describe, expect, it } from "vitest";
import {
  getPrimaryButtonStateClass,
  getMeasurementToolButtonClass,
  shouldShowInitiativePanel,
} from "./vtt-ui";

describe("shouldShowInitiativePanel", () => {
  it("hides the initiative panel outside combat mode", () => {
    expect(shouldShowInitiativePanel(true, "exploration")).toBe(false);
    expect(shouldShowInitiativePanel(false, "combat")).toBe(false);
  });

  it("shows the initiative panel only when VTT is enabled and combat mode is active", () => {
    expect(shouldShowInitiativePanel(true, "combat")).toBe(true);
  });
});

describe("getMeasurementToolButtonClass", () => {
  it("uses the shared inactive toggle treatment when disabled", () => {
    const className = getMeasurementToolButtonClass(false);

    expect(className).toContain("w-[3.375rem]");
    expect(className).toContain("h-8");
    expect(className).toContain("bg-theme-surface/90");
    expect(className).toContain("hover:border-theme-primary/60");
    expect(className).toContain("hover:shadow-[0_14px_30px_rgba(0,0,0,0.28)]");
    expect(className).toContain("border-theme-border");
  });

  it("uses the shared active toggle treatment when enabled", () => {
    const className = getMeasurementToolButtonClass(true);

    expect(className).toContain("border-theme-primary");
    expect(className).toContain("bg-theme-primary");
    expect(className).toContain("shadow-[0_14px_30px_rgba(0,0,0,0.35)]");
  });
});

describe("getPrimaryButtonStateClass", () => {
  it("returns the shared inactive toggle state", () => {
    expect(getPrimaryButtonStateClass(false)).toBe(
      "text-theme-muted hover:text-theme-text hover:bg-theme-primary/10",
    );
  });

  it("returns the shared active toggle state", () => {
    expect(getPrimaryButtonStateClass(true)).toBe(
      "bg-theme-primary/20 text-theme-primary ring-1 ring-theme-primary/50 hover:bg-theme-primary/30",
    );
  });
});
