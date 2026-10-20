import { describe, expect, test } from "bun:test";
import { buildFeedbackMetric, emitFeedbackMetric } from "../src/metric";

describe("buildFeedbackMetric", () => {
  test("keeps only the outcome and a valid kind", () => {
    expect(buildFeedbackMetric({ outcome: "accepted", kind: "idea" })).toEqual({
      event: "feedback.report",
      outcome: "accepted",
      kind: "idea",
    });
  });

  test("omits the kind when it is invalid or absent", () => {
    expect(buildFeedbackMetric({ outcome: "limited" })).toEqual({
      event: "feedback.report",
      outcome: "limited",
    });
    expect(buildFeedbackMetric({ outcome: "rejected", kind: "rant" })).toEqual({
      event: "feedback.report",
      outcome: "rejected",
    });
  });

  test("returns null for an unknown outcome", () => {
    expect(buildFeedbackMetric({ outcome: "shouted" })).toBeNull();
  });

  test("never carries extra fields such as text, email or address", () => {
    const metric = buildFeedbackMetric({
      outcome: "accepted",
      kind: "problem",
      description: "private",
      email: "gm@example.com",
      reference: "CC-7F3K-9Q2M",
      ip: "203.0.113.5",
    } as never);
    expect(JSON.stringify(metric)).not.toMatch(
      /private|gm@|CC-7F3K|203\.0\.113/,
    );
  });

  test("emitFeedbackMetric writes one JSON line, or nothing when invalid", () => {
    const lines: string[] = [];
    emitFeedbackMetric({ outcome: "duplicate", kind: "other" }, (l) =>
      lines.push(l),
    );
    emitFeedbackMetric({ outcome: "nope" }, (l) => lines.push(l));
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!)).toEqual({
      event: "feedback.report",
      outcome: "duplicate",
      kind: "other",
    });
  });
});
