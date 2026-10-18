import { describe, expect, it, vi } from "vitest";
import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
import {
  buildAdventureCanvasTransfer,
  buildDelveCanvasTransfer,
} from "./generator-canvas-transfer";

const generated: GeneratorOutput = {
  type: "location",
  title: "The Sunken Archive",
  summary: "A library beneath the tide.",
  content: "### Entry\nA bronze door.",
  lore: "### Secret\nThe shelves move.",
  labels: ["dungeon"],
  status: "draft",
};

describe("generator canvas transfer builders", () => {
  it("maps a generated Delve and its document layout into the import handoff", () => {
    const canvas = { name: "Sunken Archive", nodes: [], edges: [] };
    const buildCanvas = vi.fn(() => canvas);

    const transfer = buildDelveCanvasTransfer(generated, buildCanvas);

    expect(buildCanvas).toHaveBeenCalledWith(generated);
    expect(transfer).toMatchObject({
      version: 1,
      canvas,
      sourceEntity: {
        type: "location",
        kind: "dungeon",
        title: generated.title,
        content: `*${generated.summary}*\n\n${generated.content}`,
        lore: generated.lore,
        labels: generated.labels,
        status: "draft",
      },
    });
  });

  it("maps an adventure into a note handoff with summary content and full source lore", () => {
    const canvas = { name: "The Sunken Archive", nodes: [], edges: [] };
    const buildCanvas = vi.fn(() => canvas);

    const transfer = buildAdventureCanvasTransfer(generated, buildCanvas);

    expect(buildCanvas).toHaveBeenCalledWith(generated);
    expect(transfer).toMatchObject({
      version: 1,
      canvas,
      sourceEntity: {
        type: "note",
        kind: "adventure",
        title: generated.title,
        content: `*${generated.summary}*`,
        lore: `${generated.content}\n\n${generated.lore}`,
        labels: generated.labels,
        status: "draft",
      },
    });
  });

  it("keeps summary-free adventures valid with empty content", () => {
    const transfer = buildAdventureCanvasTransfer(
      { ...generated, summary: undefined },
      () => ({ nodes: [] }),
    );

    expect(transfer.sourceEntity.content).toBe("");
  });
});
