import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generatePersonality,
  personalitySectionTitle,
} from "./generate-personality";
import { oracle } from "$lib/stores/oracle.svelte";
import { upsertMarkdownSection } from "$lib/utils/markdown";

vi.mock("$lib/stores/oracle.svelte", () => ({
  oracle: {
    effectiveApiKey: "test-key",
    modelName: "test-model",
    textGeneration: {
      generateResponse: vi.fn(),
    },
  },
}));

vi.mock("$lib/cloud-bridge/oracle-bridge", () => ({
  oracleBridge: {
    isReady: true,
  },
}));

vi.mock("comlink", () => ({
  proxy: vi.fn((fn) => fn),
}));

vi.mock("$lib/utils/markdown", () => ({
  upsertMarkdownSection: vi.fn(
    (lore, title, text) => `${lore}\n\n## ${title}\n${text}`,
  ),
}));

describe("generatePersonality", () => {
  let setEditLoreMock: any;
  let setGeneratingMock: any;
  let setErrorMock: any;
  let defaultEntity: any;

  beforeEach(() => {
    vi.clearAllMocks();
    setEditLoreMock = vi.fn();
    setGeneratingMock = vi.fn();
    setErrorMock = vi.fn();
    defaultEntity = {
      id: "1",
      title: "Test Character",
      content: "Public content.",
      lore: "Secret lore.",
    };
  });

  it("sets error and returns false if oracle textGeneration is unavailable", async () => {
    const originalGenerateResponse = oracle.textGeneration.generateResponse;
    // @ts-expect-error Mocking missing property
    oracle.textGeneration.generateResponse = undefined;

    const result = await generatePersonality({
      entity: defaultEntity,
      editContent: "",
      getEditLore: () => undefined,
      setEditLore: setEditLoreMock,
      setGenerating: setGeneratingMock,
      setError: setErrorMock,
    });

    expect(result).toBe(false);
    expect(setGeneratingMock).toHaveBeenCalledWith(true);
    expect(setErrorMock).toHaveBeenCalledWith(
      "AI generation is unavailable. Add personality rules manually before saving.",
    );
    expect(setGeneratingMock).toHaveBeenLastCalledWith(false);

    oracle.textGeneration.generateResponse = originalGenerateResponse;
  });

  it("generates response successfully and updates lore", async () => {
    vi.mocked(oracle.textGeneration.generateResponse).mockImplementationOnce(
      async (key, prompt, context, system, model, cb) => {
        if (cb) cb("  - Grumpy\n- Loves cats  ");
      },
    );

    const result = await generatePersonality({
      entity: defaultEntity,
      editContent: "Edit content",
      getEditLore: () => "Edit lore",
      setEditLore: setEditLoreMock,
      setGenerating: setGeneratingMock,
      setError: setErrorMock,
    });

    expect(result).toBe(true);
    expect(setGeneratingMock).toHaveBeenCalledWith(true);
    expect(setErrorMock).toHaveBeenCalledWith(null);
    expect(oracle.textGeneration.generateResponse).toHaveBeenCalled();

    const prompt = vi.mocked(oracle.textGeneration.generateResponse).mock
      .calls[0][1];
    expect(prompt).toContain(
      'Create only personality and voice notes for "Test Character".',
    );
    expect(prompt).toContain("Edit content");
    expect(prompt).toContain("Edit lore");

    expect(upsertMarkdownSection).toHaveBeenCalledWith(
      "Edit lore",
      personalitySectionTitle,
      "- Grumpy\n- Loves cats",
    );
    expect(setEditLoreMock).toHaveBeenCalledWith(
      "Edit lore\n\n## Personality & Voice\n- Grumpy\n- Loves cats",
    );
    expect(setGeneratingMock).toHaveBeenLastCalledWith(false);
  });

  it("handles generation errors", async () => {
    vi.mocked(oracle.textGeneration.generateResponse).mockRejectedValueOnce(
      new Error("Network error"),
    );

    const result = await generatePersonality({
      entity: defaultEntity,
      editContent: "",
      getEditLore: () => undefined,
      setEditLore: setEditLoreMock,
      setGenerating: setGeneratingMock,
      setError: setErrorMock,
    });

    expect(result).toBe(false);
    expect(setGeneratingMock).toHaveBeenCalledWith(true);
    expect(setErrorMock).toHaveBeenCalledWith(
      "AI generation failed. Add personality rules manually before saving.",
    );
    expect(setGeneratingMock).toHaveBeenLastCalledWith(false);
  });
});
