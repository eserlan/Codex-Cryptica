import { describe, expect, it } from "vitest";
import { formatQuickNameList, quickNamesAnalytics } from "./quick-names";

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
