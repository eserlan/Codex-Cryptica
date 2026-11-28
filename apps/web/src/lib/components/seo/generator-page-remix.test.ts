import { describe, expect, it, vi } from "vitest";
import {
  loadGeneratorRemixDraft,
  createGeneratorRemixLoader,
  type GeneratorRemixLoaderOptions,
} from "./generator-page-remix";
import { getGeneratorDocumentLayout } from "./generator-document-layout";
import { buildGeneratorSavePayload } from "./generator-save";

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
        type: "character",
        title: "Shared result",
        summary: "",
        content: "",
        lore: "*Brief summary*\n\nThe content.",
        labels: ["ally"],
        status: "draft",
      },
      theme: "Classic Fantasy",
    });
  });

  it.each(["/generators/npc", "/tools/rpg-npc-generator"])(
    "restores %s as a private Character rather than exposing an unrecoverable share split",
    async (targetPath) => {
      const share = makeShare({
        content:
          "# Shared guard\n*Secret summary*\nLabels: npc-generator\n\n### Secrets & Hooks\nThe manifest is forged.",
        metadata: { generatorPath: targetPath, labels: ["npc-generator"] },
      });
      const result = await loadGeneratorRemixDraft(
        options(vi.fn().mockResolvedValue(share), { targetPath }),
      );
      const draft = result!.draft;
      const payload = buildGeneratorSavePayload(
        draft,
        getGeneratorDocumentLayout(draft),
        undefined,
        targetPath.split("/").at(-1),
      );
      expect(payload).toMatchObject({
        type: "character",
        content: "",
        lore: "*Secret summary*\n\n### Secrets & Hooks\nThe manifest is forged.",
      });
    },
  );

  it("restores a BBEG share as one Character with concatenated text in GM notes", async () => {
    const share = makeShare({
      content:
        "# Shared villain\n*Secret summary*\nLabels: villain\n\n### Public Face\nA governor.\n\n### True Nature\nThe governor plans a diversion.",
      metadata: {
        generatorPath: "/generators/bbeg-generator",
        labels: ["villain", "bbeg-generator"],
      },
    });
    const result = await loadGeneratorRemixDraft(
      options(vi.fn().mockResolvedValue(share), {
        targetPath: "/generators/bbeg-generator",
      }),
    );
    expect(result?.draft).toMatchObject({
      type: "character",
      content: "",
      summary: "",
      lore: "*Secret summary*\n\n### Public Face\nA governor.\n\n### True Nature\nThe governor plans a diversion.",
      labels: share.metadata.labels,
    });
    const draft = result!.draft;
    const preview = getGeneratorDocumentLayout(draft);
    expect(preview.content).toContain("The governor plans a diversion.");
    const payload = buildGeneratorSavePayload(
      draft,
      preview,
      undefined,
      "bbeg-generator",
    );
    expect(payload).toMatchObject({
      type: "character",
      content: "",
      lore: draft.lore,
      labels: share.metadata.labels,
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

describe("successive remix route loads", () => {
  function loader(getShared = vi.fn().mockResolvedValue(makeShare())) {
    const onReset = vi.fn();
    const onLoaded = vi.fn();
    return {
      getShared,
      onReset,
      onLoaded,
      load: createGeneratorRemixLoader({ getShared, onReset, onLoaded }),
    };
  }

  it("clears the previous draft and publishes a matching result", async () => {
    const state = loader();
    await state.load("share-1", "/generators/npc");
    expect(state.onReset).toHaveBeenCalledOnce();
    expect(state.onLoaded).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        theme: "Classic Fantasy",
        draft: expect.objectContaining({ title: "Shared result" }),
      }),
    );
    expect(state.onReset.mock.invocationCallOrder[0]).toBeLessThan(
      state.onLoaded.mock.invocationCallOrder[0]!,
    );
  });

  it("drops an older result after a newer route loads", async () => {
    let finish!: (value: ShareFixture) => void;
    const getShared = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValueOnce(makeShare({ title: "New result" }));
    const state = loader(getShared);
    const old = state.load("old", "/generators/npc");
    await state.load("new", "/generators/npc");
    finish(makeShare());
    await old;
    expect(state.onLoaded).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        draft: expect.objectContaining({ title: "New result" }),
      }),
    );
    expect(state.onReset).toHaveBeenCalledTimes(2);
  });

  it("invalidates a pending share when navigating to a route without a remix", async () => {
    let finish!: (value: ShareFixture) => void;
    const state = loader(
      vi.fn(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      ),
    );
    const pending = state.load("old", "/generators/npc");
    await state.load(null, "/generators/quest");
    finish(makeShare());
    await pending;
    expect(state.getShared).toHaveBeenCalledOnce();
    expect(state.onLoaded).not.toHaveBeenCalled();
    expect(state.onReset).toHaveBeenCalledTimes(2);
  });

  it("leaves the normal page usable after a share fails", async () => {
    const state = loader(vi.fn().mockRejectedValue(new Error("offline")));
    await expect(
      state.load("missing", "/generators/npc"),
    ).resolves.toBeUndefined();
    expect(state.onReset).toHaveBeenCalledOnce();
    expect(state.onLoaded).not.toHaveBeenCalled();
  });
});

it("restores a faction share as one Faction without guessing its public/GM split", async () => {
  const targetPath = "/generators/faction";
  const share = makeShare({
    content:
      "# Shared guild\n*Secret summary*\nLabels: faction-generator\n\n### Secrets & Hooks\nThe charter is forged.",
    metadata: { generatorPath: targetPath, labels: ["faction-generator"] },
  });
  const result = await loadGeneratorRemixDraft(
    options(vi.fn().mockResolvedValue(share), { targetPath }),
  );
  const draft = result!.draft;
  expect(
    buildGeneratorSavePayload(
      draft,
      getGeneratorDocumentLayout(draft),
      undefined,
      "faction",
    ),
  ).toMatchObject({
    type: "faction",
    content: "",
    lore: "*Secret summary*\n\n### Secrets & Hooks\nThe charter is forged.",
  });
});
