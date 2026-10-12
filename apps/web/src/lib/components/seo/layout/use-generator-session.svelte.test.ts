/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushSync } from "svelte";

const hub = vi.hoisted(() => ({
  addEntity: vi.fn(() => "entity-1"),
  addProvenance: vi.fn(),
}));
const track = vi.hoisted(() => vi.fn());

vi.mock("$app/environment", () => ({ browser: true, dev: false }));
vi.mock("$lib/stores/session-hub.svelte", () => ({ sessionHubStore: hub }));
vi.mock("$lib/stores/online.svelte", () => ({
  onlineStatus: { current: true },
}));
vi.mock("$lib/services/analytics/zaraz-analytics", () => ({
  trackEvent: track,
}));

import { useGeneratorSession } from "./use-generator-session.svelte";

const output = {
  type: "character" as const,
  title: "Mira",
  summary: "A rogue",
  content: "Body",
  lore: "Lore",
  labels: [],
  status: "draft" as const,
};

function setup(
  options: {
    generate?: ReturnType<typeof vi.fn>;
    autoGenerateExplicit?: boolean;
    aiModeRequired?: boolean;
    supportsStreaming?: boolean;
  } = {},
) {
  const generate = options.generate ?? vi.fn(async () => output);
  let session!: ReturnType<typeof useGeneratorSession>;
  const cleanup = $effect.root(() => {
    session = useGeneratorSession({
      getCanonicalPath: () => "/generators/npc",
      getInitialDraft: () => null,
      getInitialDraftIsUserGenerated: () => false,
      getAutoGenerateExplicit: () => options.autoGenerateExplicit ?? true,
      getAiModeRequired: () => options.aiModeRequired ?? false,
      getSupportsStreaming: () => options.supportsStreaming ?? false,
      getSingleColumn: () => false,
      getGeneratorType: () => "npc",
      getDocumentLayout: () => ({ content: "Body", lore: "Lore" }) as never,
      getContextSelection: () => ({ entities: [], trimmed: false }) as never,
      getOutputCard: () => null,
      generate: generate as never,
    });
  });
  flushSync();
  return { session, generate, cleanup };
}

describe("useGeneratorSession", () => {
  let cleanup: (() => void) | undefined;
  beforeEach(() => {
    hub.addEntity.mockClear();
    hub.addProvenance.mockClear();
    track.mockClear();
  });
  afterEach(() => cleanup?.());

  it("generates with AI by default, records the result and tracks the run", async () => {
    const ctx = setup();
    cleanup = ctx.cleanup;

    await ctx.session.handleGenerate();

    expect(ctx.generate).toHaveBeenCalledWith({ useAI: true });
    expect(ctx.session.generatedData).toEqual(output);
    expect(ctx.session.userGenerationSucceeded).toBe(true);
    expect(ctx.session.currentEntityId).toBe("entity-1");
    expect(hub.addEntity).toHaveBeenCalledOnce();
    expect(track).toHaveBeenCalledWith("generator_started", {
      generator_type: "npc",
    });
    expect(track).toHaveBeenCalledWith("generator_completed", {
      generator_type: "npc",
    });
  });

  it("generates locally when the user turned AI off", async () => {
    const ctx = setup();
    cleanup = ctx.cleanup;
    ctx.session.useAI = false;

    await ctx.session.handleGenerate();

    expect(ctx.generate).toHaveBeenCalledWith({ useAI: false });
  });

  it("reports a failure without marking the run as successful", async () => {
    const ctx = setup({
      generate: vi.fn().mockRejectedValue(new Error("boom")),
    });
    cleanup = ctx.cleanup;

    await ctx.session.handleGenerate();

    expect(ctx.session.errorMessage).toBe("Failed to generate: boom");
    expect(ctx.session.userGenerationSucceeded).toBe(false);
    expect(ctx.session.isBusy).toBe(false);
    expect(hub.addEntity).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalledWith(
      "generator_completed",
      expect.anything(),
    );
  });

  it("shows streamed previews as they arrive", async () => {
    let seenDuringRun: unknown;
    const generate = vi.fn(
      async (opts: { onPreview?: (p: typeof output) => void }) => {
        opts.onPreview?.({ ...output, title: "Preview" });
        seenDuringRun = ctxRef.session.generatedData;
        return output;
      },
    );
    const ctxRef = setup({ generate, supportsStreaming: true });
    cleanup = ctxRef.cleanup;

    await ctxRef.session.handleGenerate();

    expect(seenDuringRun).toMatchObject({ title: "Preview" });
    expect(ctxRef.session.generatedData).toEqual(output);
  });

  it("ignores a second generate while one is running", async () => {
    let release!: () => void;
    const generate = vi.fn(
      () =>
        new Promise<typeof output>((resolve) => {
          release = () => resolve(output);
        }),
    );
    const ctx = setup({ generate });
    cleanup = ctx.cleanup;

    const first = ctx.session.handleGenerate();
    await ctx.session.handleGenerate();
    release();
    await first;

    expect(generate).toHaveBeenCalledOnce();
  });

  it("seeds a local example draft on load unless AI is required", async () => {
    const seeded = setup({ autoGenerateExplicit: false });
    await vi.waitFor(() => expect(seeded.session.generatedData).toBeTruthy());
    expect(seeded.generate).toHaveBeenCalledWith({ useAI: false });
    expect(seeded.session.isExampleDraft).toBe(true);
    seeded.cleanup();

    const aiOnly = setup({ autoGenerateExplicit: false, aiModeRequired: true });
    cleanup = aiOnly.cleanup;
    await Promise.resolve();
    expect(aiOnly.generate).not.toHaveBeenCalled();
    expect(aiOnly.session.generatedData).toBeNull();
  });

  it("replaces the result with an accepted refinement", () => {
    const ctx = setup();
    cleanup = ctx.cleanup;

    ctx.session.applyRefinedOutput({ ...output, title: "Refined" }, "e9");

    expect(ctx.session.generatedData?.title).toBe("Refined");
    expect(ctx.session.currentEntityId).toBe("e9");
    expect(ctx.session.userGenerationSucceeded).toBe(true);
    expect(ctx.session.isExampleDraft).toBe(false);
  });
});
