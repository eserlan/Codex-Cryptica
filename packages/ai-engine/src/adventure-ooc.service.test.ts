// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { AdventureOocService } from "./adventure-ooc.service";
import type { AdventureOocRequest } from "@codex/adventure-engine";

const sampleRequest: AdventureOocRequest = {
  kind: "ooc",
  question: "How much for each survivor?",
  serializedPrompt: JSON.stringify({
    state: { premise: "60kcr for each survivor" },
    input: { mode: "ooc", question: "How much for each survivor?" },
  }),
  systemInstruction: "You are the tabletop GM answering an OOC question.",
};

describe("AdventureOocService", () => {
  it("calls stateless generateContent and returns a tagged ooc response", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      response: {
        text: () => "```text\nThe contract pays 60kcr per survivor.\n```",
      },
    });
    const getModel = vi.fn().mockResolvedValue({ generateContent });
    const service = new AdventureOocService({ getModel });

    const response = await service.ask(sampleRequest);

    expect(response).toEqual({
      kind: "ooc",
      answer: "The contract pays 60kcr per survivor.",
    });
    expect(getModel).toHaveBeenCalledWith(
      "",
      "luna-fast",
      sampleRequest.systemInstruction,
    );
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("rejects empty responses and non-ooc request kinds", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      response: { text: () => "   " },
    });
    const service = new AdventureOocService({
      getModel: vi.fn().mockResolvedValue({ generateContent }),
    });

    await expect(service.ask(sampleRequest)).rejects.toThrow(
      "empty-ooc-answer",
    );
    await expect(
      service.ask({ ...sampleRequest, kind: "play" as "ooc" }),
    ).rejects.toThrow("invalid-ooc-request");
  });

  it("rejects over-limit replies instead of saving a clipped answer", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      response: { text: () => "x".repeat(2_001) },
    });
    const service = new AdventureOocService({
      getModel: vi.fn().mockResolvedValue({ generateContent }),
    });

    await expect(service.ask(sampleRequest)).rejects.toThrow(
      "ooc-answer-too-long",
    );
  });

  it("parses structured OOC JSON replies with classification and decisions", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            answer: "Envoy Ilona Marshall is the council's quest giver.",
            classification: "established",
            decisions: [
              {
                kind: "person",
                name: "Envoy Ilona Marshall",
                summary: "Council quest giver.",
                visibility: "player-visible",
              },
            ],
          }),
      },
    });
    const service = new AdventureOocService({
      getModel: vi.fn().mockResolvedValue({ generateContent }),
    });

    const response = await service.ask(sampleRequest);
    expect(response).toEqual({
      kind: "ooc",
      answer: "Envoy Ilona Marshall is the council's quest giver.",
      classification: "established",
      decisions: [
        {
          kind: "person",
          name: "Envoy Ilona Marshall",
          summary: "Council quest giver.",
          visibility: "player-visible",
        },
      ],
    });
  });
});
