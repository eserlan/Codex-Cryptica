import { describe, expect, it, vi } from "vitest";
import { GeneratorEngineBase } from "./generator-engine-base";
import { GeneratorEngineCore } from "./generator-engine-core";
import { GeneratorEngineWorldbuilding } from "./generator-engine-worldbuilding";
import { GeneratorEngineSpecialized } from "./generator-engine-specialized";

const clientManager = { getModel: vi.fn() };

describe("generator engine modules", () => {
  it("keeps shared preview transport available from the base module", async () => {
    const engine = new GeneratorEngineBase(clientManager as never);
    const preview = vi.fn();
    await expect(
      engine.generateWithPreview(async () => "ready", preview),
    ).resolves.toBe("ready");
    expect(preview).not.toHaveBeenCalled();
  });

  it("provides core generators through its focused module", async () => {
    const engine = new GeneratorEngineCore(clientManager as never);
    expect(engine.generateName()).toEqual(expect.any(String));
    await expect(engine.generateNPC({ useAI: false })).resolves.toHaveProperty(
      "title",
    );
  });

  it("provides worldbuilding generators through its focused module", async () => {
    const engine = new GeneratorEngineWorldbuilding(clientManager as never);
    await expect(
      engine.generateNames({ useAI: false }),
    ).resolves.toHaveProperty("title");
  });

  it("provides specialized generators through its focused module", async () => {
    const engine = new GeneratorEngineSpecialized(clientManager as never);
    await expect(
      engine.generatePlotTwist({ useAI: false }),
    ).resolves.toHaveProperty("title");
  });
});
