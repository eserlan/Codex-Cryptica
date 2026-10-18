import { describe, it, expect } from "vitest";
import { findCategoryId, parseArgs } from "./post-to-github-discussion.ts";

describe("post-to-github-discussion", () => {
  describe("parseArgs", () => {
    it("parses title, body, and dry-run", () => {
      expect(
        parseArgs(["--title", "Hello", "--body", "World", "--dry-run"]),
      ).toEqual({
        title: "Hello",
        body: "World",
        category: "Announcements",
        dryRun: true,
      });
    });

    it("defaults category to Announcements and dryRun to false", () => {
      expect(parseArgs(["--title", "Hello", "--file", "draft.md"])).toEqual({
        title: "Hello",
        file: "draft.md",
        category: "Announcements",
        dryRun: false,
      });
    });

    it("accepts a custom category", () => {
      expect(
        parseArgs(["--title", "X", "--category", "Show and tell"]),
      ).toMatchObject({ category: "Show and tell" });
    });

    it("rejects an unknown flag", () => {
      expect(() => parseArgs(["--nope"])).toThrow("Unknown argument: --nope");
    });

    it("rejects a value flag with no value", () => {
      expect(() => parseArgs(["--title", "Hello", "--category"])).toThrow(
        "--category requires a value",
      );
    });
  });

  describe("findCategoryId", () => {
    const categories = [
      { id: "DIC_1", name: "Announcements" },
      { id: "DIC_2", name: "Show and tell" },
    ];

    it("matches case-insensitively", () => {
      expect(findCategoryId(categories, "announcements")).toBe("DIC_1");
    });

    it("throws with the available categories listed when no match", () => {
      expect(() => findCategoryId(categories, "Nope")).toThrow(
        /Announcements, Show and tell/,
      );
    });
  });
});
