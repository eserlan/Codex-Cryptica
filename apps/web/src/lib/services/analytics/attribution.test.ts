import { describe, it, expect } from "vitest";
import { AttributionStore } from "./attribution";

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

function urlWith(path: string, params: Record<string, string> = {}) {
  const url = new URL(`https://codexcryptica.com${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url;
}

describe("AttributionStore", () => {
  it("no-ops entirely when the URL carries no utm_* param", () => {
    const { storage } = makeStorage();
    const store = new AttributionStore({ storage, now: () => 100 });

    expect(store.captureIfAttributed(urlWith("/generators/npc"))).toBe(false);
    expect(store.getFirstTouch()).toBeNull();
    expect(store.getLatestTouch()).toBeNull();
  });

  it("captures first-touch and latest-touch on the first attributed visit", () => {
    const { storage } = makeStorage();
    const store = new AttributionStore({ storage, now: () => 100 });

    const captured = store.captureIfAttributed(
      urlWith("/generators/npc", {
        utm_source: "reddit",
        utm_medium: "post",
        utm_campaign: "launch",
      }),
    );

    expect(captured).toBe(true);
    const expected = {
      utm_source: "reddit",
      utm_medium: "post",
      utm_campaign: "launch",
      landing_path: "/generators/npc",
      at: 100,
    };
    expect(store.getFirstTouch()).toEqual(expected);
    expect(store.getLatestTouch()).toEqual(expected);
  });

  it("never overwrites first-touch, but always updates latest-touch", () => {
    const { storage } = makeStorage();
    const store = new AttributionStore({ storage, now: () => 100 });
    store.captureIfAttributed(
      urlWith("/generators/npc", { utm_source: "reddit" }),
    );

    const store2 = new AttributionStore({ storage, now: () => 200 });
    store2.captureIfAttributed(
      urlWith("/generators/faction", { utm_source: "twitter" }),
    );

    expect(store2.getFirstTouch()).toEqual(
      expect.objectContaining({ utm_source: "reddit", at: 100 }),
    );
    expect(store2.getLatestTouch()).toEqual(
      expect.objectContaining({ utm_source: "twitter", at: 200 }),
    );
  });

  it("only captures params actually present, omitting the rest", () => {
    const { storage } = makeStorage();
    const store = new AttributionStore({ storage, now: () => 100 });

    store.captureIfAttributed(
      urlWith("/generators/npc", { utm_source: "reddit" }),
    );

    const attribution = store.getFirstTouch();
    expect(attribution?.utm_source).toBe("reddit");
    expect(attribution?.utm_medium).toBeUndefined();
    expect(attribution?.utm_campaign).toBeUndefined();
  });

  it("treats a present-but-empty utm_* param as no attribution", () => {
    const { storage } = makeStorage();
    const store = new AttributionStore({ storage, now: () => 100 });

    const captured = store.captureIfAttributed(
      urlWith("/generators/npc", { utm_source: "" }),
    );

    expect(captured).toBe(false);
    expect(store.getFirstTouch()).toBeNull();
    expect(store.getLatestTouch()).toBeNull();
  });

  it("captures a recognised AI referrer without UTM parameters", () => {
    const { storage } = makeStorage();
    const store = new AttributionStore({ storage, now: () => 100 });

    expect(
      store.captureIfAttributed(
        urlWith("/answers/example"),
        "https://chatgpt.com/c/example",
      ),
    ).toBe(true);

    expect(store.getLatestTouch()).toEqual({
      channel: "ai_referral",
      provider: "openai",
      source: "chatgpt",
      landing_path: "/answers/example",
      at: 100,
    });
  });

  it("keeps generic search referrals out of AI attribution", () => {
    const { storage } = makeStorage();
    const store = new AttributionStore({ storage, now: () => 100 });

    expect(
      store.captureIfAttributed(
        urlWith("/answers/example"),
        "https://www.google.com/search?q=campaign",
      ),
    ).toBe(false);
    expect(store.getLatestTouch()).toBeNull();
  });

  it("preserves UTM values while using the recognised AI campaign source", () => {
    const { storage } = makeStorage();
    const store = new AttributionStore({ storage, now: () => 100 });

    store.captureIfAttributed(
      urlWith("/answers/example", {
        utm_source: "chatgpt.com",
        utm_medium: "referral",
      }),
      "https://perplexity.ai/search/example",
    );

    expect(store.getLatestTouch()).toEqual({
      utm_source: "chatgpt.com",
      utm_medium: "referral",
      channel: "ai_referral",
      provider: "openai",
      source: "chatgpt",
      landing_path: "/answers/example",
      at: 100,
    });
  });

  it("ignores corrupt persisted state and treats it as no attribution", () => {
    const { storage } = makeStorage({
      "codex-cryptica-attribution-first": "not json",
      "codex-cryptica-attribution-latest": "not json",
    });
    const store = new AttributionStore({ storage });

    expect(store.getFirstTouch()).toBeNull();
    expect(store.getLatestTouch()).toBeNull();
  });

  it("reset clears both stored attributions", () => {
    const { storage } = makeStorage();
    const store = new AttributionStore({ storage, now: () => 100 });
    store.captureIfAttributed(
      urlWith("/generators/npc", { utm_source: "reddit" }),
    );

    store.reset();

    expect(store.getFirstTouch()).toBeNull();
    expect(store.getLatestTouch()).toBeNull();
  });
});
