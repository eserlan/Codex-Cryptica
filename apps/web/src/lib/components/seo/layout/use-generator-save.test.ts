/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";

const saveOutput = vi.hoisted(() => vi.fn());
const saveHub = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());
const track = vi.hoisted(() => vi.fn());

vi.mock("#lib/components/seo/generator-save-flow.js", () => ({
  saveGeneratorOutput: saveOutput,
  saveSessionHubEntities: saveHub,
}));
vi.mock("#lib/services/analytics/zaraz-analytics.js", () => ({
  trackPublicGeneratorAction: track,
}));
vi.mock("#lib/services/analytics/generator-save-tracking.js", () => ({
  trackSaveToCodex: vi.fn(),
  countRelatedEntities: vi.fn(),
}));
vi.mock("#lib/stores/session-hub.svelte.js", () => ({
  sessionHubStore: { provenance: {}, entities: [] },
}));

import { useGeneratorSave } from "./use-generator-save.svelte";

function setup(
  options: {
    hasData?: boolean;
    isGenerating?: boolean;
    exportDiagramImage?: () => Promise<string | undefined>;
  } = {},
) {
  const setError = vi.fn();
  const save = useGeneratorSave({
    getGeneratorType: () => "npc",
    getGeneratedData: () =>
      (options.hasData === false ? null : { title: "Mira" }) as never,
    isGenerationInProgress: () => options.isGenerating ?? false,
    getDocumentLayout: () => ({ content: "Body" }) as never,
    exportDiagramImage: options.exportDiagramImage ?? (async () => undefined),
    setError,
    navigate,
  });
  return { save, setError };
}

describe("useGeneratorSave", () => {
  beforeEach(() => {
    saveOutput.mockReset();
    saveHub.mockReset();
    track.mockClear();
    navigate.mockReset();
  });

  it("navigates to Codex with the redirect query after saving", async () => {
    saveOutput.mockResolvedValue("?utm_medium=save-to-vault");
    const { save } = setup();

    await save.handleSaveToCodex();

    expect(navigate).toHaveBeenCalledWith(
      expect.stringContaining("?utm_medium=save-to-vault"),
    );
    expect(save).not.toHaveProperty("showSaveModal");
    expect(track).toHaveBeenCalledWith("open_codex", {
      generator_type: "npc",
      source: "save_confirmation",
    });
  });

  it("reports blocked storage and does not navigate", async () => {
    saveOutput.mockRejectedValue(new Error("blocked"));
    const { save, setError } = setup();

    await save.handleSaveToCodex();

    expect(navigate).not.toHaveBeenCalled();
    expect(save.isSaving).toBe(false);
    expect(save.saveError).toBe(
      "Storage access is blocked. Please copy the Markdown below instead.",
    );
    expect(setError).toHaveBeenCalledWith(
      "Storage access is blocked. Please copy the Markdown below instead.",
    );
  });

  it("stages once when called again while staging is pending", async () => {
    let release!: (value: string | undefined) => void;
    const exportDiagramImage = () =>
      new Promise<string | undefined>((r) => (release = r));
    saveOutput.mockImplementation(async (...args: unknown[]) => {
      await (args[4] as () => Promise<unknown>)();
      return "?q";
    });
    const { save } = setup({ exportDiagramImage });

    const first = save.handleSaveToCodex();
    expect(save.isSaving).toBe(true);
    await save.handleSaveToCodex();
    release(undefined);
    await first;

    expect(saveOutput).toHaveBeenCalledTimes(1);
    expect(
      track.mock.calls.filter(([name]) => name === "save_to_codex"),
    ).toHaveLength(1);
    expect(navigate).toHaveBeenCalledTimes(1);
    // The page is leaving, so further clicks stay ignored.
    expect(save.isSaving).toBe(true);
    await save.handleSaveToCodex();
    expect(saveOutput).toHaveBeenCalledTimes(1);
  });

  it("re-enables saving when navigation fails", async () => {
    saveOutput.mockResolvedValue("?q");
    navigate.mockRejectedValue(new Error("nav failed"));
    const { save } = setup();

    await save.handleSaveToCodex();
    await vi.waitFor(() => expect(save.isSaving).toBe(false));
  });

  it("navigates after saving a hub selection", async () => {
    saveHub.mockReturnValue("?hub");
    const { save } = setup();

    save.handleSaveHubToCodex([{ id: "e1" } as never]);

    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(expect.stringContaining("?hub")),
    );
  });

  it("does not save without a generated result", async () => {
    const { save } = setup({ hasData: false });

    await save.handleSaveToCodex();

    expect(saveOutput).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });

  it("does not save a streamed preview while generation is still in progress", async () => {
    const { save } = setup({ isGenerating: true });

    await save.handleSaveToCodex();

    expect(saveOutput).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });

  it("ignores an empty hub selection and reports hub storage failures", () => {
    const { save, setError } = setup();

    save.handleSaveHubToCodex([]);
    expect(saveHub).not.toHaveBeenCalled();

    saveHub.mockImplementation(() => {
      throw new Error("blocked");
    });
    save.handleSaveHubToCodex([{ id: "e1" } as never]);
    expect(navigate).not.toHaveBeenCalled();
    expect(setError).toHaveBeenCalledWith(
      "Storage access is blocked. Please copy drafts manually.",
    );
  });
});
