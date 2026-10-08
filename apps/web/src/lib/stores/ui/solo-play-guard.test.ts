import { describe, it, expect, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  createSoloPlayGuard,
  SHARED_SOLO_NOTE,
  SOLO_SHARED_NOTE,
  type SoloPlayGuardDeps,
} from "./solo-play-guard";

function setup(
  opts: { solo?: boolean; shared?: boolean; hosting?: boolean } = {},
) {
  let sharedMode = opts.shared ?? false;
  const hosting = opts.hosting ?? false;
  const deps: SoloPlayGuardDeps = {
    soloActive: () => opts.solo ?? false,
    isSharedPlayOn: () => sharedMode || hosting,
    sharedMode: () => sharedMode,
    setSharedMode: vi.fn((on: boolean) => {
      sharedMode = on;
    }),
    openShare: vi.fn(),
    notify: vi.fn(),
  };
  return {
    guard: createSoloPlayGuard(deps),
    deps,
    get shared() {
      return sharedMode;
    },
  };
}

describe("solo start is blocked during shared play", () => {
  it("blocks while Shared Mode is on", () => {
    expect(setup({ shared: true }).guard.soloStartBlockedReason()).toBe(
      SHARED_SOLO_NOTE,
    );
  });

  it("blocks while hosting", () => {
    expect(setup({ hosting: true }).guard.soloStartBlockedReason()).toBe(
      SHARED_SOLO_NOTE,
    );
  });

  it("does not block when neither is on", () => {
    expect(setup().guard.soloStartBlockedReason()).toBeNull();
  });
});

describe("shared play is blocked during a solo session", () => {
  it("reports the note while a solo session is active", () => {
    expect(setup({ solo: true }).guard.sharedPlayBlockedReason()).toBe(
      SOLO_SHARED_NOTE,
    );
  });

  it("reports nothing with no solo session", () => {
    expect(setup().guard.sharedPlayBlockedReason()).toBeNull();
  });
});

describe("toggleSharedMode", () => {
  it("turns shared mode on when not blocked and returns true", () => {
    const s = setup();
    expect(s.guard.toggleSharedMode()).toBe(true);
    expect(s.shared).toBe(true);
  });

  it("refuses to turn shared mode on during a solo session, and leaves it off", () => {
    const s = setup({ solo: true });
    expect(s.guard.toggleSharedMode()).toBe(false);
    expect(s.shared).toBe(false);
    expect(s.deps.setSharedMode).not.toHaveBeenCalled();
  });

  it("always allows turning shared mode off, even during a solo session", () => {
    const s = setup({ solo: true, shared: true });
    expect(s.guard.toggleSharedMode()).toBe(true);
    expect(s.shared).toBe(false);
  });
});

describe("requestShare", () => {
  it("opens Share when not blocked", () => {
    const s = setup();
    expect(s.guard.requestShare()).toBe(true);
    expect(s.deps.openShare).toHaveBeenCalledTimes(1);
  });

  it("shows the note and does not open Share during a solo session", () => {
    const s = setup({ solo: true });
    expect(s.guard.requestShare()).toBe(false);
    expect(s.deps.openShare).not.toHaveBeenCalled();
    expect(s.deps.notify).toHaveBeenCalledWith(SOLO_SHARED_NOTE);
  });
});

describe("no direct shared-play writes outside the guard", () => {
  // Vitest runs from apps/web, so the scan starts at its src folder.
  const webSrc = join(process.cwd(), "src");

  function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        if (name === "node_modules") continue;
        walk(path, out);
      } else if (/\.(ts|svelte)$/.test(name) && !/\.test\.ts$/.test(name)) {
        out.push(path);
      }
    }
    return out;
  }

  const files = walk(webSrc);
  const rel = (p: string) => relative(webSrc, p).split("\\").join("/");

  it("assigns sharedMode directly only in the guard and the guest-only bootstrap", () => {
    const allowed = [
      "lib/stores/ui/solo-play-guard.ts",
      "lib/stores/solo-session-instance.ts",
      "lib/components/vtt/GuestSessionBootstrap.svelte",
    ];
    const offenders = files
      .filter((f) =>
        /sessionModeStore\.sharedMode\s*=(?!=)/.test(readFileSync(f, "utf8")),
      )
      .map(rel)
      .filter((f) => !allowed.includes(f));
    expect(offenders).toEqual([]);
  });

  it("calls openShare() directly only inside the guard", () => {
    // The map controller checks sharedPlayBlockedReason() before it opens Share,
    // so its direct call is the guarded path, not a bypass.
    const allowed = [
      "lib/stores/ui/solo-play-guard.ts",
      "lib/stores/solo-session-instance.ts",
      "lib/stores/ui/modal-ui.svelte.ts",
      "lib/stores/map/map-page-controller.svelte.ts",
    ];
    const offenders = files
      .filter((f) => /\.openShare\(\)/.test(readFileSync(f, "utf8")))
      .map(rel)
      .filter((f) => !allowed.includes(f));
    expect(offenders).toEqual([]);
  });

  describe("solo play loop stays on this device (FR-027, SC-005)", () => {
    const NETWORK = /\b(fetch\(|sendBeacon|XMLHttpRequest|WebSocket)/;
    const solo = files
      .map(rel)
      .filter(
        (f) =>
          f.startsWith("lib/components/solo/") ||
          /^lib\/stores\/solo-/.test(f) ||
          f === "lib/services/generator-journal-capture.ts" ||
          f === "lib/services/record-table-roll.ts",
      )
      .filter((f) => !f.endsWith(".test.ts"));

    it("the solo modules cover the new code", () => {
      expect(solo.length).toBeGreaterThan(10);
    });

    it("no solo module calls the network", () => {
      const offenders = solo.filter((f) =>
        NETWORK.test(readFileSync(join(webSrc, f), "utf8")),
      );
      expect(offenders).toEqual([]);
    });
  });
});
