/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";

const saveOutput = vi.hoisted(() => vi.fn());
const saveHub = vi.hoisted(() => vi.fn());
const track = vi.hoisted(() => vi.fn());

vi.mock("$lib/components/seo/generator-save-flow", () => ({
  saveGeneratorOutput: saveOutput,
  saveSessionHubEntities: saveHub,
}));
vi.mock("$lib/services/analytics/zaraz-analytics", () => ({
  trackPublicGeneratorAction: track,
}));
vi.mock("$lib/services/analytics/generator-save-tracking", () => ({
  trackSaveToCodex: vi.fn(),
  countRelatedEntities: vi.fn(),
}));
vi.mock("$lib/stores/session-hub.svelte", () => ({
  sessionHubStore: { provenance: {}, entities: [] },
}));

import { useGeneratorSave } from "./use-generator-save.svelte";

function setup(options: { hasData?: boolean } = {}) {
  const setError = vi.fn();
  const save = useGeneratorSave({
    getGeneratorType: () => "npc",
    getGeneratedData: () =>
      (options.hasData === false ? null : { title: "Mira" }) as never,
    getDocumentLayout: () => ({ content: "Body" }) as never,
    exportDiagramImage: async () => undefined,
    setError,
  });
  return { save, setError };
}

describe("useGeneratorSave", () => {
  beforeEach(() => {
    saveOutput.mockReset();
    saveHub.mockReset();
    track.mockClear();
  });

  it("opens the confirmation modal with the redirect query after saving", async () => {
    saveOutput.mockResolvedValue("?utm_medium=save-to-vault");
    const { save } = setup();

    await save.handleSaveToCodex();

    expect(save.showSaveModal).toBe(true);
    expect(save.redirectQuery).toBe("?utm_medium=save-to-vault");
  });

  it("reports blocked storage and keeps the modal closed", async () => {
    saveOutput.mockRejectedValue(new Error("blocked"));
    const { save, setError } = setup();

    await save.handleSaveToCodex();

    expect(save.showSaveModal).toBe(false);
    expect(setError).toHaveBeenCalledWith(
      "Storage access is blocked. Please copy the Markdown below instead.",
    );
  });

  it("does not save without a generated result", async () => {
    const { save } = setup({ hasData: false });

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
    expect(save.showSaveModal).toBe(false);
    expect(setError).toHaveBeenCalledWith(
      "Storage access is blocked. Please copy drafts manually.",
    );
  });

  it("tracks and closes the modal when the redirect is confirmed", async () => {
    saveOutput.mockResolvedValue("?q");
    const { save } = setup();
    await save.handleSaveToCodex();

    save.confirmSaveRedirect();

    expect(save.showSaveModal).toBe(false);
    expect(track).toHaveBeenCalledWith("open_codex", {
      generator_type: "npc",
      source: "save_confirmation",
    });
  });
});
