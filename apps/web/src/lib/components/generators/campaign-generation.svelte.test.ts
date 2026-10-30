import { describe, expect, it, vi } from "vitest";
import type {
  GeneratedDraft,
  GenerationEvent,
  GeneratorRunRequest,
} from "generator-engine";
import { CampaignGeneration } from "./campaign-generation.svelte";

const draft: GeneratedDraft = {
  title: "Harbour",
  summary: "A harbour",
  lore: "Secret",
  labels: [],
  entityType: "location",
  sourceGeneratorId: "settlement",
  templateApplied: false,
};
const request = {
  generatorId: "settlement" as const,
  options: {},
  useAI: true,
};
const policy = () => ({ isEnabled: true, isAvailable: true });
type Event = GenerationEvent | { type: "draft"; draft: GeneratedDraft };

function setup(events: Event[] = [{ type: "draft", draft }]) {
  const deps = {
    requestBuilder: {
      build: vi.fn(async () => request as GeneratorRunRequest),
    },
    service: {
      generateDraftStream: vi.fn(async function* () {
        yield* events;
      }),
    },
    publishGeneratedCapture: vi.fn(),
    clock: { now: () => 123 },
  };
  const state = new CampaignGeneration(
    deps as unknown as ConstructorParameters<typeof CampaignGeneration>[0],
  );
  return { state, deps };
}

describe("campaign generation lifecycle", () => {
  it("accumulates partial JSON and string fields, clearing them for the next phase", async () => {
    const { state, deps } = setup();
    deps.service.generateDraftStream.mockImplementation(async function* () {
      yield { type: "delta", text: '{"title":"Har' };
      yield { type: "delta", text: 'bour"}' };
      expect(state.streamedFields.title).toBe("Harbour");
      yield { type: "field", key: "summary", value: "Preview" };
      yield { type: "field", key: "ignored", value: 42 };
      expect(state.streamedFields).toEqual({
        title: "Harbour",
        summary: "Preview",
      });
      yield { type: "phase", label: "Reviewing" };
      expect(state.streamedFields).toEqual({});
      expect(state.streamedJson).toBe("");
      expect(state.currentPhase).toBe("Reviewing");
      yield { type: "error", error: "AI unavailable" };
      expect(state.stage).toBe("generating");
      yield { type: "draft", draft };
    });
    await state.generate(request, null, policy);
    expect(state.stage).toBe("review");
    expect(state.draft?.title).toBe("Harbour");
    expect(state.errorMsg).toBeNull();
    expect(deps.publishGeneratedCapture).toHaveBeenCalledOnce();
  });

  it("reaches review even when the journal is unavailable", async () => {
    const { state, deps } = setup();
    deps.publishGeneratedCapture.mockImplementation(() => {
      throw new Error("unavailable");
    });
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    await state.generate(request, null, policy);
    expect(state.stage).toBe("review");
    logger.mockRestore();
  });

  it("surfaces a fatal request error and permits resetting the workflow", async () => {
    const { state, deps } = setup();
    deps.requestBuilder.build.mockRejectedValueOnce("offline");
    await state.generate(request, null, policy);
    expect(state.stage).toBe("error");
    expect(state.errorMsg).toBe("offline");
    state.reset();
    expect(state.stage).toBe("configure");
    expect(state.errorMsg).toBeNull();
    expect(state.draft).toBeNull();
  });

  it("blocks duplicate generation and ignores late events from a cancelled stream", async () => {
    const { state, deps } = setup();
    let release!: () => void;
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    deps.service.generateDraftStream.mockImplementation(async function* () {
      yield { type: "field", key: "title", value: "Preview" };
      await wait;
      yield { type: "draft", draft };
    });
    const running = state.generate(request, null, policy);
    await vi.waitFor(() => expect(state.streamedFields.title).toBe("Preview"));
    await state.generate(request, null, policy);
    expect(deps.requestBuilder.build).toHaveBeenCalledOnce();
    state.cancel();
    release();
    await running;
    expect(state.stage).toBe("configure");
    expect(state.streamedFields).toEqual({});
    expect(deps.publishGeneratedCapture).not.toHaveBeenCalled();
    state.stage = "saving";
    await state.generate(request, null, policy);
    expect(deps.requestBuilder.build).toHaveBeenCalledOnce();
  });

  it("ignores an abort rejection and keeps a newer run cancellable when the old run ends", async () => {
    const { state, deps } = setup();
    let rejectOld!: (reason: Error) => void;
    deps.requestBuilder.build.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectOld = reject;
        }),
    );
    const old = state.generate(request, null, policy);
    state.cancel();
    let release!: () => void;
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    deps.service.generateDraftStream.mockImplementation(async function* () {
      await wait;
      yield { type: "draft", draft };
    });
    const current = state.generate(request, null, policy);
    rejectOld(new Error("aborted"));
    await old;
    expect(state.stage).toBe("generating");
    state.cancel();
    release();
    await current;
    expect(state.stage).toBe("configure");
    expect(state.draft).toBeNull();
  });
});
