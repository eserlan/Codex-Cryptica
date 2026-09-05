import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeneratorAITransport, toSeoOutput } from "./generator-ai-transport";

describe("toSeoOutput", () => {
  it("carries fields through and casts the type onto the SEO union", () => {
    const result = toSeoOutput({
      type: "npc",
      title: "Tomasa",
      summary: "A frontier guide",
      content: "Bio",
      lore: "Secrets",
      labels: ["npc"],
    } as any);

    expect(result).toEqual({
      type: "npc",
      title: "Tomasa",
      summary: "A frontier guide",
      content: "Bio",
      lore: "Secrets",
      labels: ["npc"],
    });
  });
});

describe("GeneratorAITransport", () => {
  let clientManager: { getModel: ReturnType<typeof vi.fn> };
  let transport: GeneratorAITransport;

  beforeEach(() => {
    clientManager = { getModel: vi.fn() };
    transport = new GeneratorAITransport(clientManager as any);
  });

  describe("runModel", () => {
    it("returns the trimmed non-streaming response text", async () => {
      clientManager.getModel.mockResolvedValue({
        generateContent: vi.fn().mockResolvedValue({
          response: { text: () => "  hello world  " },
        }),
      });

      const text = await transport.runModel("system", "user message");

      expect(text).toBe("hello world");
      expect(clientManager.getModel).toHaveBeenCalledWith(
        "",
        "gemini-3.5-flash-lite",
        "system",
      );
    });

    it("streams deltas into the preview callback registered via generateWithPreview", async () => {
      clientManager.getModel.mockResolvedValue({
        generateContentStream: async function* () {
          yield { type: "delta", text: "foo" };
          yield { type: "delta", text: "bar" };
          yield { type: "complete", text: "foobar" };
        },
      });

      const previews: string[] = [];
      const text = await transport.generateWithPreview(
        () => transport.runModel("system", "user message"),
        (t) => previews.push(t),
      );

      expect(text).toBe("foobar");
      expect(previews).toEqual(["foo", "foobar"]);
    });
  });

  describe("runWithAIFallback", () => {
    it("returns the AI attempt's output when it succeeds", async () => {
      const result = await transport.runWithAIFallback(
        true,
        async () => ({ type: "npc", title: "AI Result" }) as any,
        () => ({ type: "npc", title: "Local Result" }) as any,
      );

      expect(result).toMatchObject({ title: "AI Result" });
    });

    it("falls back to local output and stamps aiFallback when the AI attempt throws", async () => {
      const result = await transport.runWithAIFallback(
        true,
        async () => {
          throw new Error("network down");
        },
        () => ({ type: "npc", title: "Local Result" }) as any,
      );

      expect(result).toMatchObject({
        title: "Local Result",
        aiFallback: true,
      });
    });

    it("skips the AI attempt entirely when useAI is false", async () => {
      const aiAttempt = vi.fn();
      const result = await transport.runWithAIFallback(
        false,
        aiAttempt,
        () => ({ type: "npc", title: "Local Result" }) as any,
      );

      expect(aiAttempt).not.toHaveBeenCalled();
      expect(result).toMatchObject({ title: "Local Result" });
      expect(result.aiFallback).toBeUndefined();
    });
  });
});
