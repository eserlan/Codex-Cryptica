import { describe, it, expect, vi } from "vitest";
import { callLM, type SoundBiteLogger } from "./sound-bite-lm-adapter";
import {
  SoundBiteGenerationError,
  SoundBiteContentPolicyError,
} from "./response-parser";
import type { TextGenerationService } from "schema";

describe("callLM", () => {
  const createMockLogger = (): SoundBiteLogger => ({
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  });

  const createMockService = (
    generateResponse: TextGenerationService["generateResponse"],
  ): TextGenerationService => ({
    generateResponse,
    expandQuery: vi.fn(),
    generateMergeProposal: vi.fn(),
    generatePlotAnalysis: vi.fn(),
  });

  it("successfully collects streaming chunks and returns response", async () => {
    const logger = createMockLogger();
    const mockService = createMockService(
      vi.fn(async (_apiKey, _prompt, _history, _system, _model, onChunk) => {
        onChunk?.("chunk1");
        onChunk?.("chunk1 chunk2");
        return "chunk1 chunk2";
      }) as unknown as TextGenerationService["generateResponse"],
    );

    const result = await callLM(
      mockService,
      "key-1",
      "gemini-2.5-flash",
      "test prompt",
      false,
      logger,
    );

    expect(result).toBe("chunk1 chunk2");
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining("generateResponse done — chunks=2"),
    );
  });

  it("throws SoundBiteGenerationError when response is empty or whitespace", async () => {
    const logger = createMockLogger();
    const mockService = createMockService(
      vi.fn(
        async () => "",
      ) as unknown as TextGenerationService["generateResponse"],
    );

    await expect(
      callLM(
        mockService,
        "key-1",
        "gemini-2.5-flash",
        "test prompt",
        false,
        logger,
      ),
    ).rejects.toThrow(SoundBiteGenerationError);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("empty response from model"),
    );
  });

  it("detects model content policy refusal signals and throws SoundBiteContentPolicyError", async () => {
    const refusalPhrases = [
      "I am unable to generate content of that nature.",
      "I can't generate this character sound bite.",
      "I will not create that voice profile.",
      "I am not able to generate this response.",
      "This request violates our safety guidelines.",
    ];

    for (const refusal of refusalPhrases) {
      const logger = createMockLogger();
      const mockService = createMockService(
        vi.fn(async (_k, _p, _h, _s, _m, onChunk) => {
          onChunk?.(refusal);
          return refusal;
        }) as unknown as TextGenerationService["generateResponse"],
      );

      await expect(
        callLM(
          mockService,
          "key-1",
          "gemini-2.5-flash",
          "test prompt",
          false,
          logger,
        ),
      ).rejects.toThrow(SoundBiteContentPolicyError);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("content policy signal detected"),
      );
    }
  });

  it("rethrows error when textGeneration service throws", async () => {
    const logger = createMockLogger();
    const serviceError = new Error("Network timeout");
    const mockService = createMockService(
      vi.fn(async () => {
        throw serviceError;
      }) as unknown as TextGenerationService["generateResponse"],
    );

    await expect(
      callLM(
        mockService,
        "key-1",
        "gemini-2.5-flash",
        "test prompt",
        false,
        logger,
      ),
    ).rejects.toThrow(serviceError);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("textGeneration.generateResponse threw"),
      serviceError,
    );
  });
});
