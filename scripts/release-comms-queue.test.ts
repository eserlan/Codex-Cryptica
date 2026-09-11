import { describe, it, expect } from "vitest";
import {
  formatBlueskyDraftEntry,
  formatTrackerTableRow,
  insertDraftsIntoBlueskyLog,
  insertTrackerTableRow,
  updatePlatformStatus,
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

  describe("formatTrackerTableRow", () => {
    it("formats a row with default platforms and unchecked statuses", () => {
      const row = formatTrackerTableRow({
        date: "2026-09-10",
        topic: "Faction Rosters",
        reference: "Generate faction members...",
        platforms: { bluesky: true, discord: false },
      });
      expect(row).toBe(
        "| 2026-09-10 | Faction Rosters | Generate faction members... | [x] | [ ] | [ ] | [ ] |",
      );
    });

    it("formats a row with custom platform columns", () => {
      const row = formatTrackerTableRow(
        {
          date: "2026-09-10",
          topic: "Faction Rosters",
          reference: "Generate faction members...",
          platforms: { bluesky: true, threads: true },
        },
        ["Bluesky", "Threads", "Mastodon"],
      );
      expect(row).toBe(
        "| 2026-09-10 | Faction Rosters | Generate faction members... | [x] | [x] | [ ] |",
      );
    });
  });

  describe("insertTrackerTableRow", () => {
    const content = [
      "# Social Post Log",
      "",
      "## Cross-Platform Posting Tracker",
      "",
      "| Date | Topic | Copy / reference | Bluesky | Discord | Instagram | Patreon |",
      "|------|-------|------------------|:-------:|:-------:|:---------:|:-------:|",
      "| 2026-09-06 | Heist Generator | ... | [x] | [ ] | [ ] | [ ] |",
    ].join("\n");

    it("inserts a new row at the top of the table after separator", () => {
      const newRow =
        "| 2026-09-10 | Faction Rosters | ... | [ ] | [ ] | [ ] | [ ] |";
      const updated = insertTrackerTableRow(content, newRow);
      const lines = updated.split("\n");
      expect(lines[6]).toBe(newRow);
      expect(lines[7]).toContain("Heist Generator");
    });

    it("inserts a row when the separator is several lines below the header, as in the real log", () => {
      const contentWithDescription = [
        "# Social Post Log",
        "",
        "## Cross-Platform Posting Tracker",
        "",
        "Tracks whether each post has been published across current and planned platforms (Bluesky, Discord, Instagram, Patreon).",
        "",
        "| Date | Topic | Copy / reference | Bluesky | Discord | Instagram | Patreon |",
        "|------|-------|------------------|:-------:|:-------:|:---------:|:-------:|",
        "| 2026-09-06 | Heist Generator | ... | [x] | [ ] | [ ] | [ ] |",
      ].join("\n");
      const newRow =
        "| 2026-09-10 | Faction Rosters | ... | [ ] | [ ] | [ ] | [ ] |";
      const updated = insertTrackerTableRow(contentWithDescription, newRow);
      const lines = updated.split("\n");
      expect(lines[8]).toBe(newRow);
      expect(lines[9]).toContain("Heist Generator");
    });
  });

  describe("updatePlatformStatus", () => {
    const content = [
      "# Social Post Log",
      "",
      "## Cross-Platform Posting Tracker",
      "",
      "| Date | Topic | Copy / reference | Bluesky | Discord | Instagram | Patreon |",
      "|------|-------|------------------|:-------:|:-------:|:---------:|:-------:|",
      "| 2026-09-10 | Faction Rosters | ... | [x] | [ ] | [ ] | [ ] |",
      "| 2026-09-06 | Heist Generator | ... | [x] | [ ] | [ ] | [ ] |",
    ].join("\n");

    it("updates Discord status from [ ] to [x] for matching topic", () => {
      const updated = updatePlatformStatus(
        content,
        "Faction Rosters",
        "Discord",
        true,
      );
      expect(updated).toContain(
        "| 2026-09-10 | Faction Rosters | ... | [x] | [x] | [ ] | [ ] |",
      );
      expect(updated).toContain(
        "| 2026-09-06 | Heist Generator | ... | [x] | [ ] | [ ] | [ ] |",
      );
    });

    it("supports dynamic columns added to the table", () => {
      const customContent = [
        "## Cross-Platform Posting Tracker",
        "",
        "| Date | Topic | Copy | Bluesky | Mastodon |",
        "|------|-------|------|:-------:|:--------:|",
        "| 2026-09-10 | Faction Rosters | ... | [x] | [ ] |",
      ].join("\n");

      const updated = updatePlatformStatus(
        customContent,
        "Faction Rosters",
        "Mastodon",
        true,
      );
      expect(updated).toContain(
        "| 2026-09-10 | Faction Rosters | ... | [x] | [x] |",
      );
    });

    it("handles emoji status style if table uses ✅ and ⬜", () => {
      const emojiContent = [
        "## Cross-Platform Posting Tracker",
        "",
        "| Date | Topic | Copy | Bluesky | Discord |",
        "|------|-------|------|:-------:|:-------:|",
        "| 2026-09-10 | Faction Rosters | ... | ✅ | ⬜ |",
      ].join("\n");

      const updated = updatePlatformStatus(
        emojiContent,
        "Faction Rosters",
        "Discord",
        true,
      );
      expect(updated).toContain(
        "| 2026-09-10 | Faction Rosters | ... | ✅ | ✅ |",
      );
    });
  });
});
