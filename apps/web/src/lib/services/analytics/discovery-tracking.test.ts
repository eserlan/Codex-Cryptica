import { describe, it, expect, vi } from "vitest";
import {
  trackDiscoveryPageViewed,
  trackDiscoveryClick,
  classifyDiscoveryTarget,
  createDiscoveryViewGuard,
} from "./discovery-tracking";

describe("trackDiscoveryPageViewed", () => {
  it("emits discovery_page_viewed with source and path", () => {
    const track = vi.fn();

    trackDiscoveryPageViewed(
      {
        sourceKind: "answer",
        sourceId: "how-do-you-organise-rpg-campaign-notes",
        path: "/answers/how-do-you-organise-rpg-campaign-notes",
      },
      { zaraz: { track } },
    );

    expect(track).toHaveBeenCalledWith(
      "discovery_page_viewed",
      expect.objectContaining({
        source_kind: "answer",
        source_id: "how-do-you-organise-rpg-campaign-notes",
        path: "/answers/how-do-you-organise-rpg-campaign-notes",
      }),
    );
  });

  it("no-ops silently when window.zaraz is absent", () => {
    expect(() =>
      trackDiscoveryPageViewed(
        { sourceKind: "example", sourceId: "x", path: "/examples/x" },
        {},
      ),
    ).not.toThrow();
  });
});

describe("trackDiscoveryClick", () => {
  it("emits discovery_click with source, target and placement", () => {
    const track = vi.fn();

    trackDiscoveryClick(
      {
        sourceKind: "answer",
        sourceId: "how-do-you-organise-rpg-campaign-notes",
        targetKind: "generator",
        targetId: "npc",
        placement: "related_tool",
      },
      { zaraz: { track } },
    );

    expect(track).toHaveBeenCalledWith(
      "discovery_click",
      expect.objectContaining({
        source_kind: "answer",
        source_id: "how-do-you-organise-rpg-campaign-notes",
        target_kind: "generator",
        target_id: "npc",
        placement: "related_tool",
      }),
    );
  });

  it("no-ops silently when window.zaraz is absent", () => {
    expect(() =>
      trackDiscoveryClick(
        {
          sourceKind: "example",
          sourceId: "x",
          targetKind: "app",
          targetId: "/solutions/campaign-manager",
          placement: "section_cta",
        },
        {},
      ),
    ).not.toThrow();
  });
});

describe("classifyDiscoveryTarget", () => {
  it.each([
    ["/generators/npc", "generator", "npc"],
    ["/answers/what-is-a-point-crawl", "answer", "what-is-a-point-crawl"],
    [
      "/examples/the-cinder-wren-space-western-ship",
      "example",
      "the-cinder-wren-space-western-ship",
    ],
    ["/for/dungeons-and-dragons", "for", "dungeons-and-dragons"],
    ["/vs/world-anvil", "comparison", "world-anvil"],
    ["/alternatives/world-anvil", "comparison", "world-anvil"],
    ["/import/world-anvil", "importer", "world-anvil"],
    ["/migrations/obsidian", "importer", "obsidian"],
  ] as const)("classifies %s as %s/%s", (href, targetKind, targetId) => {
    expect(classifyDiscoveryTarget(href)).toEqual({ targetKind, targetId });
  });

  it("treats other internal product pages as app", () => {
    expect(classifyDiscoveryTarget("/solutions/campaign-manager")).toEqual({
      targetKind: "app",
      targetId: "campaign-manager",
    });
    expect(
      classifyDiscoveryTarget("/features/local-first-rpg-campaign-manager"),
    ).toEqual({
      targetKind: "app",
      targetId: "local-first-rpg-campaign-manager",
    });
  });

  it("treats a bare root path as app", () => {
    expect(classifyDiscoveryTarget("/")).toEqual({
      targetKind: "app",
      targetId: "/",
    });
  });

  it("treats an absolute URL as external, keyed by the full URL", () => {
    expect(classifyDiscoveryTarget("https://groupfinder.gg/list")).toEqual({
      targetKind: "external",
      targetId: "https://groupfinder.gg/list",
    });
  });

  it("strips query strings and hashes before classifying", () => {
    expect(
      classifyDiscoveryTarget("/generators/npc?utm_source=answer#section"),
    ).toEqual({ targetKind: "generator", targetId: "npc" });
  });
});

describe("createDiscoveryViewGuard", () => {
  it("allows the first id through", () => {
    const guard = createDiscoveryViewGuard();
    expect(guard("a")).toBe(true);
  });

  it("blocks a repeat of the same id", () => {
    const guard = createDiscoveryViewGuard();
    guard("a");
    expect(guard("a")).toBe(false);
  });

  it("allows a new id after a different one was seen", () => {
    const guard = createDiscoveryViewGuard();
    guard("a");
    expect(guard("b")).toBe(true);
  });

  it("re-allows an id after an intervening different id (in-place route navigation)", () => {
    const guard = createDiscoveryViewGuard();
    guard("a");
    guard("b");
    expect(guard("a")).toBe(true);
  });

  it("keeps separate guards independent", () => {
    const guardA = createDiscoveryViewGuard();
    const guardB = createDiscoveryViewGuard();
    guardA("x");
    expect(guardB("x")).toBe(true);
  });
});
