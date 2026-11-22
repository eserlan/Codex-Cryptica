/** @vitest-environment jsdom */

import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockGetModel, mockEnsurePublicAiSession } = vi.hoisted(() => ({
  mockGetModel: vi.fn(),
  mockEnsurePublicAiSession: vi.fn(),
}));

vi.mock("@codex/ai-engine", () => ({
  aiClientManager: {
    getModel: mockGetModel,
  },
}));

vi.mock("#lib/services/ai/public-session-bootstrap.js", () => ({
  ensurePublicAiSession: mockEnsurePublicAiSession,
}));

vi.mock("./oracle.svelte", () => ({
  oracle: {
    effectiveApiKey: "",
  },
}));

import { biomeExplorer } from "./biome-explorer-instance";

describe("biomeExplorer production wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetModel.mockResolvedValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              suggestions: [
                {
                  text: "Acidic ash settles in gullies",
                  note: "Slows foraging",
                },
              ],
            }),
        },
      }),
    });
  });

  it("runs ensurePublicAiSession before aiClientManager.getModel when suggesting without a BYOK key", async () => {
    biomeExplorer.startBlank();
    const alterationId = biomeExplorer.addAlteration({
      aspect: "climate",
      description: "Ashfall cools the canopy",
    });
    expect(alterationId).toBeTruthy();

    await biomeExplorer.requestSuggestions(alterationId!);

    expect(mockEnsurePublicAiSession).toHaveBeenCalledTimes(1);
    expect(mockGetModel).toHaveBeenCalledTimes(1);
    expect(mockEnsurePublicAiSession.mock.invocationCallOrder[0]).toBeLessThan(
      mockGetModel.mock.invocationCallOrder[0],
    );
  });
});
