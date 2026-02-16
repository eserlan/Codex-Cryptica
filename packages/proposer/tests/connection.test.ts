import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProposerService } from "../src/service";

// Mock GoogleGenerativeAI
vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => {
      return {
        getGenerativeModel: vi.fn().mockImplementation(() => {
          return {
            generateContent: vi
              .fn()
              .mockImplementation(async (prompt: string) => {
                if (prompt.includes("Analyze the following two entities")) {
                  return {
                    response: {
                      text: () =>
                        JSON.stringify({
                          type: "friendly",
                          label: "Allies",
                          explanation: "Both entities share a common goal.",
                        }),
                    },
                  };
                }
                if (prompt.includes("Extract the source entity")) {
                  return {
                    response: {
                      text: () =>
                        JSON.stringify({
                          sourceName: "Eldrin",
                          targetName: "The Tower",
                          type: "friendly",
                          label: "master of",
                        }),
                    },
                  };
                }
                return { response: { text: () => "{}" } };
              }),
          };
        }),
      };
    }),
  };
});

describe("ProposerService - Connections", () => {
  let service: ProposerService;

  beforeEach(() => {
    service = new ProposerService("TestDB", 1);
  });

  it("should generate a connection proposal", async () => {
    const proposal = await service.generateConnectionProposal(
      "key",
      "model",
      "Source lore",
      "Target lore",
      "Source Title",
      "Target Title",
    );

    expect(proposal.type).toBe("friendly");
    expect(proposal.label).toBe("Allies");
  });

  it("should parse connection intent", async () => {
    const intent = await service.parseConnectionIntent(
      "key",
      "model",
      "/connect Eldrin is the master of The Tower",
    );

    expect(intent.sourceName).toBe("Eldrin");
    expect(intent.targetName).toBe("The Tower");
    expect(intent.label).toBe("master of");
  });
});
