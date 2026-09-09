import { describe, expect, it } from "vitest";
import {
  MAX_BODY_BYTES,
  readRequestBody,
  shouldHandleEvent,
  summariseEvent,
  isStagingPush,
  verifySignature,
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
});
