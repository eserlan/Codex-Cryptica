import { describe, it, expect } from "vitest";
import {
  isTitleBanned,
  bannedNamesInstruction,
  findOverusedNamePatterns,
  matchesOverusedPattern,
  overusedPatternsInstruction,
  sampleNameExamples,
  nameExamplesInstruction,
  cultureNamingInstruction,
} from "./naming-policy";

describe("isTitleBanned", () => {
  it("catches an exact banned name, case-insensitively", () => {
    expect(isTitleBanned("vance", ["Vance"])).toBe(true);
    expect(isTitleBanned("VANCE", ["Vance"])).toBe(true);
  });

  it("catches hyphenated/compound derivatives", () => {
    expect(isTitleBanned("Vane-Smithe", ["Vane"])).toBe(true);
  });

  it("does not flag a substring inside a larger, unrelated word", () => {
    expect(isTitleBanned("Vanessa", ["Vane"])).toBe(false);
  });

  it("returns false for an empty banned list or empty title", () => {
    expect(isTitleBanned("Vance", [])).toBe(false);
    expect(isTitleBanned("", ["Vance"])).toBe(false);
  });
});

describe("bannedNamesInstruction", () => {
  it("returns an empty string when there is nothing to ban", () => {
    expect(bannedNamesInstruction([])).toBe("");
  });

  it("lists every provided name and explains the hyphenated-derivative rule", () => {
    const result = bannedNamesInstruction(["Vance", "Elara"]);
    expect(result).toContain("Vance");
    expect(result).toContain("Elara");
    expect(result).toContain("Vane-Smithe");
    expect(result).toContain("this new entity's own title");
  });
});

describe("findOverusedNamePatterns", () => {
  it("flags a word reused across three or more titles", () => {
    const p = findOverusedNamePatterns([
      "Shadow Keep",
      "Order of Shadow",
      "Shadowfen Guild",
      "Shadow Vale",
      "Mira",
    ]);
    expect(p.words).toContain("shadow");
  });

  it("flags shared name starts and endings across distinct titles", () => {
    const p = findOverusedNamePatterns([
      "Kaelthorn",
      "Kaelwyn",
      "Kaelorin",
      "Brightmoor",
      "Ravenmoor",
      "Stonemoor",
    ]);
    expect(p.prefixes).toContain("kae");
    expect(p.suffixes).toContain("oor");
  });

  it("finds nothing when names are varied or there are too few titles", () => {
    expect(
      findOverusedNamePatterns(["Mira", "Tolbert", "Zhao Lin", "Okonkwo"]),
    ).toEqual({ words: [], prefixes: [], suffixes: [] });
    expect(findOverusedNamePatterns(["Shadow", "Shadow"]).words).toEqual([]);
    expect(findOverusedNamePatterns([])).toEqual({
      words: [],
      prefixes: [],
      suffixes: [],
    });
  });

  it("does not count one title repeating a word against itself", () => {
    const p = findOverusedNamePatterns(["Dun Dun Dun", "Mira", "Tolbert"]);
    expect(p.words).toEqual([]);
  });
});

describe("findOverusedNamePatterns noise filtering", () => {
  it("ignores common connective words like 'the', 'and' and 'von'", () => {
    const p = findOverusedNamePatterns([
      "The Keep",
      "The Hall",
      "The Mira",
      "Anna von Tolbert",
      "Eli von Zhao",
      "Ora von Brandt",
      "Salt and Iron",
      "Bread and Ash",
      "Rope and Tar",
    ]);
    expect(p.words).toEqual([]);
  });

  it("ignores common English endings and openings in descriptive titles", () => {
    const p = findOverusedNamePatterns([
      "Burning Fields",
      "Falling Stars",
      "Rising Dread",
      "Ancient Contest",
      "Ancient Contract",
      "Ancient Contempt",
    ]);
    expect(p.suffixes).not.toContain("ing");
    expect(p.prefixes).not.toContain("con");
  });

  it("scales the threshold with vault size so chance overlap in a big vault is not flagged", () => {
    const filler = Array.from({ length: 200 }, (_, i) => `Name${i}x`);
    const few = ["Darvold A", "Darvold B", "Darvold C"];
    // 3 of 203 is below 2% — not a pattern in a large vault...
    expect(findOverusedNamePatterns([...filler, ...few]).words).not.toContain(
      "darvold",
    );
    // ...but 3 of 3 is.
    expect(findOverusedNamePatterns(few).words).toContain("darvold");
  });
});

describe("overusedPatternsInstruction", () => {
  it("returns an empty string when there is nothing overused", () => {
    expect(
      overusedPatternsInstruction({ words: [], prefixes: [], suffixes: [] }),
    ).toBe("");
  });

  it("lists words, openings and endings to avoid", () => {
    const text = overusedPatternsInstruction({
      words: ["shadow"],
      prefixes: ["kae"],
      suffixes: ["oor"],
    });
    expect(text).toContain("shadow");
    expect(text).toContain('"kae-"');
    expect(text).toContain('"-oor"');
  });
});

describe("findOverusedNamePatterns affix option", () => {
  const titles = ["Zorvash", "Morvash", "Kelvash", "Brightmoor", "Ravenmoor"];

  it("reports openings and endings by default", () => {
    expect(findOverusedNamePatterns(titles).suffixes).toContain("ash");
  });

  it("reports only repeated words when affixes are turned off", () => {
    const p = findOverusedNamePatterns(titles, { affixes: false });
    expect(p.prefixes).toEqual([]);
    expect(p.suffixes).toEqual([]);
  });

  it("still reports repeated words when affixes are off", () => {
    const p = findOverusedNamePatterns(["Tribe A", "Tribe B", "Tribe C"], {
      affixes: false,
    });
    expect(p.words).toContain("tribe");
  });
});

describe("sampleNameExamples", () => {
  const titles = Array.from({ length: 40 }, (_, i) => `Name${i}`);

  it("returns the requested number of distinct titles", () => {
    const out = sampleNameExamples(titles, { count: 8, rng: () => 0.3 });
    expect(out).toHaveLength(8);
    expect(new Set(out).size).toBe(8);
  });

  it("is driven by the injected rng", () => {
    const a = sampleNameExamples(titles, { count: 8, rng: () => 0.1 });
    const b = sampleNameExamples(titles, { count: 8, rng: () => 0.9 });
    expect(a).not.toEqual(b);
  });

  it("returns everything when there are fewer titles than requested", () => {
    expect(sampleNameExamples(["A", "B"], { count: 8 }).sort()).toEqual([
      "A",
      "B",
    ]);
    expect(sampleNameExamples([], { count: 8 })).toEqual([]);
  });

  it("skips duplicates, blanks and long descriptive titles", () => {
    const out = sampleNameExamples(
      [
        "Mira",
        "mira",
        "",
        "  ",
        "The Long Winter That Never Quite Ended Properly",
        "Tolbert",
      ],
      { count: 10 },
    );
    expect(out.sort()).toEqual(["Mira", "Tolbert"]);
  });
});

describe("nameExamplesInstruction", () => {
  it("returns an empty string with no examples", () => {
    expect(nameExamplesInstruction([])).toBe("");
  });

  it("lists examples and tells the model to invent something new", () => {
    const text = nameExamplesInstruction(["Mira", "Tolbert"]);
    expect(text).toContain("Mira, Tolbert");
    expect(text).toMatch(/new name/i);
    expect(text).toMatch(/do not reuse/i);
  });
});

describe("matchesOverusedPattern", () => {
  const patterns = { words: ["shadow"], prefixes: ["kae"], suffixes: ["oor"] };

  it("matches an overused word, prefix or suffix on any token", () => {
    expect(matchesOverusedPattern("Order of Shadow", patterns)).toBe(true);
    expect(matchesOverusedPattern("Kaelith", patterns)).toBe(true);
    expect(matchesOverusedPattern("Greymoor", patterns)).toBe(true);
  });

  it("does not match unrelated names, short tokens or empty input", () => {
    expect(matchesOverusedPattern("Tolbert Zhao", patterns)).toBe(false);
    expect(matchesOverusedPattern("Kae", patterns)).toBe(false);
    expect(matchesOverusedPattern("", patterns)).toBe(false);
    expect(
      matchesOverusedPattern("Kaelith", {
        words: [],
        prefixes: [],
        suffixes: [],
      }),
    ).toBe(false);
  });
});

describe("cultureNamingInstruction", () => {
  it("returns an empty string without a culture or guidance", () => {
    expect(cultureNamingInstruction(undefined)).toBe("");
    expect(
      cultureNamingInstruction({ culture: "Stormber", guidance: [] }),
    ).toBe("");
  });

  it("names the culture and lists the recorded guidance", () => {
    const text = cultureNamingInstruction({
      culture: "Stormber",
      guidance: [
        "Drawing inspiration from the Magyar people.",
        "Surnames are trades.",
      ],
    });
    expect(text).toContain("Stormber");
    expect(text).toContain("Drawing inspiration from the Magyar people.");
    expect(text).toContain("Surnames are trades.");
    expect(text).toMatch(/follow/i);
  });
});
