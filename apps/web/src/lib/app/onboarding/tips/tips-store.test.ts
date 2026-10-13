import { describe, expect, it, vi } from "vitest";
import type { HelpArea } from "help-engine";
import {
  TIPS_KEY,
  TIPS_SESSION_KEY,
  TipsStore,
  type TipContext,
  type TipsStoreDeps,
} from "./tips-store.svelte";

function memoryStorage(fail = false) {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => {
      if (fail) throw new Error("blocked");
      return data.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (fail) throw new Error("blocked");
      data.set(k, v);
    },
    removeItem: (k: string) => data.delete(k),
  };
}

const CLEAR = {
  typing: false,
  dialogOpen: false,
  tourActive: false,
  journeyOrInvitationActive: false,
  cifOpen: false,
  firstRunPage: false,
};

function setup(
  over: Partial<TipContext> = {},
  opts: { storageFails?: boolean; sessionFails?: boolean; ai?: boolean } = {},
) {
  const storage = memoryStorage(opts.storageFails);
  const sessionStorage = memoryStorage(opts.sessionFails);
  const ctx: TipContext = {
    goal: "world",
    goalInvitation: "goal",
    setupEnded: true,
    area: "graph" as HelpArea,
    unavailableAreas: [],
    blockers: { ...CLEAR },
    ...over,
  };
  const aiState = { on: opts.ai ?? true };
  const askCif = vi.fn();
  const deps: TipsStoreDeps = {
    storage,
    sessionStorage,
    aiAvailable: () => aiState.on,
    context: () => ctx,
    askCif,
  };
  const store = new TipsStore(deps);
  return { store, deps, storage, sessionStorage, ctx, aiState, askCif };
}

const stored = (s: ReturnType<typeof memoryStorage>) =>
  JSON.parse(s.data.get(TIPS_KEY) ?? "{}");

describe("TipsStore: the setting and consent (FR-001 to FR-006)", () => {
  it("starts off on a fresh device and shows nothing", () => {
    const t = setup();
    expect(t.store.enabled).toBe(false);
    t.store.evaluate();
    expect(t.store.current).toBeNull();
  });

  it("keeps a switched-on setting across a reload", () => {
    const t = setup();
    t.store.setEnabled(true);
    const again = new TipsStore(t.deps);
    expect(again.enabled).toBe(true);
  });

  it("stores the switch as off when AI becomes unavailable, so turning AI back on does not re-enable it (FR-004)", () => {
    const t = setup();
    t.store.setEnabled(true);
    t.aiState.on = false;
    t.store.evaluate();
    expect(t.store.enabled).toBe(false);
    expect(stored(t.storage).enabled).toBe(false);
    t.aiState.on = true;
    expect(new TipsStore(t.deps).enabled).toBe(false);
  });

  it("shows the one-time question only after a goal and ended setup", () => {
    const t = setup();
    expect(t.store.shouldAskOptIn).toBe(true);
  });

  it("does not ask when the person chose explore or dismissed, or setup is still running (negative)", () => {
    expect(setup({ goalInvitation: "explore" }).store.shouldAskOptIn).toBe(
      false,
    );
    expect(setup({ goalInvitation: "dismissed" }).store.shouldAskOptIn).toBe(
      false,
    );
    expect(setup({ setupEnded: false }).store.shouldAskOptIn).toBe(false);
    expect(setup({}, { ai: false }).store.shouldAskOptIn).toBe(false);
    expect(
      setup({ blockers: { ...CLEAR, dialogOpen: true } }).store.shouldAskOptIn,
    ).toBe(false);
  });

  it("never asks again after Yes, No or closing (FR-006)", () => {
    const yes = setup();
    yes.store.answerOptIn(true);
    expect(yes.store.enabled).toBe(true);
    expect(yes.store.shouldAskOptIn).toBe(false);

    const no = setup();
    no.store.answerOptIn(false);
    expect(no.store.enabled).toBe(false);
    expect(no.store.shouldAskOptIn).toBe(false);

    const closed = setup();
    closed.store.closeOptIn();
    expect(closed.store.enabled).toBe(false);
    expect(new TipsStore(closed.deps).shouldAskOptIn).toBe(false);
  });
});

describe("TipsStore: showing and acting on a tip (FR-008, FR-017, FR-018)", () => {
  it("shows one tip and marks the session", () => {
    const t = setup();
    t.store.setEnabled(true);
    t.store.evaluate();
    expect(t.store.current?.area).toBe("graph");
    expect(t.sessionStorage.data.get(TIPS_SESSION_KEY)).toBe("1");
  });

  it("makes no network request and no Cif request just by showing a tip (FR-017)", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const t = setup();
    t.store.setEnabled(true);
    t.store.evaluate();
    expect(t.store.current).not.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(t.askCif).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("shows no second tip in the same session (FR-008)", () => {
    const t = setup();
    t.store.setEnabled(true);
    t.store.evaluate();
    t.store.dismiss();
    t.ctx.area = "generators" as HelpArea;
    t.store.evaluate();
    expect(t.store.current).toBeNull();
  });

  it("allows a tip again in a new session", () => {
    const t = setup();
    t.store.setEnabled(true);
    t.store.evaluate();
    t.sessionStorage.data.clear();
    t.store.dismiss();
    t.ctx.area = "generators" as HelpArea;
    t.store.evaluate();
    expect(t.store.current?.area).toBe("generators");
  });

  it("act asks Cif the tip's exact prompt once and records it as used", () => {
    const t = setup();
    t.store.setEnabled(true);
    t.store.evaluate();
    const prompt = t.store.current!.prompt;
    t.store.act();
    expect(t.askCif).toHaveBeenCalledTimes(1);
    expect(t.askCif).toHaveBeenCalledWith(prompt);
    expect(stored(t.storage).acted.length).toBe(1);
    expect(t.store.current).toBeNull();
  });

  it("shows nothing when the tip's feature is not offered here (FR-013)", () => {
    const t = setup({ unavailableAreas: ["graph"] as HelpArea[] });
    t.store.setEnabled(true);
    t.store.evaluate();
    expect(t.store.current).toBeNull();
  });

  it("removes the chip when the person leaves the screen", () => {
    const t = setup();
    t.store.setEnabled(true);
    t.store.evaluate();
    t.ctx.area = "settings" as HelpArea;
    t.store.evaluate();
    expect(t.store.current).toBeNull();
  });
});

describe("TipsStore: quiet rules (FR-014, FR-015)", () => {
  it("waits for a block to clear on the same screen, then shows", () => {
    const t = setup({ blockers: { ...CLEAR, typing: true } });
    t.store.setEnabled(true);
    t.store.evaluate();
    expect(t.store.current).toBeNull();
    t.ctx.blockers = { ...CLEAR };
    t.store.reevaluate();
    expect(t.store.current).not.toBeNull();
  });

  it("drops a waiting tip when the person has left the screen (research D3)", () => {
    const t = setup({
      blockers: { ...CLEAR, dialogOpen: true },
      area: "generators" as HelpArea,
    });
    t.store.setEnabled(true);
    t.store.evaluate();
    t.ctx.area = "graph" as HelpArea;
    t.ctx.blockers = { ...CLEAR };
    t.store.reevaluate();
    expect(t.store.current).toBeNull();
    t.store.evaluate();
    expect(t.store.current?.area).toBe("graph");
  });

  it("never queues more than one waiting tip", () => {
    const t = setup({ blockers: { ...CLEAR, typing: true } });
    t.store.setEnabled(true);
    t.store.evaluate();
    t.store.evaluate();
    t.ctx.blockers = { ...CLEAR };
    t.store.reevaluate();
    expect(t.store.current).not.toBeNull();
    expect(t.sessionStorage.data.get(TIPS_SESSION_KEY)).toBe("1");
  });

  it("hides a shown chip when a blocker appears, and does not show it again this session", () => {
    const t = setup();
    t.store.setEnabled(true);
    t.store.evaluate();
    t.ctx.blockers = { ...CLEAR, typing: true };
    t.store.evaluate();
    expect(t.store.current).toBeNull();
    t.ctx.blockers = { ...CLEAR };
    t.store.evaluate();
    expect(t.store.current).toBeNull();
  });
});

describe("TipsStore: dismissals (FR-021 to FR-023)", () => {
  it("removes a dismissed chip and it stays gone after reload", () => {
    const t = setup();
    t.store.setEnabled(true);
    t.store.evaluate();
    const id = t.store.current!.id;
    t.store.dismiss();
    expect(t.store.current).toBeNull();
    expect(stored(t.storage).dismissed).toEqual([id]);
    t.sessionStorage.data.clear();
    const again = new TipsStore(t.deps);
    again.evaluate();
    expect(again.current).toBeNull();
  });

  it("silences a screen after two dismissals, until the setting is cycled", () => {
    // Each goal has one tip per screen, so two dismissals on generators come from two goals.
    const t = setup({ area: "generators" as HelpArea });
    t.store.setEnabled(true);
    t.store.evaluate();
    expect(t.store.current?.area).toBe("generators");
    t.store.dismiss();

    t.ctx.goal = "campaign";
    t.sessionStorage.data.clear();
    t.store.evaluate();
    expect(t.store.current?.area).toBe("generators");
    t.store.dismiss();

    t.sessionStorage.data.clear();
    t.ctx.goal = "story";
    t.store.evaluate();
    expect(t.store.current).toBeNull();

    t.store.setEnabled(false);
    t.store.setEnabled(true);
    t.sessionStorage.data.clear();
    t.ctx.goal = "world";
    t.store.evaluate();
    expect(t.store.current).toBeNull();
    // Both generator tips are dismissed, so the silence cannot be lifted by a new visit alone.
    t.ctx.area = "graph" as HelpArea;
    t.store.evaluate();
    expect(t.store.current?.area).toBe("graph");
  });
});

describe("TipsStore: cost while tips are off (checklist: hot paths)", () => {
  it("does not read the screen on focus changes while tips are off", () => {
    const context = vi.fn(() => ({
      goal: "world" as const,
      goalInvitation: "goal" as const,
      setupEnded: true,
      area: "graph" as HelpArea,
      unavailableAreas: [],
      blockers: { ...CLEAR },
    }));
    const store = new TipsStore({
      storage: memoryStorage(),
      sessionStorage: memoryStorage(),
      aiAvailable: () => true,
      context,
      askCif: vi.fn(),
    });
    store.evaluate();
    store.evaluate();
    expect(context).not.toHaveBeenCalled();
    expect(store.current).toBeNull();
  });
});

describe("TipsStore: no goal and storage failures (FR-024, FR-031)", () => {
  it("shows no goal-based tip when the person explored without choosing (FR-024)", () => {
    const t = setup({ goalInvitation: "explore" });
    t.store.setEnabled(true);
    t.store.evaluate();
    expect(t.store.current).toBeNull();
  });

  it("behaves as off when storage fails, without throwing", () => {
    const t = setup({}, { storageFails: true });
    expect(() => t.store.setEnabled(true)).not.toThrow();
    expect(() => t.store.evaluate()).not.toThrow();
    expect(t.store.enabled).toBe(true);
  });

  it("shows no tip when session storage cannot be read or written (FR-031)", () => {
    const unreadable = setup({}, { sessionFails: true });
    unreadable.store.setEnabled(true);
    unreadable.store.evaluate();
    expect(unreadable.store.current).toBeNull();
  });
});
