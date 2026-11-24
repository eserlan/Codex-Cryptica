import { describe, expect, it } from "vitest";
import {
  collectCommittedExplanations,
  collectSpeculativeCommitments,
} from "../src/gm-director-commitments";
import { commitment } from "./gm-director-fixtures";
import { session } from "./reducer-fixtures";

describe("director commitments", () => {
  it("separates committed explanations, scoped speculation, and unscoped explanations", () => {
    const s = session();
    s.causalCommitments = [
      commitment("explanation", { scenarioId: "bell" }),
      commitment("belief", {
        scenarioId: "bell",
        commitmentClass: "belief-testimony",
      }),
      commitment("plan", {
        scenarioId: "bell",
        commitmentClass: "speculative-plan",
      }),
      commitment("unscoped"),
      commitment("contested", { scenarioId: "bell", status: "contested" }),
      commitment("other", { scenarioId: "other" }),
    ];
    expect(
      collectCommittedExplanations(s, "bell").map((entry) => entry.id),
    ).toEqual(["explanation"]);
    expect(
      collectSpeculativeCommitments(s, "bell").map((entry) => entry.id),
    ).toEqual(["belief", "plan"]);
    expect(collectCommittedExplanations(s).map((entry) => entry.id)).toEqual([
      "unscoped",
    ]);
  });

  it("caps entries in authored order and clips text without mutating the commitments", () => {
    const s = session();
    s.causalCommitments = Array.from({ length: 5 }, (_, i) =>
      commitment(`entry-${i}`, {
        scenarioId: "bell",
        subject: "Bell ".repeat(70),
        summary: "  ringing\n at midnight  ",
      }),
    );
    const before = structuredClone(s.causalCommitments);
    const entries = collectCommittedExplanations(s, "bell");
    expect(entries.map((entry) => entry.id)).toEqual([
      "entry-0",
      "entry-1",
      "entry-2",
    ]);
    expect(entries[0]!.subject).toHaveLength(180);
    expect(entries[0]!.summary).toBe("ringing at midnight");
    expect(s.causalCommitments).toEqual(before);
  });

  it("omits missing and contested commitments", () => {
    const s = session();
    expect(collectCommittedExplanations(s)).toEqual([]);
    expect(collectSpeculativeCommitments(s, "bell")).toEqual([]);
    s.causalCommitments = [commitment("contested", { status: "contested" })];
    expect(collectCommittedExplanations(s)).toEqual([]);
  });
});
