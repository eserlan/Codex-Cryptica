import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isPathAllowed,
  OAI_SEARCHBOT_TOKEN,
  parseRobotsTxt,
  selectRobotsGroup,
} from "./crawler-access";

/**
 * Pins the shipped robots policy (#2567). `static/robots.txt` is the file that
 * actually reaches crawlers, so the assertions read it rather than a copy.
 */
const robotsText = readFileSync(
  resolve(process.cwd(), "static/robots.txt"),
  "utf8",
);
const robots = parseRobotsTxt(robotsText);

const TRAINING_TOKENS = ["gptbot", "google-extended", "claudebot"];

describe("shipped robots.txt", () => {
  it("names OAI-SearchBot in its own group", () => {
    const group = selectRobotsGroup(robots, OAI_SEARCHBOT_TOKEN);

    expect(group?.agents).toContain(OAI_SEARCHBOT_TOKEN);
    expect(group?.agents).not.toContain("*");
  });

  it("lets OAI-SearchBot reach every public discovery family", () => {
    const paths = [
      "/",
      "/llms.txt",
      "/llms-full.txt",
      "/sitemap.xml",
      "/for/dungeons-and-dragons",
      "/generators/npc",
      "/solutions/campaign-manager",
      "/vs/obsidian",
      "/blog/introducing-the-canvas",
      "/answers/what-is-a-point-crawl",
      "/examples/gulls-roost-coastal-smuggling-town",
      "/tools/quest-hook-generator",
    ];

    for (const path of paths) {
      expect(isPathAllowed(robots, OAI_SEARCHBOT_TOKEN, path)).toBe(true);
    }
  });

  it("keeps search-discovery policy in a different group from training crawlers", () => {
    const searchGroup = selectRobotsGroup(robots, OAI_SEARCHBOT_TOKEN);

    for (const token of TRAINING_TOKENS) {
      expect(searchGroup?.agents).not.toContain(token);
    }
  });

  it("declares the canonical sitemap", () => {
    expect(robots.sitemaps).toEqual(["https://codexcryptica.com/sitemap.xml"]);
  });
});
