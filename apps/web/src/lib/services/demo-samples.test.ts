import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SAMPLES_DIR = join(process.cwd(), "static/vault-samples");
const files = readdirSync(SAMPLES_DIR).filter((f) => f.endsWith(".json"));

describe("demo vault samples", () => {
  it("finds the sample files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)(
    "%s has entities with no GM notes copied from the text",
    (f) => {
      const data = JSON.parse(readFileSync(join(SAMPLES_DIR, f), "utf8")) as {
        entities: Record<string, { content?: string; lore?: string }>;
      };
      const entities = Object.values(data.entities);
      expect(entities.length).toBeGreaterThan(0);
      const copies = entities.filter(
        (e) => e.lore?.trim() && e.lore.trim() === (e.content ?? "").trim(),
      );
      expect(copies).toEqual([]);
    },
  );
});
