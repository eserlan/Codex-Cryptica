import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { IDEA_DEVELOPER_COPY } from "./idea-developer-notice";

const surfaces = () => {
  const { notice, help, privacy } = IDEA_DEVELOPER_COPY;
  return {
    notice: notice.text,
    help: help.body,
    privacy: privacy.paragraphs.join(" "),
  };
};

const FACTS: Array<[string, RegExp]> = [
  ["sent to an AI service", /sent to an AI service/i],
  [
    "service keeps the conversation while it continues",
    /keeps? this conversation while you continue/i,
  ],
  ["Codex Cryptica does not keep it", /Codex Cryptica does not keep/i],
  ["how to end it", /new conversation/i],
];

describe("IDEA_DEVELOPER_COPY", () => {
  it.each(Object.keys(surfaces()))("%s states every key fact", (surface) => {
    const text = surfaces()[surface as keyof ReturnType<typeof surfaces>];
    for (const [name, pattern] of FACTS) {
      expect(text, `${surface} is missing: ${name}`).toMatch(pattern);
    }
  });

  it("explains what new conversation and clear do and do not remove (help and privacy)", () => {
    const { help, privacy } = surfaces();
    for (const text of [help, privacy]) {
      expect(text).toMatch(/clear/i);
      expect(text).toMatch(/retention/i);
      expect(text).toMatch(/does not (promise|mean)/i);
    }
  });

  it("says a saved draft is kept in this browser until the app imports it (help and privacy)", () => {
    const { help, privacy } = surfaces();
    for (const text of [help, privacy]) {
      expect(text).toMatch(/Save to your Codex/);
      expect(text).toMatch(/kept in this browser until the app imports it/i);
    }
  });

  it("does not put a turn count in the help or privacy text, so the limit stays out of sight", () => {
    const { help, privacy } = surfaces();
    for (const text of [help, privacy]) {
      expect(text).not.toMatch(/\bup to \d+\b/i);
      expect(text).not.toMatch(/\b\d+ turns\b/i);
    }
  });

  it("keeps the inline notice short enough to sit beside the submit button", () => {
    expect(IDEA_DEVELOPER_COPY.notice.text.length).toBeLessThan(400);
  });

  it("links the notice to the fuller explanations", () => {
    expect(IDEA_DEVELOPER_COPY.notice.privacyHref).toMatch(/^\/privacy/);
    expect(IDEA_DEVELOPER_COPY.notice.helpLabel.length).toBeGreaterThan(0);
  });

  it("appears word for word in the static privacy policy, so the two cannot drift", () => {
    const policy = readFileSync(
      resolve(__dirname, "../../../static/PRIVACY.md"),
      "utf8",
    );
    expect(policy).toContain(IDEA_DEVELOPER_COPY.privacy.heading);
    for (const paragraph of IDEA_DEVELOPER_COPY.privacy.paragraphs) {
      expect(policy).toContain(paragraph);
    }
  });
});
