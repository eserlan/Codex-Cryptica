import { describe, expect, it, vi } from "vitest";
import { buildHelpMetric, emitHelpMetric } from "./help-metrics";

describe("buildHelpMetric", () => {
  it("emits exactly event, outcome, latencyMs and area", () => {
    expect(
      buildHelpMetric({
        outcome: "answered",
        latencyMs: 1234.6,
        area: "entity-detail",
      }),
    ).toEqual({
      event: "help.request",
      outcome: "answered",
      latencyMs: 1235,
      area: "entity-detail",
    });
  });

  it("drops any extra field, including question text, answer text and identifiers", () => {
    const metric = buildHelpMetric({
      outcome: "no-match",
      latencyMs: 10,
      area: "graph",
      question: "How do I connect Oakvale to the Red Hand?",
      answer: "secret",
      entityId: "9b1c",
      ip: "203.0.113.9",
      session: "abc",
    } as never);
    expect(Object.keys(metric!).sort()).toEqual([
      "area",
      "event",
      "latencyMs",
      "outcome",
    ]);
    expect(JSON.stringify(metric)).not.toMatch(
      /Oakvale|secret|9b1c|203\.0|abc/,
    );
  });

  it("refuses an unknown outcome, area or bad latency instead of guessing", () => {
    expect(
      buildHelpMetric({ outcome: "weird", latencyMs: 1, area: "graph" }),
    ).toBeNull();
    expect(
      buildHelpMetric({ outcome: "answered", latencyMs: 1, area: "Oakvale" }),
    ).toBeNull();
    expect(
      buildHelpMetric({ outcome: "answered", latencyMs: -1, area: "graph" }),
    ).toBeNull();
    expect(
      buildHelpMetric({
        outcome: "answered",
        latencyMs: Number.NaN,
        area: "graph",
      }),
    ).toBeNull();
    expect(
      buildHelpMetric({ outcome: "answered", latencyMs: "5", area: "graph" }),
    ).toBeNull();
  });
});

describe("emitHelpMetric", () => {
  it("logs one JSON line", () => {
    const log = vi.fn();
    emitHelpMetric({ outcome: "answered", latencyMs: 5, area: "tables" }, log);
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({
      event: "help.request",
    });
  });

  it("logs nothing for an invalid metric", () => {
    const log = vi.fn();
    emitHelpMetric({ outcome: "nope", latencyMs: 5, area: "tables" }, log);
    expect(log).not.toHaveBeenCalled();
  });
});
