import { OracleAnalyzer } from "./analyzer";
import { describe, it, expect } from "vitest";

describe("OracleAnalyzer", () => {
  it("uses provided idGenerator for discovered entities", async () => {
    const mockResponse = JSON.stringify([
      { title: "Test Entity", type: "Lore", content: "Test content" },
    ]);

    const mockModelFactory = () =>
      ({
        generateContent: async () => ({
          response: { text: () => mockResponse },
        }),
      }) as any;

    const mockIdGenerator = { uuid: () => "test-injected-id" };

    const analyzer = new OracleAnalyzer(mockModelFactory, mockIdGenerator);

    const result = await analyzer.analyze("test input");

    expect(result.entities[0].id).toBe("test-injected-id");
    expect(result.entities[0].suggestedTitle).toBe("Test Entity");
  });
});
