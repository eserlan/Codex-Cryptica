import { describe, it, expect, vi, beforeEach } from "vitest";
import { generatePersonalityProfile } from "./generate-personality-profile";
import { personalitySectionTitle } from "./generate-personality";
import { oracle } from "$lib/stores/oracle.svelte";
import { upsertMarkdownSection } from "$lib/utils/markdown";
import { buildRelatedEntityContext } from "@codex/oracle-engine";
import { buildPersonalityPrompt } from "generator-engine";

vi.mock("$lib/stores/oracle.svelte", () => ({
  oracle: {
    effectiveApiKey: "test-key",
    modelName: "test-model",
    vault: { entities: {}, inboundConnections: {} },
    contextRetrieval: { getConsolidatedContext: vi.fn(() => "") },
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

vi.mock("@codex/oracle-engine", () => ({
  buildRelatedEntityContext: vi.fn(() => []),
}));

vi.mock("generator-engine", () => ({
  buildPersonalityPrompt: vi.fn((options, entityContext) => ({
    systemInstruction: "system instruction",
    userMessage: `user message${entityContext ? ` with context: ${entityContext}` : ""}`,
    resolved: { placeholderName: "Fallback Name" },
  })),
  parsePersonalityResponse: vi.fn(() => ({
    content: "### Core Personality\nGenerated content.",
    lore: "### Drives\nGenerated lore.",
  })),
}));

describe("generatePersonalityProfile", () => {
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
      connections: [],
    };
  });

  it("sets error and returns false if oracle textGeneration is unavailable", async () => {
    const originalGenerateResponse = oracle.textGeneration.generateResponse;
    // @ts-expect-error Mocking missing property
    oracle.textGeneration.generateResponse = undefined;

    const result = await generatePersonalityProfile({
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

  it("builds entity context from content, lore, and related entities, then upserts the combined result", async () => {
    vi.mocked(buildRelatedEntityContext).mockReturnValueOnce([
      {
        id: "2",
        title: "Ally NPC",
        type: "character",
        relation: "ally",
        summary: "A trusted friend.",
      },
    ]);
    vi.mocked(oracle.textGeneration.generateResponse).mockImplementationOnce(
      async (key, prompt, context, system, model, cb) => {
        if (cb) cb('{"content":"...","lore":"..."}');
      },
    );

    const result = await generatePersonalityProfile({
      entity: defaultEntity,
      editContent: "Edit content",
      getEditLore: () => "Edit lore",
      setEditLore: setEditLoreMock,
      setGenerating: setGeneratingMock,
      setError: setErrorMock,
    });

    expect(result).toBe(true);
    expect(setErrorMock).toHaveBeenCalledWith(null);

    const [, entityContext] = vi.mocked(buildPersonalityPrompt).mock.calls[0];
    expect(entityContext).toContain("Edit content");
    expect(entityContext).toContain("Edit lore");
    expect(entityContext).toContain("Ally NPC (ally): A trusted friend.");

    expect(upsertMarkdownSection).toHaveBeenCalledWith(
      "Edit lore",
      personalitySectionTitle,
      "### Core Personality\nGenerated content.\n\n### Drives\nGenerated lore.",
    );
    expect(setEditLoreMock).toHaveBeenCalledWith(
      "Edit lore\n\n## Personality & Voice\n### Core Personality\nGenerated content.\n\n### Drives\nGenerated lore.",
    );
    expect(setGeneratingMock).toHaveBeenLastCalledWith(false);
  });

  it("handles generation errors", async () => {
    vi.mocked(oracle.textGeneration.generateResponse).mockRejectedValueOnce(
      new Error("Network error"),
    );

    const result = await generatePersonalityProfile({
      entity: defaultEntity,
      editContent: "",
      getEditLore: () => undefined,
      setEditLore: setEditLoreMock,
      setGenerating: setGeneratingMock,
      setError: setErrorMock,
    });

    expect(result).toBe(false);
    expect(setErrorMock).toHaveBeenCalledWith(
      "AI generation failed. Add personality rules manually before saving.",
    );
    expect(setGeneratingMock).toHaveBeenLastCalledWith(false);
  });

  it("sets error and returns false when the model returns no text", async () => {
    vi.mocked(oracle.textGeneration.generateResponse).mockImplementationOnce(
      async () => {},
    );

    const result = await generatePersonalityProfile({
      entity: defaultEntity,
      editContent: "",
      getEditLore: () => undefined,
      setEditLore: setEditLoreMock,
      setGenerating: setGeneratingMock,
      setError: setErrorMock,
    });

    expect(result).toBe(false);
    expect(setErrorMock).toHaveBeenCalledWith(
      "AI generation failed. Add personality rules manually before saving.",
    );
  });
});
