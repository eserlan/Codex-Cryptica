import { afterEach, describe, expect, it, vi } from "vitest";
import { logDungeonStagedStats } from "./generator-staged-diagnostics";

const stats = {
  outcome: "staged" as const,
  aiCalls: 4,
  repairedStages: [],
  reviewIssues: ["PRIVATE"],
  reviewSkipped: false,
  coherenceRepaired: false,
  remainingIssues: ["PRIVATE"],
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("dungeon staged diagnostics", () => {
  it("logs counts without exposing campaign text", () => {
    vi.stubEnv("DEV", true);
    const log = vi.spyOn(console, "debug").mockImplementation(() => {});
    logDungeonStagedStats(stats);
    expect(log).toHaveBeenCalledWith(
      "[Generator] staged dungeon run",
      expect.objectContaining({ reviewIssueCount: 1, remainingIssueCount: 1 }),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain("PRIVATE");
  });
  it("does not log in production", () => {
    vi.stubEnv("DEV", false);
    const log = vi.spyOn(console, "debug").mockImplementation(() => {});
    logDungeonStagedStats(stats);
    expect(log).not.toHaveBeenCalled();
  });
});
