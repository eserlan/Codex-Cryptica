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

  it("handles single object and detects image urls", async () => {
    const data = { title: "Hero", imageURL: "https://cdn.example.com/1.png" };
    const file = new File([JSON.stringify(data)], "item.json", {
      type: "application/json",
    });

    const result = await parser.parse(file);

    expect(result.metadata.isArray).toBe(false);
    expect(result.metadata.hasImageUrls).toBe(true);
    expect(result.metadata.itemCount).toBe(1);
  });

  it("handles empty array", async () => {
    const file = new File([JSON.stringify([])], "empty.json", {
      type: "application/json",
    });

    const result = await parser.parse(file);

    expect(result.metadata.isArray).toBe(true);
    expect(result.metadata.itemCount).toBe(0);
    expect(result.metadata.hasEntityStructure).toBeUndefined();
  });

  it("handles invalid JSON gracefully", async () => {
    const file = new File(["{invalid"], "broken.json", {
      type: "application/json",
    });

    const result = await parser.parse(file);

    expect(result.metadata.isStructured).toBe(false);
    expect(result.metadata.error).toBe("Invalid JSON");
  });

  it("handles array of primitives", async () => {
    const file = new File([JSON.stringify(["a", "b"])], "list.json", {
      type: "application/json",
    });

    const result = await parser.parse(file);

    expect(result.metadata.isArray).toBe(true);
    expect(result.metadata.itemCount).toBe(2);
    expect(result.metadata.hasEntityStructure).toBeUndefined();
  });
});
