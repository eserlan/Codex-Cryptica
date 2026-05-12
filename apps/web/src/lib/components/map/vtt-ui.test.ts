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
    expect(className).toContain("focus-visible:outline-none");
    expect(className).toContain("focus-visible:ring-2");
    expect(className).toContain("focus-visible:ring-theme-primary");
    expect(className).toContain("focus-visible:ring-offset-2");
    expect(className).toContain("focus-visible:ring-offset-theme-surface");
  });

  it("uses the shared active toggle treatment when enabled", () => {
    const className = getMeasurementToolButtonClass(true);

    expect(className).toContain("border-theme-primary");
    expect(className).toContain("bg-theme-primary");
    expect(className).toContain("shadow-[0_14px_30px_rgba(0,0,0,0.35)]");
    expect(className).toContain("focus-visible:outline-none");
    expect(className).toContain("focus-visible:ring-2");
    expect(className).toContain("focus-visible:ring-theme-primary");
    expect(className).toContain("focus-visible:ring-offset-2");
    expect(className).toContain("focus-visible:ring-offset-theme-surface");
  });
});

describe("getPrimaryButtonStateClass", () => {
  it("returns the shared inactive toggle state", () => {
    const className = getPrimaryButtonStateClass(false);
    expect(className).toContain("text-theme-muted");
    expect(className).toContain("hover:text-theme-text");
    expect(className).toContain("hover:bg-theme-primary/10");
    expect(className).toContain("focus-visible:outline-none");
    expect(className).toContain("focus-visible:ring-2");
    expect(className).toContain("focus-visible:ring-theme-primary");
  });

  it("returns the shared active toggle state", () => {
    const className = getPrimaryButtonStateClass(true);
    expect(className).toContain("bg-theme-primary/20");
    expect(className).toContain("text-theme-primary");
    expect(className).toContain("ring-1");
    expect(className).toContain("ring-theme-primary/50");
    expect(className).toContain("hover:bg-theme-primary/30");
    expect(className).toContain("focus-visible:outline-none");
    expect(className).toContain("focus-visible:ring-2");
    expect(className).toContain("focus-visible:ring-theme-primary");
  });
});
