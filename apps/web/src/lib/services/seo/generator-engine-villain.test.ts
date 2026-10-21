import { afterEach, describe, expect, it, vi } from "vitest";
import { GeneratorEngineCore } from "./generator-engine-core";
import {
  VALID_CONCEPT,
  VALID_ENDING,
  VALID_ORGANISATION,
  VALID_PLAN,
} from "../../../../../../packages/generator-engine/src/villain-staged.fixtures";

type RunModel = {
  runModel: (
    instruction: string,
    message: string,
    config?: unknown,
    emitPreview?: boolean,
    signal?: AbortSignal,
  ) => Promise<string>;
};

const clientManager = { getModel: vi.fn() };

function stageReply(message: string) {
  if (message.includes("STAGE 1 OF 4")) return VALID_CONCEPT;
  if (message.includes("STAGE 2 OF 4")) return VALID_ORGANISATION;
  if (message.includes("STAGE 3 OF 4")) return VALID_PLAN;
  if (message.includes("STAGE 4 OF 4")) return VALID_ENDING;
  if (message.includes("Coherence review of a finished villain.")) {
    return { verdict: "clean", issues: [] };
  }
  throw new Error(`Unexpected message: ${message.slice(0, 80)}`);
}

const onePass = JSON.stringify({
  title: "One Pass Villain",
  conflictDomain: "Cult Ritual",
  content: "### Public Face\nA preacher.",
  lore: "### Core Concept\nA preacher.",
  labels: ["villain", "bbeg-generator", "imported-draft"],
});

function engineWith(reply: (message: string) => string) {
  const engine = new GeneratorEngineCore(clientManager as never);
  const runModel = vi
    .spyOn(engine as unknown as RunModel, "runModel")
    .mockImplementation(async (_instruction, message) => reply(message));
  return { engine, runModel };
}

describe("staged villain generation", () => {
  it("writes the villain in stages and reports progress", async () => {
    const { engine, runModel } = engineWith((m) =>
      JSON.stringify(stageReply(m)),
    );
    const onProgress = vi.fn();
    const output = await engine.generateVillain({
      useAI: true,
      archetype: "Corrupt Ruler",
      onProgress,
    });
    expect(runModel).toHaveBeenCalledTimes(5);
    expect(output.title).toBe("Ottoline Brack, the Quiet Toll");
    expect(output.conflictDomain).toBe("Harbour Politics");
    expect(
      onProgress.mock.calls
        .at(-1)?.[0]
        .map((s: { status: string }) => s.status),
    ).toEqual(["done", "done", "done", "done", "done"]);
  });

  it("falls back to the one-pass route when a stage cannot be used", async () => {
    const { engine, runModel } = engineWith((m) =>
      m.includes("STAGE 1 OF 4") ? "nope" : onePass,
    );
    const output = await engine.generateVillain({ useAI: true });
    // Two failed stage 1 attempts, then the one-pass call.
    expect(runModel).toHaveBeenCalledTimes(3);
    expect(output.title).toBe("One Pass Villain");
  });

  it("keeps the one-pass route when staged is false", async () => {
    const { engine, runModel } = engineWith(() => onePass);
    const controller = new AbortController();
    const output = await engine.generateVillain({
      useAI: true,
      staged: false,
      signal: controller.signal,
    });
    expect(runModel).toHaveBeenCalledTimes(1);
    expect(runModel.mock.calls[0][4]).toBe(controller.signal);
    expect(output.title).toBe("One Pass Villain");
  });

  it("uses local generation without AI and never calls the model", async () => {
    const { engine, runModel } = engineWith(() => onePass);
    const output = await engine.generateVillain({ useAI: false });
    expect(runModel).not.toHaveBeenCalled();
    expect(output.lore).toContain("### Fatal Flaw");
  });

  it("passes the signal to every stage call and stops when cancelled", async () => {
    const controller = new AbortController();
    const engine = new GeneratorEngineCore(clientManager as never);
    const runModel = vi
      .spyOn(engine as unknown as RunModel, "runModel")
      .mockImplementation(async (_i, message, _c, _p, signal) => {
        expect(signal).toBe(controller.signal);
        if (message.includes("STAGE 2 OF 4")) controller.abort();
        return JSON.stringify(stageReply(message));
      });
    await expect(
      engine.generateVillain({ useAI: true, signal: controller.signal }),
    ).rejects.toBeDefined();
    expect(runModel).toHaveBeenCalledTimes(2);
  });

  it("logs staged counts without generated text", async () => {
    const { engine } = engineWith((m) => JSON.stringify(stageReply(m)));
    const logger = vi.spyOn(console, "debug").mockImplementation(() => {});
    await engine.generateVillain({ useAI: true });
    expect(logger).toHaveBeenCalledWith(
      "[VillainStagedStats]",
      expect.objectContaining({ outcome: "staged", aiCalls: 5 }),
    );
    expect(JSON.stringify(logger.mock.calls)).not.toContain("Brack");
    logger.mockRestore();
  });
});

describe("staged villain diagnostics", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("../../config");
    vi.resetModules();
  });

  /** Runs a villain whose first stage is unusable and returns its step detail and debug logs. */
  async function failedFirstStage(env: { dev: boolean; staging: boolean }) {
    vi.resetModules();
    vi.stubEnv("DEV", env.dev);
    vi.doMock("../../config", () => ({ IS_STAGING: env.staging }));
    const { GeneratorEngineCore: Engine } =
      await import("./generator-engine-core");
    const engine = new Engine(clientManager as never);
    vi.spyOn(engine as unknown as RunModel, "runModel").mockImplementation(
      async (_i, message) =>
        message.includes("STAGE 1 OF 4") ? "nope" : onePass,
    );
    const logger = vi.spyOn(console, "debug").mockImplementation(() => {});
    const onProgress = vi.fn();
    await engine.generateVillain({ useAI: true, onProgress });
    const steps = onProgress.mock.calls.at(-1)?.[0] as { detail?: string }[];
    const logs = logger.mock.calls.length;
    logger.mockRestore();
    return { detail: steps[0].detail, logs };
  }

  it.each([
    ["staging", { dev: false, staging: true }],
    ["a dev build", { dev: true, staging: false }],
  ])("shows why a stage gave up on %s", async (_label, env) => {
    const { detail, logs } = await failedFirstStage(env);
    expect(detail).toBe(
      "writing it in one pass instead (the reply was not a usable JSON object)",
    );
    expect(logs).toBeGreaterThan(0);
  });

  it("hides the reason and the debug log in production", async () => {
    const { detail, logs } = await failedFirstStage({
      dev: false,
      staging: false,
    });
    expect(detail).toBe("writing it in one pass instead");
    expect(logs).toBe(0);
  });
});
