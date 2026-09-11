import { describe, it, expect } from "vitest";
import {
  sortAnswers,
  formatAnswerDate,
  ANSWER_SORT_OPTIONS,
  DEFAULT_ANSWER_SORT,
  ANSWER_SORT_STORAGE_KEY,
  isAnswerSortOption,
  readStoredAnswerSort,
  persistAnswerSort,
  clearStoredAnswerSort,
  type AnswerSortOption,
} from "./sort";
import type { StorageLike } from "$lib/utils/runtime-deps";
import type { AnswerConfig } from "./schema";

function createMockAnswer(
  slug: string,
  question: string,
  publishedAt?: string,
  category: AnswerConfig["category"] = "worldbuilding",
): AnswerConfig {
  return {
    slug,
    question,
    kind: "framework",
    shortAnswer: "A short answer for testing purposes.",
    publishedAt,
    category,
    sections: [
      {
        kind: "prose",
        heading: "Heading",
        paragraphs: ["Paragraph text."],
      },
    ],
    relatedTools: [],
    relatedForPages: [],
    relatedAnswers: [],
    labels: [],
    seo: {
      title: question,
      description: "Description",
    },
  } as AnswerConfig;
}

describe("answer sorting", () => {
  const sampleAnswers: AnswerConfig[] = [
    createMockAnswer("b-answer", "How do you build a dungeon?", "2026-08-30"),
    createMockAnswer("a-answer", "Can players die permanently?", "2026-09-04"),
    createMockAnswer("c-answer", "What makes a good villain?", "2026-09-01"),
    createMockAnswer("d-answer", "Where do you find players?", undefined),
  ];

  it("preserves original order when category is selected", () => {
    const sorted = sortAnswers(sampleAnswers, "category");
    expect(sorted.map((a) => a.slug)).toEqual([
      "b-answer",
      "a-answer",
      "c-answer",
      "d-answer",
    ]);
  });

  it("does not mutate the original array", () => {
    const copy = [...sampleAnswers];
    sortAnswers(sampleAnswers, "az");
    expect(sampleAnswers).toEqual(copy);
  });

  it("sorts answers alphabetically A to Z", () => {
    const sorted = sortAnswers(sampleAnswers, "az");
    expect(sorted.map((a) => a.question)).toEqual([
      "Can players die permanently?",
      "How do you build a dungeon?",
      "What makes a good villain?",
      "Where do you find players?",
    ]);
  });

  it("sorts answers reverse alphabetically Z to A", () => {
    const sorted = sortAnswers(sampleAnswers, "za");
    expect(sorted.map((a) => a.question)).toEqual([
      "Where do you find players?",
      "What makes a good villain?",
      "How do you build a dungeon?",
      "Can players die permanently?",
    ]);
  });

  it("sorts answers by newest date first", () => {
    const sorted = sortAnswers(sampleAnswers, "newest");
    expect(sorted.map((a) => a.slug)).toEqual([
      "a-answer", // 2026-09-04
      "c-answer", // 2026-09-01
      "b-answer", // 2026-08-30
      "d-answer", // undefined (placed last)
    ]);
  });

  it("sorts answers by oldest date first", () => {
    const sorted = sortAnswers(sampleAnswers, "oldest");
    expect(sorted.map((a) => a.slug)).toEqual([
      "b-answer", // 2026-08-30
      "c-answer", // 2026-09-01
      "a-answer", // 2026-09-04
      "d-answer", // undefined (placed last)
    ]);
  });

  it("breaks date ties using alphabetical question order", () => {
    const tiedAnswers: AnswerConfig[] = [
      createMockAnswer("z-slug", "Zebras in fantasy worlds", "2026-09-04"),
      createMockAnswer("a-slug", "Apples as magical fuel", "2026-09-04"),
    ];

    const newestSorted = sortAnswers(tiedAnswers, "newest");
    expect(newestSorted.map((a) => a.slug)).toEqual(["a-slug", "z-slug"]);

    const oldestSorted = sortAnswers(tiedAnswers, "oldest");
    expect(oldestSorted.map((a) => a.slug)).toEqual(["a-slug", "z-slug"]);
  });

  describe("formatAnswerDate", () => {
    it("formats ISO date string into British English date", () => {
      expect(formatAnswerDate("2026-09-04")).toBe("4 Sept 2026");
      expect(formatAnswerDate("2026-08-30")).toBe("30 Aug 2026");
    });

    it("returns empty string for missing or invalid dates", () => {
      expect(formatAnswerDate(undefined)).toBe("");
      expect(formatAnswerDate("")).toBe("");
      expect(formatAnswerDate("invalid-date")).toBe("");
    });
  });

  describe("ANSWER_SORT_OPTIONS", () => {
    it("contains all expected sort options with valid icons", () => {
      const expectedIds: AnswerSortOption[] = [
        "category",
        "az",
        "za",
        "newest",
        "oldest",
      ];
      expect(ANSWER_SORT_OPTIONS.map((o) => o.id)).toEqual(expectedIds);

      for (const opt of ANSWER_SORT_OPTIONS) {
        expect(opt.label.length).toBeGreaterThan(0);
        expect(opt.icon).toMatch(/^icon-\[.+\]$/);
      }
    });
  });

  describe("isAnswerSortOption", () => {
    it("returns true for every valid AnswerSortOption", () => {
      const validOptions: AnswerSortOption[] = [
        "category",
        "az",
        "za",
        "newest",
        "oldest",
      ];
      for (const opt of validOptions) {
        expect(isAnswerSortOption(opt)).toBe(true);
      }
    });

    it("returns false for invalid strings and non-string inputs", () => {
      expect(isAnswerSortOption("invalid")).toBe(false);
      expect(isAnswerSortOption("")).toBe(false);
      expect(isAnswerSortOption(null)).toBe(false);
      expect(isAnswerSortOption(undefined)).toBe(false);
      expect(isAnswerSortOption(123)).toBe(false);
      expect(isAnswerSortOption({})).toBe(false);
    });
  });

  describe("storage persistence", () => {
    function createMemoryStorage(
      initial: Record<string, string> = {},
    ): StorageLike {
      const store = new Map<string, string>(Object.entries(initial));
      return {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      };
    }

    function createThrowingStorage(): StorageLike {
      return {
        getItem: () => {
          throw new Error("Storage quota exceeded or SecurityError");
        },
        setItem: () => {
          throw new Error("Storage quota exceeded or SecurityError");
        },
        removeItem: () => {
          throw new Error("Storage quota exceeded or SecurityError");
        },
      };
    }

    describe("readStoredAnswerSort", () => {
      it("returns the stored sort option when valid", () => {
        const storage = createMemoryStorage({
          [ANSWER_SORT_STORAGE_KEY]: "newest",
        });
        expect(readStoredAnswerSort(storage)).toBe("newest");
      });

      it("returns DEFAULT_ANSWER_SORT when key is absent", () => {
        const storage = createMemoryStorage();
        expect(readStoredAnswerSort(storage)).toBe(DEFAULT_ANSWER_SORT);
      });

      it("returns DEFAULT_ANSWER_SORT when stored value is invalid", () => {
        const storage = createMemoryStorage({
          [ANSWER_SORT_STORAGE_KEY]: "corrupted_sort_mode",
        });
        expect(readStoredAnswerSort(storage)).toBe(DEFAULT_ANSWER_SORT);
      });

      it("returns DEFAULT_ANSWER_SORT when storage throws an error", () => {
        const storage = createThrowingStorage();
        expect(readStoredAnswerSort(storage)).toBe(DEFAULT_ANSWER_SORT);
      });

      it("returns DEFAULT_ANSWER_SORT when storage is null or undefined", () => {
        expect(readStoredAnswerSort(null as unknown as StorageLike)).toBe(
          DEFAULT_ANSWER_SORT,
        );
        expect(readStoredAnswerSort(undefined as unknown as StorageLike)).toBe(
          DEFAULT_ANSWER_SORT,
        );
      });
    });

    describe("persistAnswerSort", () => {
      it("persists chosen sort option to storage", () => {
        const storage = createMemoryStorage();
        persistAnswerSort("za", storage);
        expect(storage.getItem(ANSWER_SORT_STORAGE_KEY)).toBe("za");
      });

      it("gracefully handles storage throws without uncaught exceptions", () => {
        const storage = createThrowingStorage();
        expect(() => persistAnswerSort("oldest", storage)).not.toThrow();
      });
    });

    describe("clearStoredAnswerSort", () => {
      it("removes stored sort option from storage", () => {
        const storage = createMemoryStorage({
          [ANSWER_SORT_STORAGE_KEY]: "az",
        });
        expect(storage.getItem(ANSWER_SORT_STORAGE_KEY)).toBe("az");
        clearStoredAnswerSort(storage);
        expect(storage.getItem(ANSWER_SORT_STORAGE_KEY)).toBeNull();
      });

      it("gracefully handles storage throws without uncaught exceptions", () => {
        const storage = createThrowingStorage();
        expect(() => clearStoredAnswerSort(storage)).not.toThrow();
      });
    });
  });
});
