import { describe, expect, it } from "vitest";
import type { SessionEntity } from "generator-engine";
import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
import {
  buildGeneratorSavePayload,
  buildHubSaveDrafts,
} from "./generator-save";

const baseOutput: GeneratorOutput = {
  type: "location",
  title: "The Hollow Crown",
  summary: "A fallen order.",
  content: "The order once ruled the city.",
  lore: "A sanctuary lies beneath the city.",
  labels: ["faction"],
  status: "draft",
};

describe("generator save payloads", () => {
  it("builds a normal vault payload from the rendered document layout", () => {
    expect(
      buildGeneratorSavePayload(baseOutput, {
        content: "## Control\n\nThey command the gates.",
        lore: "The sanctuary lies beneath the city.",
      }),
    ).toMatchObject({
      type: "location",
      content: "*A fallen order.*\n\n## Control\n\nThey command the gates.",
      lore: "The sanctuary lies beneath the city.",
    });
  });

  it("keeps adventure lore in the vault and omits empty map images", () => {
    const adventure = {
      ...baseOutput,
      kind: "adventure",
      labels: ["adventure"],
    } satisfies GeneratorOutput;

    expect(
      buildGeneratorSavePayload(adventure, {
        content: "## Scenario",
        lore: "Unused rendered lore",
      }),
    ).toEqual({
      type: "note",
      kind: "adventure",
      title: "The Hollow Crown",
      content: "*A fallen order.*",
      lore: "The order once ruled the city.\n\nA sanctuary lies beneath the city.",
      labels: ["adventure"],
      status: "draft",
    });
  });

  it("resolves only provenance references that are present in the saved selection", () => {
    const first: SessionEntity = {
      id: "one",
      type: "note",
      title: "First",
      content: "One",
      lore: "",
      labels: [],
      status: "draft",
      reuseEnabled: true,
      pinned: false,
      createdOrder: 1,
    };
    const second = { ...first, id: "two", title: "Second", createdOrder: 2 };

    const drafts = buildHubSaveDrafts(
      [second],
      { two: { resultEntityId: "two", usedEntityIds: ["one", "missing"] } },
      [first, second],
    );

    expect(drafts[0].references).toEqual(["First"]);
  });
});
