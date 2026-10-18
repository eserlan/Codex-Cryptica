import { describe, expect, it, vi } from "vitest";
import { SHELL_CONTROL_IDS } from "help-engine";
import type { Milestone } from "onboarding-journey-engine";
import {
  JOURNEY_KEY_PREFIX,
  JOURNEY_SESSION_KEY,
  JourneyStore,
  type JourneyStoreDeps,
} from "./journey-store.svelte";

function memoryStorage(fail = false) {
  const data = new Map<string, string>();
  return {
    data,
    getItem: vi.fn((k: string) => data.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => {
      if (fail) throw new Error("quota");
      data.set(k, v);
    }),
    removeItem: vi.fn((k: string) => void data.delete(k)),
  };
}

function setup(
  over: Partial<JourneyStoreDeps> = {},
  opts: { fail?: boolean } = {},
) {
  let now = 1000;
  let area = "other";
  const storage = memoryStorage(opts.fail);
  const sessionStorage = memoryStorage(opts.fail);
  const tour = { activeTour: null as unknown, skipTour: vi.fn() };
  const deps: JourneyStoreDeps = {
    storage,
    sessionStorage,
    clock: { now: () => now },
    area: () => area,
    runGuide: vi.fn(async () => true),
    categoryIds: () => ["character", "location", "note"],
    askCifAvailable: () => true,
    askCif: vi.fn(),
    tour,
    ...over,
  };
  const store = new JourneyStore(deps);
  return {
    store,
    deps,
    storage,
    sessionStorage,
    tour,
    tick: (ms = 10) => (now += ms),
    setArea: (a: string) => (area = a),
    at: () => now,
  };
}

const created = (category: string, at: number): Milestone => ({
  kind: "entry-created",
  category,
  at,
});

describe("JourneyStore", () => {
  it("starts a journey, saves its record and marks the session", () => {
    const t = setup();
    t.store.load("v1");
    t.store.start("world");
    expect(t.store.active).toBe(true);
    expect(t.store.step?.id).toBe("add-place");
    const saved = JSON.parse(t.storage.data.get(`${JOURNEY_KEY_PREFIX}v1`)!);
    expect(saved).toMatchObject({
      journeyId: "worldbuilder",
      outcome: "running",
    });
    expect(JSON.parse(t.sessionStorage.data.get(JOURNEY_SESSION_KEY)!)).toEqual(
      {
        vaultId: "v1",
        journeyId: "worldbuilder",
      },
    );
  });

  it("advances on a real milestone and persists it, ignoring earlier ones", () => {
    const t = setup();
    t.store.load("v1");
    t.store.start("world");
    t.store.apply(created("location", t.at() - 1));
    expect(t.store.progress?.completed).toEqual([]);
    t.store.apply(created("location", t.tick()));
    expect(t.store.step?.id).toBe("add-character");
    expect(t.store.announcement).toMatch(/Step done/);
    const saved = JSON.parse(t.storage.data.get(`${JOURNEY_KEY_PREFIX}v1`)!);
    expect(saved.completed).toEqual(["add-place"]);
  });

  it("completes the graph step as soon as its earlier steps are done while the graph shows", () => {
    const t = setup();
    t.store.load("v1");
    t.setArea("graph");
    t.store.start("world");
    expect(t.store.progress?.completed).toEqual([]);
    t.store.apply(created("location", t.tick()));
    t.store.apply(created("character", t.tick()));
    t.store.apply({ kind: "connection-added", at: t.tick() });
    expect(t.store.progress?.outcome).toBe("finished");
    expect(t.store.active).toBe(true);
    expect(t.sessionStorage.data.has(JOURNEY_SESSION_KEY)).toBe(false);
    t.store.done();
    expect(t.store.active).toBe(false);
  });

  it("starting another goal replaces the running journey", () => {
    const t = setup();
    t.store.load("v1");
    t.store.start("world");
    t.store.start("story");
    expect(t.store.definition?.id).toBe("writer");
    expect(t.store.progress?.completed).toEqual([]);
  });

  it("ends a running tour when a journey starts", () => {
    const t = setup();
    t.tour.activeTour = { id: "initial-onboarding" };
    t.store.load("v1");
    t.store.start("campaign");
    expect(t.tour.skipTour).toHaveBeenCalled();
  });

  it("stops the journey when a tour starts, keeping progress", () => {
    const t = setup();
    t.store.load("v1");
    t.store.start("world");
    t.store.apply(created("location", t.tick()));
    t.store.tourStarted();
    expect(t.store.active).toBe(false);
    expect(t.store.progress?.outcome).toBe("exited");
    expect(t.store.progress?.completed).toEqual(["add-place"]);
    expect(t.store.canContinue).toBe(true);
  });

  it("exit stops guidance, clears the marker and keeps progress", () => {
    const t = setup();
    t.store.load("v1");
    t.store.start("world");
    t.store.exit();
    expect(t.store.active).toBe(false);
    expect(t.sessionStorage.data.has(JOURNEY_SESSION_KEY)).toBe(false);
    t.store.apply(created("location", t.tick()));
    expect(t.store.progress?.completed).toEqual([]);
  });

  it("restores the card after a reload in the same session", () => {
    const t = setup();
    t.store.load("v1");
    t.store.start("world");
    t.store.apply(created("location", t.tick()));
    const reloaded = new JourneyStore(t.deps);
    reloaded.load("v1");
    expect(reloaded.active).toBe(true);
    expect(reloaded.step?.id).toBe("add-character");
  });

  it("does not bring the card back in a new session, but keeps progress", () => {
    const t = setup();
    t.store.load("v1");
    t.store.start("world");
    t.sessionStorage.data.clear();
    const later = new JourneyStore(t.deps);
    later.load("v1");
    expect(later.active).toBe(false);
    expect(later.canContinue).toBe(true);
    later.resume();
    expect(later.active).toBe(true);
    expect(later.progress?.outcome).toBe("running");
  });

  it("pauses on a vault switch and comes back on return", () => {
    const t = setup();
    t.store.load("v1");
    t.store.start("world");
    t.store.load("v2");
    expect(t.store.active).toBe(false);
    expect(t.store.progress).toBeNull();
    t.store.load("v1");
    expect(t.store.active).toBe(true);
  });

  it("keeps running in memory when storage fails", () => {
    const t = setup({}, { fail: true });
    t.store.load("v1");
    t.store.start("world");
    t.store.apply(created("location", t.tick()));
    expect(t.store.step?.id).toBe("add-character");
  });

  it("treats a malformed record as no journey", () => {
    const t = setup();
    t.storage.data.set(`${JOURNEY_KEY_PREFIX}v1`, "{oops");
    t.store.load("v1");
    expect(t.store.progress).toBeNull();
    t.storage.data.set(
      `${JOURNEY_KEY_PREFIX}v1`,
      JSON.stringify({ journeyId: "nope" }),
    );
    t.store.load("v1");
    expect(t.store.progress).toBeNull();
  });

  it("back, back to current and skip only move the card", () => {
    const t = setup();
    t.store.load("v1");
    t.store.start("world");
    t.store.apply(created("location", t.tick()));
    t.store.back();
    expect(t.store.step?.id).toBe("add-place");
    expect(t.store.viewingEarlier).toBe(true);
    expect(t.store.stepDone).toBe(true);
    t.store.returnToCurrent();
    expect(t.store.step?.id).toBe("add-character");
    t.store.skip();
    expect(t.store.progress?.skipped).toEqual(["add-character"]);
    expect(t.store.step?.id).toBe("connect");
  });

  it("Show me runs the step's guide with the shell controls only on request", async () => {
    const t = setup();
    t.store.load("v1");
    t.store.start("world");
    expect(t.deps.runGuide).not.toHaveBeenCalled();
    await t.store.showMe();
    expect(t.deps.runGuide).toHaveBeenCalledWith(
      { type: "highlight", target: "create-entry", label: "Create" },
      {
        extraAvailable: SHELL_CONTROL_IDS,
        signal: expect.any(AbortSignal),
      },
    );
    expect(t.store.showingFallback).toBe(false);
  });

  it.each(["exit", "replacement"] as const)(
    "cancels a pending Show me guide after journey %s",
    async (change) => {
      let resolveGuide!: (ran: boolean) => void;
      let signal: AbortSignal | undefined;
      const runGuide = vi.fn(
        (
          _action: Parameters<JourneyStoreDeps["runGuide"]>[0],
          options: Parameters<JourneyStoreDeps["runGuide"]>[1],
        ) => {
          signal = options.signal;
          return new Promise<boolean>((resolve) => (resolveGuide = resolve));
        },
      );
      const t = setup({ runGuide });
      t.store.load("v1");
      t.store.start("world");
      const pending = t.store.showMe();
      expect(signal?.aborted).toBe(false);

      if (change === "exit") t.store.exit();
      else t.store.start("story");
      expect(signal?.aborted).toBe(true);

      resolveGuide(false);
      await pending;
      expect(t.store.showingFallback).toBe(false);
      if (change === "replacement") {
        expect(t.store.active).toBe(true);
        expect(t.store.definition?.id).toBe("writer");
      }
    },
  );

  it("falls back to written instructions when Show me cannot run", async () => {
    const t = setup({ runGuide: vi.fn(async () => false) });
    t.store.load("v1");
    t.store.start("world");
    await t.store.showMe();
    expect(t.store.showingFallback).toBe(true);
    expect(t.store.instruction).toMatch(/Create button/);
    t.store.apply(created("location", t.tick()));
    expect(t.store.showingFallback).toBe(false);
  });

  it("offers Ask Cif only with a quick prompt and AI available", () => {
    const t = setup();
    t.store.load("v1");
    t.store.start("world");
    expect(t.store.canAskCif).toBe(false);
    t.store.apply(created("location", t.tick()));
    t.store.apply(created("character", t.tick()));
    expect(t.store.step?.id).toBe("connect");
    expect(t.store.canAskCif).toBe(true);
    t.store.askCif();
    expect(t.deps.askCif).toHaveBeenCalledWith("Where do I add a connection?");

    const off = setup({ askCifAvailable: () => false });
    off.store.load("v1");
    off.store.start("story");
    off.store.apply(created("character", off.tick()));
    off.store.apply(created("note", off.tick()));
    expect(off.store.canAskCif).toBe(false);
    off.store.askCif();
    expect(off.deps.askCif).not.toHaveBeenCalled();
  });

  it("uses the any-entry wording when the vault lacks the category", () => {
    const t = setup({ categoryIds: () => ["planet"] });
    t.store.load("v1");
    t.store.start("world");
    expect(t.store.instruction).toMatch(/first entry/);
  });

  it("runs the finish suggestion only when tapped, then closes", async () => {
    const t = setup();
    t.store.load("v1");
    t.store.start("campaign");
    t.store.apply(created("character", t.tick()));
    t.store.apply({ kind: "generator-saved", at: t.tick() });
    t.store.apply(created("location", t.tick()));
    expect(t.store.progress?.outcome).toBe("finished");
    expect(t.deps.runGuide).not.toHaveBeenCalled();
    await t.store.runNext();
    expect(t.deps.runGuide).toHaveBeenCalledWith(
      expect.objectContaining({ type: "navigate", to: "map" }),
      expect.anything(),
    );
    expect(t.store.active).toBe(false);
  });

  it("does nothing without a vault", () => {
    const t = setup();
    t.store.load(null);
    t.store.start("world");
    expect(t.store.active).toBe(false);
  });

  it("setupEnded is true only once the journey is finished or exited (spec 176)", () => {
    const t = setup();
    expect(t.store.setupEnded).toBe(false);
    t.store.load("v1");
    t.store.start("world");
    expect(t.store.setupEnded).toBe(false);
    t.store.exit();
    expect(t.store.setupEnded).toBe(true);
  });

  describe("Getting Started controls", () => {
    it("startOver resets progress with a fresh start time", () => {
      const t = setup();
      t.store.load("v1");
      t.store.start("world");
      t.store.apply(created("location", t.tick()));
      t.store.exit();
      t.tick(100);
      t.store.startOver();
      expect(t.store.active).toBe(true);
      expect(t.store.progress?.completed).toEqual([]);
      expect(t.store.progress?.startedAt).toBe(t.at());
      expect(t.store.definition?.id).toBe("worldbuilder");
    });

    it("startOver with another goal switches journey", () => {
      const t = setup();
      t.store.load("v1");
      t.store.start("world");
      t.store.startOver("campaign");
      expect(t.store.definition?.id).toBe("rpg-gm");
    });

    it("resume does nothing for a finished or missing journey", () => {
      const t = setup();
      t.store.load("v1");
      t.store.resume();
      expect(t.store.active).toBe(false);
      t.store.start("campaign");
      t.store.apply(created("character", t.tick()));
      t.store.apply({ kind: "generator-saved", at: t.tick() });
      t.store.apply(created("location", t.tick()));
      t.store.done();
      t.store.resume();
      expect(t.store.active).toBe(false);
      expect(t.store.canContinue).toBe(false);
    });

    it("resume continues from the first step not done and marks the session", () => {
      const t = setup();
      t.store.load("v1");
      t.store.start("world");
      t.store.apply(created("character", t.tick()));
      t.store.exit();
      expect(t.sessionStorage.data.has(JOURNEY_SESSION_KEY)).toBe(false);
      t.store.resume();
      expect(t.store.step?.id).toBe("add-place");
      expect(t.sessionStorage.data.has(JOURNEY_SESSION_KEY)).toBe(true);
    });
  });
});
