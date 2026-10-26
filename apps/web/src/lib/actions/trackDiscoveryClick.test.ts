/** @vitest-environment jsdom */

import { describe, it, expect, vi } from "vitest";
import { trackDiscoveryClick } from "./trackDiscoveryClick";
import * as discoveryTracking from "$lib/services/analytics/discovery-tracking";

describe("trackDiscoveryClick action", () => {
  it("fires trackDiscoveryClick with the given params on a real click", () => {
    const spy = vi.spyOn(discoveryTracking, "trackDiscoveryClick");
    const node = document.createElement("a");
    const params = {
      sourceKind: "answer" as const,
      sourceId: "how-do-you-organise-rpg-campaign-notes",
      targetKind: "generator" as const,
      targetId: "npc",
      placement: "related_tool",
    };

    const action = trackDiscoveryClick(node, params);
    node.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(spy).toHaveBeenCalledWith(params);
    action.destroy();
    spy.mockRestore();
  });

  it("does not fire before a click", () => {
    const spy = vi.spyOn(discoveryTracking, "trackDiscoveryClick");
    const node = document.createElement("a");

    const action = trackDiscoveryClick(node, {
      sourceKind: "example",
      sourceId: "x",
      targetKind: "app",
      targetId: "/solutions/campaign-manager",
      placement: "section_cta",
    });

    expect(spy).not.toHaveBeenCalled();
    action.destroy();
    spy.mockRestore();
  });

  it("uses the updated params after update() is called", () => {
    const spy = vi.spyOn(discoveryTracking, "trackDiscoveryClick");
    const node = document.createElement("a");

    const action = trackDiscoveryClick(node, {
      sourceKind: "example",
      sourceId: "first",
      targetKind: "app",
      targetId: "/solutions/campaign-manager",
      placement: "section_cta",
    });

    action.update?.({
      sourceKind: "example",
      sourceId: "second",
      targetKind: "app",
      targetId: "/solutions/campaign-manager",
      placement: "section_cta",
    });
    node.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ sourceId: "second" }),
    );
    action.destroy();
    spy.mockRestore();
  });

  it("stops firing after destroy()", () => {
    const spy = vi.spyOn(discoveryTracking, "trackDiscoveryClick");
    const node = document.createElement("a");

    const action = trackDiscoveryClick(node, {
      sourceKind: "example",
      sourceId: "x",
      targetKind: "app",
      targetId: "/solutions/campaign-manager",
      placement: "section_cta",
    });
    action.destroy();
    node.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
