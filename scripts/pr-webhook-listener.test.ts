import { describe, expect, it } from "vitest";
import { shouldHandleEvent, summariseEvent, verifySignature } from "./pr-webhook-listener";

describe("PR webhook listener", () => {
  it("accepts only relevant PR event actions", () => {
    expect(shouldHandleEvent("pull_request_review_comment", "created")).toBe(true);
    expect(shouldHandleEvent("check_run", "completed")).toBe(true);
    expect(shouldHandleEvent("pull_request", "closed")).toBe(false);
    expect(shouldHandleEvent("push", "created")).toBe(false);
  });

  it("summarises a pull request event", () => {
    expect(
      summariseEvent("pull_request_review", {
        action: "submitted",
        repository: { full_name: "eserlan/Codex-Cryptica" },
        pull_request: {
          number: 2867,
          head: { sha: "abc123" },
          base: { ref: "staging" },
        },
      }),
    ).toEqual({
      event: "pull_request_review",
      action: "submitted",
      repository: "eserlan/Codex-Cryptica",
      pullRequestNumber: 2867,
      headSha: "abc123",
      baseRef: "staging",
    });
  });

  it("rejects a forged webhook signature", async () => {
    expect(await verifySignature("{}", "sha256=wrong", "secret")).toBe(false);
    expect(await verifySignature("{}", null, "secret")).toBe(false);
  });
});
