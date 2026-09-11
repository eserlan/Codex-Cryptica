import { describe, expect, it, vi } from "vitest";
import {
  MAX_BODY_BYTES,
  readRequestBody,
  shouldHandleEvent,
  summariseEvent,
  isStagingPush,
  verifySignature,
  verifySharedSecret,
} from "./pr-webhook-listener.ts";

describe("PR webhook listener", () => {
  it("recognises pushes to staging as conflict-reconciliation triggers", () => {
    expect(isStagingPush("push", { ref: "refs/heads/staging" })).toBe(true);
    expect(isStagingPush("push", { ref: "refs/heads/main" })).toBe(false);
    expect(isStagingPush("pull_request", { ref: "refs/heads/staging" })).toBe(
      false,
    );
  });

  it("accepts only relevant PR event actions", () => {
    expect(shouldHandleEvent("pull_request_review_comment", "created")).toBe(
      true,
    );
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

  it("extracts the pull request from a completed check-run event", () => {
    expect(
      summariseEvent("check_run", {
        action: "completed",
        repository: { full_name: "eserlan/Codex-Cryptica" },
        check_run: {
          pull_requests: [{ number: 2868, head_sha: "def456" }],
        },
      }),
    ).toEqual({
      event: "check_run",
      action: "completed",
      repository: "eserlan/Codex-Cryptica",
      pullRequestNumber: 2868,
      headSha: "def456",
      baseRef: undefined,
    });
  });

  it("accepts a valid webhook signature and rejects a forged one", async () => {
    const body = "{}";
    const secret = "secret";
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(body),
    );
    const header = `sha256=${Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
    expect(await verifySignature(body, header, secret)).toBe(true);
    expect(await verifySignature("{}", "sha256=wrong", "secret")).toBe(false);
    expect(await verifySignature("{}", null, "secret")).toBe(false);
  });

  it("bounds request bodies before and during reading", async () => {
    expect(
      await readRequestBody(
        new Request("http://localhost/github", {
          method: "POST",
          headers: { "content-length": String(MAX_BODY_BYTES + 1) },
          body: "x",
        }),
      ),
    ).toBeNull();
    expect(
      await readRequestBody(
        new Request("http://localhost/github", {
          method: "POST",
          body: "{}",
        }),
      ),
    ).toBe("{}");
  });

  it("accepts a matching shared secret and rejects a wrong or missing one", async () => {
    expect(await verifySharedSecret("correct-secret", "correct-secret")).toBe(
      true,
    );
    expect(await verifySharedSecret("wrong-secret", "correct-secret")).toBe(
      false,
    );
    expect(await verifySharedSecret(null, "correct-secret")).toBe(false);
  });

  it("resets the debounce timer on repeated auto-merge scheduling instead of skipping it", async () => {
    vi.useFakeTimers();
    const previousAutoMerge = process.env.PR_AUTO_MERGE;
    process.env.PR_AUTO_MERGE = "true";
    let clearSpy: ReturnType<typeof vi.spyOn> | undefined;
    try {
      const { scheduleAutoMerge } = await import(
        `./pr-webhook-listener.ts?debounce-test=${Date.now()}`
      );
      clearSpy = vi.spyOn(global, "clearTimeout");

      await scheduleAutoMerge(4242);
      expect(vi.getTimerCount()).toBe(1);
      expect(clearSpy).not.toHaveBeenCalled();

      // A second event arriving before the quiet window elapses must
      // debounce from this latest event, not be silently dropped.
      await scheduleAutoMerge(4242);
      expect(clearSpy).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(1);
    } finally {
      vi.useRealTimers();
      process.env.PR_AUTO_MERGE = previousAutoMerge;
      clearSpy?.mockRestore();
    }
  });

  it("defaults INTERNAL_REVIEW_ENABLED to false when PR_INTERNAL_REVIEW is unset", async () => {
    const previous = process.env.PR_INTERNAL_REVIEW;
    delete process.env.PR_INTERNAL_REVIEW;
    try {
      const { INTERNAL_REVIEW_ENABLED } = await import(
        `./pr-webhook-listener.ts?review-default-test=${Date.now()}`
      );
      expect(INTERNAL_REVIEW_ENABLED).toBe(false);
    } finally {
      if (previous !== undefined) process.env.PR_INTERNAL_REVIEW = previous;
    }
  });
});
