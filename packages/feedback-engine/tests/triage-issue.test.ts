import { describe, expect, test } from "bun:test";
import { renderTriageIssue, type FeedbackRecord } from "../src/triage-issue";

const record = (over: Partial<FeedbackRecord> = {}): FeedbackRecord => ({
  reference: "CC-7F3K-9Q2M",
  kind: "problem",
  receivedAt: "2026-10-19T15:04:05.000Z",
  description: "The tracker stayed empty.",
  contactEmail: undefined,
  meta: {
    appVersion: "0.36.0",
    area: "tabletop",
    browser: "firefox",
    screen: "narrow",
  },
  ...over,
});

describe("renderTriageIssue", () => {
  test("builds a title from kind and reference, with no user text", () => {
    const issue = renderTriageIssue(
      record({ description: "secret text here" }),
    );
    expect(issue.title).toBe("[Problem] CC-7F3K-9Q2M");
    expect(issue.title).not.toContain("secret");
  });

  test("labels each kind once", () => {
    expect(renderTriageIssue(record()).labels).toEqual(["report:problem"]);
    expect(renderTriageIssue(record({ kind: "idea" })).labels).toEqual([
      "report:idea",
    ]);
    expect(renderTriageIssue(record({ kind: "other" })).labels).toEqual([
      "report:other",
    ]);
  });

  test("uses the title prefix for idea and other", () => {
    expect(renderTriageIssue(record({ kind: "idea" })).title).toBe(
      "[Idea] CC-7F3K-9Q2M",
    );
    expect(renderTriageIssue(record({ kind: "other" })).title).toBe(
      "[Other] CC-7F3K-9Q2M",
    );
  });

  test("puts the metadata and the description in the body", () => {
    const { body } = renderTriageIssue(record());
    expect(body).toContain("**Reference:** CC-7F3K-9Q2M");
    expect(body).toContain("**Area:** tabletop");
    expect(body).toContain("The tracker stayed empty.");
  });

  test("uses a fence longer than any backtick run in the text", () => {
    const { body } = renderTriageIssue(
      record({ description: "try ``` and ```` here" }),
    );
    expect(body).toContain("`````text\ntry ``` and ```` here\n`````");
  });

  test("keeps markup and mentions inside the fence", () => {
    const { body } = renderTriageIssue(
      record({ description: "![x](https://example.com/p.png) @eserlan #12" }),
    );
    const inside = body.split("```text\n")[1]!.split("\n```")[0];
    expect(inside).toBe("![x](https://example.com/p.png) @eserlan #12");
  });

  test("adds a contact section only when an email is given", () => {
    expect(renderTriageIssue(record()).body).not.toContain("### Contact");
    expect(
      renderTriageIssue(record({ contactEmail: "gm@example.com" })).body,
    ).toContain("gm@example.com");
  });
});
