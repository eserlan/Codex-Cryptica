import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
import {
  QUICK_NAMES_COUNT,
  askQuickNamesAi,
  extractQuickNames,
  formatQuickNameList,
  quickNamesAnalytics,
  usableAiNames,
} from "./quick-names";

describe("quickNamesAnalytics", () => {
  it("reports preset culture and name type as they are", () => {
    expect(quickNamesAnalytics("fantasy-names", "High Elf", "Place")).toEqual({
      generator_type: "fantasy-names",
      generator_mode: "quick_names",
      name_culture: "High Elf",
      name_type: "Place",
    });
  });

  it("reports typed-in values as custom so visitor text never leaves the page", () => {
    const properties = quickNamesAnalytics(
      "fantasy-names",
      "My secret homebrew tongue",
      "Ship of Lady Vex",
    );

    expect(properties.name_culture).toBe("custom");
    expect(properties.name_type).toBe("custom");
    expect(JSON.stringify(properties)).not.toMatch(/secret|Vex/);
  });
});

describe("formatQuickNameList", () => {
  it("puts one plain name per line", () => {
    expect(formatQuickNameList(["Aelar", "Brindle"])).toBe("Aelar\nBrindle");
  });

  it("returns an empty string for an empty batch", () => {
    expect(formatQuickNameList([])).toBe("");
  });
});

describe("quickNamesAnalytics for genre cultures", () => {
  it("reports a genre-specific preset culture rather than custom", () => {
    expect(
      quickNamesAnalytics("names", "Street Handle", "Person").name_culture,
    ).toBe("Street Handle");
  });
});

describe("extractQuickNames", () => {
  it.each([
    ["bold list item with note", "- **Aelar Vey**: a ranger", ["Aelar Vey"]],
    ["asterisk bullet", "* **Brindle**: a halfling", ["Brindle"]],
    ["indented item", "  - **Corwin**", ["Corwin"]],
    ["stray emphasis inside", "- **_Dara_**: x", ["Dara"]],
    ["lead sentence is not a name", "These names feel **old**.", []],
    ["plain bullet without bold", "- Eldric: a smith", []],
    ["heading", "### **Style**", []],
    ["overlong bold prose", `- **${"a".repeat(61)}**: x`, []],
    ["empty bold", "- ****: x", []],
  ])("%s", (_label, content, expected) => {
    expect(extractQuickNames(content)).toEqual(expected);
  });

  it("drops repeats and stops at a full batch", () => {
    const lines = Array.from(
      { length: QUICK_NAMES_COUNT + 3 },
      (_, i) => `- **Name ${i}**: x`,
    );
    const names = extractQuickNames(["- **Name 0**: dup", ...lines].join("\n"));

    expect(names).toHaveLength(QUICK_NAMES_COUNT);
    expect(new Set(names).size).toBe(QUICK_NAMES_COUNT);
  });

  it.each([null, undefined, 42, {}])("returns nothing for %s", (value) => {
    expect(extractQuickNames(value)).toEqual([]);
  });
});

describe("askQuickNamesAi", () => {
  const base = {
    theme: "Classic Fantasy",
    culture: "Dwarven",
    gender: "Any",
    nameType: "Person",
    context: "Form context",
  };
  const output = (extra: Partial<GeneratorOutput> = {}) =>
    ({
      type: "character",
      title: "Names",
      content: "- **Thrain**: x\n- **Dvalin**: y",
      ...extra,
    }) as GeneratorOutput;

  it("asks with AI for a full batch, preferring the visitor's description", async () => {
    const generate = vi.fn().mockResolvedValue(output());

    const result = await askQuickNamesAi(generate, {
      ...base,
      query: "  mountain miners ",
    });

    expect(generate).toHaveBeenCalledWith({
      theme: "Classic Fantasy",
      culture: "Dwarven",
      gender: "Any",
      nameType: "Person",
      context: "mountain miners",
      count: String(QUICK_NAMES_COUNT),
      useAI: true,
    });
    expect(result).toEqual({ names: ["Thrain", "Dvalin"], fallback: false });
  });

  it("uses the form's campaign context when no description is given", async () => {
    const generate = vi.fn().mockResolvedValue(output());

    await askQuickNamesAi(generate, { ...base, query: "   " });

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({ context: "Form context" }),
    );
  });

  it("flags names that came from the local fallback", async () => {
    const generate = vi.fn().mockResolvedValue(output({ aiFallback: true }));

    expect(
      (await askQuickNamesAi(generate, { ...base, query: "" })).fallback,
    ).toBe(true);
  });
});

describe("usableAiNames", () => {
  it("returns the AI's names when it answered", async () => {
    expect(
      await usableAiNames(
        async () => ({ names: ["Ysolde"], fallback: false }),
        "q",
      ),
    ).toEqual(["Ysolde"]);
  });

  it.each([
    ["a local fallback", async () => ({ names: ["Local"], fallback: true })],
    ["an empty answer", async () => ({ names: [], fallback: false })],
    [
      "a failed request",
      async () => {
        throw new Error("down");
      },
    ],
  ])("returns null for %s", async (_label, askAi) => {
    expect(await usableAiNames(askAi, "q")).toBeNull();
  });
});
