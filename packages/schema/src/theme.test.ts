import { describe, it, expect } from "vitest";
import { THEMES, DEFAULT_THEME } from "./theme";

describe("Theme Schema & Definitions", () => {
  it("defines the workspace and workspace_dark themes", () => {
    expect(THEMES.workspace).toBeDefined();
    expect(THEMES.workspace.id).toBe("workspace");
    expect(THEMES.workspace.tokens.fontHeader).toContain("Fraunces");
    expect(THEMES.workspace.tokens.fontBody).toContain("Inter");
    expect(THEMES.workspace.tokens.borderRadius).toBe("8px");

    expect(THEMES.workspace_dark).toBeDefined();
    expect(THEMES.workspace_dark.id).toBe("workspace_dark");
    expect(THEMES.workspace_dark.tokens.fontHeader).toContain("Fraunces");
    expect(THEMES.workspace_dark.tokens.fontBody).toContain("Inter");
    expect(THEMES.workspace_dark.tokens.borderRadius).toBe("8px");
  });

  it("sets workspace as the DEFAULT_THEME", () => {
    expect(DEFAULT_THEME.id).toBe("workspace");
  });

  it("refines fantasy theme tokens with distinct heading/body fonts and reduced graph weights", () => {
    const fantasy = THEMES.fantasy;
    expect(fantasy).toBeDefined();
    // fontHeader should not be equal to fontBody in refined fantasy
    expect(fantasy.tokens.fontHeader).not.toBe(fantasy.tokens.fontBody);
    expect(fantasy.tokens.fontHeader).toContain("Alegreya");
    expect(fantasy.tokens.fontBody).toContain("Inter");

    // Reduced graph edge weight/opacity checking
    expect(fantasy.graph.edgeWidth).toBeLessThanOrEqual(2); // Reduced from 3
  });
});
