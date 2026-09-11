/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { DefaultGeneratorEngine } from "./generator-engine";

describe("DefaultGeneratorEngine world generation", () => {
  let clientManager: { getModel: ReturnType<typeof vi.fn> };
  let engine: DefaultGeneratorEngine;

  beforeEach(() => {
    clientManager = { getModel: vi.fn() };
    engine = new DefaultGeneratorEngine(clientManager as any);
  });

  it("generates a local sci-fi world without requiring AI", async () => {
    const output = await engine.generateWorld({
      worldType: "Ocean World",
      habitability: "Earthlike",
      civilisation: "Colony",
      genre: "Hard Sci-Fi",
      dominantFeature: "a planet-wide storm system",
      useAI: false,
    });

    expect(output.type).toBe("location");
    expect(output.content).toContain("## World Profile");
    expect(output.labels).toContain("ocean-world");
    expect(clientManager.getModel).not.toHaveBeenCalled();
  });

  it("falls back to a local world when AI returns malformed data", async () => {
    clientManager.getModel.mockResolvedValue({
      generateContent: vi.fn().mockResolvedValue({
        response: { text: () => "not valid JSON" },
      }),
    });

    const output = await engine.generateWorld({ useAI: true });

    expect(output.aiFallback).toBe(true);
    expect(output.content).toContain("## World Profile");
  });
});
