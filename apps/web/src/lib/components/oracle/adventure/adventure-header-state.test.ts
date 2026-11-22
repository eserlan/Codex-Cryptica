import { describe, expect, it } from "vitest";
import {
  deriveAdventureHeaderStatus,
  derivePhoneToolsSummary,
} from "./adventure-header-state.js";

describe("deriveAdventureHeaderStatus", () => {
  it("enforces strict priority readOnly > offline > pendingRoll > generating > error > phase", () => {
    const pendingRoll = {
      id: "roll-1",
      prompt: "Check footing",
      suggestedActions: [],
    } as any;

    expect(
      deriveAdventureHeaderStatus({
        readOnly: true,
        phase: "offline",
        pendingRoll,
        elapsedLabel: "2h",
      }),
    ).toEqual({
      phoneLabel: "Read-only in this tab",
      desktopLabel: "Read-only in this tab",
      tone: "danger",
      icon: "icon-[lucide--lock]",
      urgent: true,
      busy: false,
    });

    expect(
      deriveAdventureHeaderStatus({
        readOnly: false,
        phase: "offline",
        pendingRoll,
        elapsedLabel: "2h",
      }),
    ).toEqual({
      phoneLabel: "Waiting for connection",
      desktopLabel: "Waiting for connection",
      tone: "danger",
      icon: "icon-[lucide--wifi-off]",
      urgent: true,
      busy: false,
    });

    expect(
      deriveAdventureHeaderStatus({
        readOnly: false,
        phase: "generating",
        pendingRoll,
        elapsedLabel: "2h",
      }),
    ).toEqual({
      phoneLabel: "Roll needed",
      desktopLabel: "generating",
      tone: "primary",
      icon: "icon-[lucide--dices]",
      urgent: true,
      busy: false,
    });

    expect(
      deriveAdventureHeaderStatus({
        readOnly: false,
        phase: "generating",
        pendingRoll: null,
        elapsedLabel: "2h",
      }),
    ).toEqual({
      phoneLabel: "Generating…",
      desktopLabel: "generating",
      tone: "primary",
      icon: "icon-[lucide--loader-2]",
      urgent: false,
      busy: true,
    });

    expect(
      deriveAdventureHeaderStatus({
        readOnly: false,
        phase: "error",
        pendingRoll: null,
        elapsedLabel: "2h",
      }),
    ).toEqual({
      phoneLabel: "Needs attention",
      desktopLabel: "error",
      tone: "danger",
      icon: "icon-[lucide--alert-circle]",
      urgent: true,
      busy: false,
    });

    expect(
      deriveAdventureHeaderStatus({
        readOnly: false,
        phase: "ready",
        pendingRoll: null,
        elapsedLabel: "2h",
      }),
    ).toEqual({
      phoneLabel: "ready · 2h",
      desktopLabel: "ready",
      tone: "neutral",
      icon: null,
      urgent: false,
      busy: false,
    });
  });

  it("distinguishes pending roll states with and without a supplied outcome", () => {
    expect(
      deriveAdventureHeaderStatus({
        readOnly: false,
        phase: "awaiting-roll",
        pendingRoll: { id: "r1", prompt: "Jump" } as any,
      }).phoneLabel,
    ).toBe("Roll needed");

    expect(
      deriveAdventureHeaderStatus({
        readOnly: false,
        phase: "ready-to-resolve",
        pendingRoll: {
          id: "r1",
          prompt: "Jump",
          suppliedOutcome: { kind: "narrative", value: "Success" },
        } as any,
      }).phoneLabel,
    ).toBe("Resolving roll");
  });

  it("uses safe, actionable copy when the pinned package is unavailable", () => {
    expect(
      deriveAdventureHeaderStatus({
        readOnly: true,
        phase: "package-unavailable",
        pendingRoll: null,
      }),
    ).toEqual({
      phoneLabel: "Package unavailable",
      desktopLabel: "Package unavailable",
      tone: "danger",
      icon: "icon-[lucide--alert-circle]",
      urgent: true,
      busy: false,
    });
  });
});

describe("derivePhoneToolsSummary", () => {
  it("formats singular/plural discovery and situation counts and caps visual badge at 99+", () => {
    expect(
      derivePhoneToolsSummary({
        discoveriesCount: 1,
        situationsCount: 1,
        readOnly: false,
      }),
    ).toEqual({
      ariaLabel: "Adventure tools (1 discovery, 1 active situation)",
      badgeCount: 2,
      badgeText: "2",
      badgeTone: "primary",
      liveAnnouncement: "1 discovery, 1 active situation in Adventure tools.",
    });

    expect(
      derivePhoneToolsSummary({
        discoveriesCount: 2,
        situationsCount: 1,
        readOnly: false,
      }).ariaLabel,
    ).toBe("Adventure tools (2 discoveries, 1 active situation)");

    const capped = derivePhoneToolsSummary({
      discoveriesCount: 80,
      situationsCount: 25,
      readOnly: false,
    });
    expect(capped.badgeCount).toBe(105);
    expect(capped.badgeText).toBe("99+");
    expect(capped.ariaLabel).toBe(
      "Adventure tools (80 discoveries, 25 active situations)",
    );
  });

  it("returns plain label and no badge when counts are zero in normal state", () => {
    expect(
      derivePhoneToolsSummary({
        discoveriesCount: 0,
        situationsCount: 0,
        readOnly: false,
      }),
    ).toEqual({
      ariaLabel: "Adventure tools",
      badgeCount: 0,
      badgeText: null,
      badgeTone: "neutral",
      liveAnnouncement: "",
    });
  });

  it("surfaces urgent recovery hint when read-only even with zero counts", () => {
    expect(
      derivePhoneToolsSummary({
        discoveriesCount: 0,
        situationsCount: 0,
        readOnly: true,
      }),
    ).toEqual({
      ariaLabel: "Adventure tools (read-only recovery available)",
      badgeCount: 0,
      badgeText: null,
      badgeTone: "danger",
      liveAnnouncement:
        "Read-only in this tab. Recovery options in Adventure tools.",
    });
  });
});
