import { describe, expect, it } from "vitest";
import type { GuidanceAction } from "help-engine";
import { shouldStepAside } from "./cif-step-aside";

// The docked panel on desktop: bottom-left, beside the activity bar.
const panel = { top: 300, left: 72, width: 384, height: 500 };
const highlightAction = {
  type: "highlight",
  target: "add-connection-button",
  label: "Add connection",
} as GuidanceAction;

describe("shouldStepAside", () => {
  it("keeps the chat open on desktop when the control is clear of the panel", () => {
    expect(
      shouldStepAside({
        isMobile: false,
        action: highlightAction,
        highlight: { top: 20, left: 700, width: 80, height: 32 },
        panel,
      }),
    ).toBe(false);
  });

  it("keeps the chat open for a guide that highlights nothing", () => {
    expect(
      shouldStepAside({
        isMobile: false,
        action: { type: "navigate", to: "map", label: "Open the map" },
        highlight: null,
        panel,
      }),
    ).toBe(false);
  });

  it("steps aside on a phone, where the panel covers most of the screen", () => {
    expect(
      shouldStepAside({
        isMobile: true,
        action: highlightAction,
        highlight: { top: 20, left: 700, width: 80, height: 32 },
        panel,
      }),
    ).toBe(true);
  });

  it("steps aside when the control sits under the panel", () => {
    expect(
      shouldStepAside({
        isMobile: false,
        action: highlightAction,
        highlight: { top: 400, left: 100, width: 80, height: 32 },
        panel,
      }),
    ).toBe(true);
  });

  it("steps aside when only the label above the control would be covered", () => {
    // The control starts just below the panel; its label sits over the edge.
    expect(
      shouldStepAside({
        isMobile: false,
        action: highlightAction,
        highlight: { top: 820, left: 100, width: 80, height: 32 },
        panel,
      }),
    ).toBe(true);
  });

  it.each([
    { type: "openHelp", helpId: "maps", label: "Read about maps" },
    { type: "openGenerator", label: "Open the generator" },
    { type: "openFeedback", kind: "problem", label: "Report a problem" },
    {
      type: "openPanel",
      panel: "settings-intelligence",
      label: "Open AI settings",
    },
    {
      type: "navigate",
      to: "graph",
      label: "Go and generate",
      then: { type: "openGenerator", label: "Open the generator" },
    },
  ] as GuidanceAction[])(
    "steps aside when the guide opens a dialog ($type)",
    (action) => {
      expect(
        shouldStepAside({
          isMobile: false,
          action,
          highlight: null,
          panel,
        }),
      ).toBe(true);
    },
  );

  it("keeps the chat open when the panel is not on screen to overlap", () => {
    expect(
      shouldStepAside({
        isMobile: false,
        action: highlightAction,
        highlight: { top: 400, left: 100, width: 80, height: 32 },
        panel: null,
      }),
    ).toBe(false);
  });
});
