import { describe, expect, it } from "vitest";
import {
  assertBoundedPerformance,
  assertNoActiveLinks,
  assertNoRemoteResourceFetches,
} from "./pr-guardrails";

describe("pr-guardrails test helpers", () => {
  it("accepts clean HTML and rejects remote images, embeds, and CSS fetches", () => {
    expect(() =>
      assertNoRemoteResourceFetches("<p>Safe <strong>text</strong></p>"),
    ).not.toThrow();
    expect(() =>
      assertNoRemoteResourceFetches(
        '<p><img src="https://tracker.example/p.png" alt="x"></p>',
      ),
    ).toThrow();
    expect(() =>
      assertNoRemoteResourceFetches('<iframe src="https://evil.example">'),
    ).toThrow();
    expect(() =>
      assertNoRemoteResourceFetches(
        '<div style="background: url(https://tracker.example/bg.png)"></div>',
      ),
    ).toThrow();
    expect(() =>
      assertNoRemoteResourceFetches(
        "<style>@import 'https://x.test/a.css'</style>",
      ),
    ).toThrow();
  });

  it("accepts literal URL text and rejects active anchor tags", () => {
    expect(() =>
      assertNoActiveLinks("<p>See https://example.com and www.example.com</p>"),
    ).not.toThrow();
    expect(() =>
      assertNoActiveLinks('<p><a href="https://example.com">link</a></p>'),
    ).toThrow();
  });

  it("returns the computed result when within the latency budget and throws when exceeded", () => {
    const value = assertBoundedPerformance("trivial op", () => 42, 250);
    expect(value).toBe(42);
    expect(() =>
      assertBoundedPerformance("impossible budget", () => 42, -1),
    ).toThrow(/exceeded -1ms budget/);
  });
});
