import { describe, it, expect } from "vitest";
import { JsonParser } from "../../src/parsers/json";

describe("JsonParser", () => {
  const parser = new JsonParser();

  it("accepts json files", () => {
    const file = new File(["{}"], "test.json", { type: "application/json" });
    expect(parser.accepts(file)).toBe(true);
  });

  it("detects entity structure and image urls", async () => {
    const data = [
      { name: "Hero", imageURL: "https://cdn.example.com/1.png" },
      { title: "Base", imageUrl: "https://cdn.example.com/2.png" },
    ];
    const file = new File([JSON.stringify(data)], "midjourney.json", {
      type: "application/json",
    });

    const result = await parser.parse(file);

    expect(result.metadata.hasEntityStructure).toBe(true);
    expect(result.metadata.hasImageUrls).toBe(true);
    expect(result.metadata.itemCount).toBe(2);
  });
});
