import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
import type { SessionEntity } from "generator-engine";
import {
  saveGeneratorOutput,
  saveSessionHubEntities,
} from "./generator-save-flow";

const output: GeneratorOutput = {
  type: "location",
  title: "The Hollow Crown",
  summary: "A fallen order.",
  content: "Raw content",
  lore: "Raw lore",
  labels: [],
  status: "draft",
};

function dependencies() {
  return {
    store: vi.fn(),
    track: vi.fn(),
    countRelatedEntities: vi.fn().mockReturnValue(2),
  };
}

describe("generator save flows", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("persists and tracks an output with its optional diagram", async () => {
    const deps = dependencies();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const exportMap = vi.fn().mockResolvedValue("data:image/png;base64,abc");

    const query = await saveGeneratorOutput(
      output,
      { content: "Rendered content", lore: "Rendered lore" },
      "locations",
      deps,
      exportMap,
    );

    expect(query).toContain("utm_source=generator-location");
    expect(JSON.parse(deps.store.mock.calls[0][1])).toMatchObject({
      title: output.title,
      mapImageDataUrl: "data:image/png;base64,abc",
    });
    expect(deps.track).toHaveBeenCalledWith({
      generatorType: "locations",
      isHubBatch: false,
      itemCount: 1,
      relatedEntityCount: 2,
    });
    expect(log).not.toHaveBeenCalled();
  });

  it("continues saving when diagram export fails, but rejects storage failures", async () => {
    const deps = dependencies();
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      saveGeneratorOutput(
        output,
        { content: "Rendered", lore: "" },
        "locations",
        deps,
        async () => {
          throw new Error("diagram failed");
        },
      ),
    ).resolves.toContain("utm_medium=save-to-vault");
    expect(JSON.parse(deps.store.mock.calls[0][1])).not.toHaveProperty(
      "mapImageDataUrl",
    );

    deps.store.mockImplementation(() => {
      throw new Error("storage blocked");
    });
    await expect(
      saveGeneratorOutput(output, { content: "", lore: "" }, "locations", deps),
    ).rejects.toThrow("storage blocked");
    expect(deps.track).toHaveBeenCalledOnce();
  });

  it("saves hub drafts and their provenance based related-entity counts", () => {
    const deps = dependencies();
    const entity: SessionEntity = {
      id: "one",
      type: "note",
      title: "One",
      content: "Draft",
      lore: "",
      labels: [],
      status: "draft",
      reuseEnabled: true,
      pinned: false,
      createdOrder: 1,
    };

    const query = saveSessionHubEntities(
      [entity],
      {},
      [entity],
      "locations",
      deps,
    );

    expect(query).toContain("utm_medium=save-all");
    expect(JSON.parse(deps.store.mock.calls[0][1])).toHaveLength(1);
    expect(deps.track).toHaveBeenCalledWith({
      generatorType: "locations",
      isHubBatch: true,
      itemCount: 1,
      relatedEntityCount: 2,
    });
  });
});
