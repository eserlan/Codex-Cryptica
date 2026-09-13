import { describe, expect, it, vi } from "vitest";
import { trackEvent } from "$lib/services/analytics/zaraz-analytics";
import {
  trackGeneratorShareCreated,
  trackGeneratorShareOpened,
} from "./generator-share-tracking";

vi.mock("$lib/services/analytics/zaraz-analytics", () => ({
  trackEvent: vi.fn(),
}));

describe("generator share tracking", () => {
  it("records creation without sending generated content", () => {
    trackGeneratorShareCreated({
      generatorType: "npc",
      source: "current_output",
    });

    expect(trackEvent).toHaveBeenCalledWith("generator_share_created", {
      generator_type: "npc",
      source: "current_output",
    });
    expect(trackEvent).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ content: expect.anything() }),
    );
  });

  it("identifies the shared snapshot when it is opened", () => {
    trackGeneratorShareOpened({
      generatorType: "faction",
      source: "current_output",
      shareId: "share-1",
    });

    expect(trackEvent).toHaveBeenCalledWith(
      "generator_share_opened",
      expect.objectContaining({
        generator_type: "faction",
        share_id: "share-1",
      }),
    );
  });
});
