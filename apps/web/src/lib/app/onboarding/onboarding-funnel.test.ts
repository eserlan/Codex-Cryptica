import { describe, it, expect, vi, beforeEach } from "vitest";
import { OnboardingFunnel, type FunnelSink } from "./onboarding-funnel";

function makeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    store: map,
    storage: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    },
  };
}

describe("OnboardingFunnel", () => {
  let sink: ReturnType<typeof vi.fn> & FunnelSink;

  beforeEach(() => {
    sink = vi.fn() as any;
  });

  it("records a milestone once and reports completion", () => {
    const { storage } = makeStorage();
    const funnel = new OnboardingFunnel({
      storage,
      now: () => 111,
      sinks: [sink],
    });

    expect(funnel.track("welcome_shown")).toBe(true);
    expect(funnel.hasFired("welcome_shown")).toBe(true);
    expect(funnel.completed()).toEqual(["welcome_shown"]);
    expect(sink).toHaveBeenCalledWith("welcome_shown", {
      step: "welcome_shown",
      at: 111,
    });
  });

  it("de-dupes repeated milestones (first_entity fires once)", () => {
    const { storage } = makeStorage();
    const funnel = new OnboardingFunnel({ storage, sinks: [sink] });

    expect(funnel.track("first_entity")).toBe(true);
    expect(funnel.track("first_entity")).toBe(false);
    expect(sink).toHaveBeenCalledTimes(1);
  });

  it("persists across instances (funnel-completion record survives reload)", () => {
    const { storage } = makeStorage();
    new OnboardingFunnel({ storage }).track("demo_started");

    const next = new OnboardingFunnel({ storage });
    expect(next.hasFired("demo_started")).toBe(true);
    expect(next.track("demo_started")).toBe(false);
  });

  it("forwards to a GTM-style dataLayer when present", () => {
    const { storage } = makeStorage();
    const dataLayer: any[] = [];
    const funnel = new OnboardingFunnel({
      storage,
      now: () => 5,
      win: { dataLayer },
    });

    funnel.track("graph_opened");
    expect(dataLayer).toEqual([
      { event: "onboarding_funnel", step: "graph_opened", at: 5 },
    ]);
  });

  it("forwards to a __codexAnalytics.track hook when present", () => {
    const { storage } = makeStorage();
    const track = vi.fn();
    const funnel = new OnboardingFunnel({
      storage,
      now: () => 9,
      win: { __codexAnalytics: { track } },
    });

    funnel.track("first_link");
    expect(track).toHaveBeenCalledWith("onboarding_funnel", {
      step: "first_link",
      at: 9,
    });
  });

  it("ignores corrupt persisted state", () => {
    const { storage } = makeStorage({ "codex-onboarding-funnel": "not json" });
    const funnel = new OnboardingFunnel({ storage });
    expect(funnel.completed()).toEqual([]);
    expect(funnel.track("welcome_shown")).toBe(true);
  });

  it("survives a throwing sink without breaking tracking", () => {
    const { storage } = makeStorage();
    const boom: FunnelSink = () => {
      throw new Error("sink failed");
    };
    const funnel = new OnboardingFunnel({ storage, sinks: [boom, sink] });

    expect(() => funnel.track("vault_created")).not.toThrow();
    expect(sink).toHaveBeenCalled();
  });

  it("reset clears recorded milestones", () => {
    const { storage } = makeStorage();
    const funnel = new OnboardingFunnel({ storage });
    funnel.track("welcome_shown");
    funnel.reset();
    expect(funnel.completed()).toEqual([]);
    expect(funnel.track("welcome_shown")).toBe(true);
  });
});
