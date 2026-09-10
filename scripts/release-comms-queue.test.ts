import { describe, it, expect } from "vitest";
import {
  formatBlueskyDraftEntry,
  insertDraftsIntoBlueskyLog,
} from "./release-comms-queue.ts";

describe("release-comms-queue", () => {
  describe("formatBlueskyDraftEntry", () => {
    it("formats a draft matching the log's existing Drafted-section shape", () => {
      const entry = formatBlueskyDraftEntry("I needed X so I built Y.", {
        sha: "abcdef1234567890",
        date: "2026-09-10T12:00:00.000Z",
      });
      expect(entry).toContain("### Release comms auto-draft, 2026-09-10");
      expect(entry).toContain("`abcdef1`");
      expect(entry).toContain("- **Text:** I needed X so I built Y.");
      expect(entry).toContain("- **Image:** _TODO");
      expect(entry).toContain("- **Alt:** _TODO_");
      expect(entry).toContain("release comms agent from production release");
    });
  });

  describe("insertDraftsIntoBlueskyLog", () => {
    const fileContent = [
      "# Bluesky Post Log",
      "",
      "## Posted",
      "",
      "### 2026-09-06 — Heist Generator (ad hoc)",
      "",
      "## Backlog (from issue #2086, reordered)",
      "",
      "1. Something",
      "",
      "## Drafted (not yet posted)",
      "",
      "### Existing Draft",
      "",
      "- **Text:** existing",
    ].join("\n");

    it("inserts new entries right after the Drafted heading, before existing drafts", () => {
      const updated = insertDraftsIntoBlueskyLog(fileContent, [
        "### New Draft\n\n- **Text:** new",
      ]);
      const draftedIndex = updated.indexOf("## Drafted (not yet posted)");
      const newIndex = updated.indexOf("### New Draft");
      const existingIndex = updated.indexOf("### Existing Draft");
      expect(draftedIndex).toBeGreaterThanOrEqual(0);
      expect(newIndex).toBeGreaterThan(draftedIndex);
      expect(newIndex).toBeLessThan(existingIndex);
    });

    it("inserts multiple entries in order, separated by a blank line", () => {
      const updated = insertDraftsIntoBlueskyLog(fileContent, [
        "### First",
        "### Second",
      ]);
      expect(updated.indexOf("### First")).toBeLessThan(
        updated.indexOf("### Second"),
      );
      expect(updated).toContain("### First\n\n### Second");
    });

    it("returns the content unchanged when there are no new entries", () => {
      expect(insertDraftsIntoBlueskyLog(fileContent, [])).toBe(fileContent);
    });

    it("throws when the Drafted heading is missing rather than guessing where to insert", () => {
      expect(() =>
        insertDraftsIntoBlueskyLog("# No drafted section here", ["### X"]),
      ).toThrow('Could not find "## Drafted (not yet posted)"');
    });
  });
});
