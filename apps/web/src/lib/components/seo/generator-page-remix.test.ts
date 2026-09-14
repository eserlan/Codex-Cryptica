import { describe, expect, it, vi } from "vitest";
import {
  loadGeneratorRemixDraft,
  type GeneratorRemixLoaderOptions,
} from "./generator-page-remix";

interface ShareFixture {
  shareId: string;
  title: string;
  content: string;
  metadata: {
    generatorPath: string;
    labels?: string[];
    theme?: string;
  };
  createdAt: string;
  expiresAt: string;
}

function makeShare(overrides: Partial<ShareFixture> = {}): ShareFixture {
  return {
    shareId: "share-1",
    title: "Shared result",
    content: "# Shared result\n*Brief summary*\nLabels: ally\n\nThe content.",
    metadata: {
      generatorPath: "/generators/npc",
      labels: ["ally"],
      theme: "fantasy",
    },
    createdAt: "2026-09-14T00:00:00.000Z",
    expiresAt: "2026-09-21T00:00:00.000Z",
    ...overrides,
  };
}

function options(
  getShared: GeneratorRemixLoaderOptions["getShared"],
  overrides: Partial<GeneratorRemixLoaderOptions> = {},
): GeneratorRemixLoaderOptions {
  return {
    remixId: "share-1",
    targetPath: "/generators/npc",
    loadVersion: 1,
    getCurrentLoadVersion: () => 1,
    getShared,
    ...overrides,
  };
}

describe("loadGeneratorRemixDraft", () => {
  it("parses a matching share and resolves its theme", async () => {
    const result = await loadGeneratorRemixDraft(
      options(vi.fn().mockResolvedValue(makeShare())),
    );

    expect(result).toEqual({
      draft: {
        type: "note",
        title: "Shared result",
        summary: "Brief summary",
        content: "The content.",
        lore: "",
        labels: ["ally"],
        status: "draft",
      },
      theme: "Classic Fantasy",
    });
  });

  it("ignores missing, mismatched, stale, and failed shares", async () => {
    const cases = [
      options(vi.fn().mockResolvedValue(null)),
      options(
        vi
          .fn()
          .mockResolvedValue(
            makeShare({ metadata: { generatorPath: "/generators/quest" } }),
          ),
      ),
      options(vi.fn().mockResolvedValue(makeShare()), {
        getCurrentLoadVersion: () => 2,
      }),
      options(vi.fn().mockRejectedValue(new Error("offline"))),
    ];

    for (const loaderOptions of cases) {
      await expect(loadGeneratorRemixDraft(loaderOptions)).resolves.toBeNull();
    }
  });
});
