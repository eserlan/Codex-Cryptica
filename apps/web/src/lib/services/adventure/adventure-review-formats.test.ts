import { describe, expect, it } from "vitest";
import {
  adventureReviewJson,
  adventureReviewMarkdown,
} from "./adventure-review-formats";
import { exampleSession } from "./test-fixtures/adventure-review";

describe("Adventure review formats", () => {
  it("keeps the GM ledger in JSON without changing the session", () => {
    const session = exampleSession();
    const before = structuredClone(session);

    expect(JSON.parse(adventureReviewJson(session))).toEqual(session);
    expect(session).toEqual(before);
  });

  it("quotes multiline prose and renders optional turn details", () => {
    const session = exampleSession();
    session.premise = "First line\r\nSecond line";
    session.turns[0].narration = "A reply.\nAnother line.";

    const markdown = adventureReviewMarkdown(session);

    expect(markdown).toContain("> First line\n> Second line");
    expect(markdown).toContain("> A reply.\n> Another line.");
    expect(markdown).toContain(
      "- Fictional time advanced: 1d (Rested overnight)",
    );
    expect(markdown).toContain(
      "- Suggested actions: Visit the market | Ask about the mill | Leave town",
    );
    expect(markdown).toContain("The miller is missing.");
    expect(markdown.endsWith("\n")).toBe(true);
    expect(markdown.endsWith("\n\n")).toBe(false);
  });

  it("omits absent turn details and handles an empty transcript", () => {
    const session = exampleSession();
    session.turns[0].timeAdvance = undefined;
    session.turns[0].suggestedActions = [];

    const markdown = adventureReviewMarkdown(session);

    expect(markdown).not.toContain("- Fictional time advanced:");
    expect(markdown).not.toContain("- Suggested actions:");
    session.turns = [];
    session.scenarioCollection = undefined;
    session.worldTime = undefined;
    const empty = adventureReviewMarkdown(session);
    expect(empty).toContain("No committed turns yet.");
    expect(empty).toContain("- Scenarios: 0");
    expect(empty).toContain("- Elapsed fictional time: 0m");
  });
});
