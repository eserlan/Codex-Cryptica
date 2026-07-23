/** @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  trackEvent,
  initCodexAnalyticsBridge,
  resetCodexAnalyticsBridge,
} from "./zaraz-analytics";
import { attributionStore } from "./attribution";

describe("trackEvent", () => {
  beforeEach(() => {
    attributionStore.reset();
  });

  it("no-ops silently when window.zaraz is absent", () => {
    expect(() => trackEvent("seo_entry", {}, {})).not.toThrow();
  });

  it("no-ops silently when zaraz.track is not a function", () => {
    expect(() =>
      trackEvent("seo_entry", {}, { zaraz: { track: "not-a-fn" } }),
    ).not.toThrow();
  });

  it("calls zaraz.track with the given properties when zaraz is present", () => {
    const track = vi.fn();
    trackEvent(
      "generator_started",
      { generator_type: "npc" },
      { zaraz: { track } },
    );

    expect(track).toHaveBeenCalledWith(
      "generator_started",
      expect.objectContaining({ generator_type: "npc" }),
    );
  });

  it("merges current first-touch and latest-touch attribution into every event", () => {
    attributionStore.captureIfAttributed(
      new URL("https://codexcryptica.com/generators/npc?utm_source=reddit"),
    );
    const track = vi.fn();

    trackEvent("seo_entry", {}, { zaraz: { track } });

    const [, properties] = track.mock.calls[0];
    expect(properties.first_touch).toEqual(
      expect.objectContaining({ utm_source: "reddit" }),
    );
    expect(properties.latest_touch).toEqual(
      expect.objectContaining({ utm_source: "reddit" }),
    );
  });

  it("omits attribution properties entirely when none is on record", () => {
    const track = vi.fn();
    trackEvent("seo_entry", {}, { zaraz: { track } });

    const [, properties] = track.mock.calls[0];
    expect(properties).not.toHaveProperty("first_touch");
    expect(properties).not.toHaveProperty("latest_touch");
  });

  it("never throws even if zaraz.track itself throws", () => {
    const track = vi.fn(() => {
      throw new Error("blocked");
    });

    expect(() =>
      trackEvent("seo_entry", {}, { zaraz: { track } }),
    ).not.toThrow();
  });
});

describe("initCodexAnalyticsBridge", () => {
  beforeEach(() => {
    resetCodexAnalyticsBridge();
    attributionStore.reset();
  });

  it("defines window.__codexAnalytics.track, reaching zaraz.track", () => {
    const track = vi.fn();
    const win: any = { zaraz: { track } };

    initCodexAnalyticsBridge(win);
    win.__codexAnalytics.track("onboarding_funnel", { step: "vault_created" });

    expect(track).toHaveBeenCalledWith(
      "onboarding_funnel",
      expect.objectContaining({ step: "vault_created" }),
    );
  });

  it("is idempotent — a second call does not throw or double-wrap", () => {
    const win: any = { zaraz: { track: vi.fn() } };
    initCodexAnalyticsBridge(win);
    const firstTrack = win.__codexAnalytics.track;

    initCodexAnalyticsBridge(win);

    expect(win.__codexAnalytics.track).toBe(firstTrack);
  });

  it("is a no-op when no window-like object is available", () => {
    expect(() => initCodexAnalyticsBridge(undefined)).not.toThrow();
  });
});

describe("resetCodexAnalyticsBridge", () => {
  beforeEach(() => {
    resetCodexAnalyticsBridge();
  });

  it("removes window.__codexAnalytics.track so in-app calls stop reaching zaraz", () => {
    const track = vi.fn();
    const win: any = { zaraz: { track } };

    initCodexAnalyticsBridge(win);
    win.__codexAnalytics.track("onboarding_funnel", { step: "vault_created" });
    expect(track).toHaveBeenCalledTimes(1);

    resetCodexAnalyticsBridge(win);

    expect(win.__codexAnalytics.track).toBeUndefined();
  });

  it("re-defines the hook if initCodexAnalyticsBridge is called again after a reset", () => {
    const track = vi.fn();
    const win: any = { zaraz: { track } };

    initCodexAnalyticsBridge(win);
    resetCodexAnalyticsBridge(win);
    initCodexAnalyticsBridge(win);
    win.__codexAnalytics.track("onboarding_funnel", { step: "vault_created" });

    expect(track).toHaveBeenCalledTimes(1);
  });
});
