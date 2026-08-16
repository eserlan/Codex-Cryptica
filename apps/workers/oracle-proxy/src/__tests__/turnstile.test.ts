import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isCodexHostname,
  verifyTurnstileWithDiagnostics,
} from "../turnstile";

describe("isCodexHostname", () => {
  it("allows primary Codex production and staging domains", () => {
    expect(isCodexHostname("codexcryptica.com")).toBe(true);
    expect(isCodexHostname("codex-cryptica.com")).toBe(true);
    expect(isCodexHostname("staging.codexcryptica.com")).toBe(true);
    expect(isCodexHostname("staging.codex-cryptica.com")).toBe(true);
  });

  it("allows Cloudflare Pages preview domains", () => {
    expect(isCodexHostname("codex-cryptica.pages.dev")).toBe(true);
    expect(isCodexHostname("feature-123.codex-cryptica.pages.dev")).toBe(true);
    expect(isCodexHostname("my-branch.pages.dev")).toBe(true);
  });

  it("allows local dev hostnames", () => {
    expect(isCodexHostname("localhost")).toBe(true);
  });

  it("rejects unauthorized hostnames", () => {
    expect(isCodexHostname("evil-site.com")).toBe(false);
    expect(isCodexHostname("phishing-codexcryptica.com")).toBe(false);
    expect(isCodexHostname(undefined)).toBe(false);
  });
});

describe("verifyTurnstileWithDiagnostics", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns Cloudflare's safe error codes when siteverify rejects a challenge", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            hostname: "codexcryptica.com",
            action: "llm_session",
            "error-codes": ["timeout-or-duplicate"],
          }),
        ),
      ),
    );
    const request = new Request("https://proxy.example/api/session", {
      headers: { "CF-Connecting-IP": "192.0.2.1" },
    });

    await expect(
      verifyTurnstileWithDiagnostics(
        request,
        "secret",
        "llm_session",
        "turnstile-token",
      ),
    ).resolves.toEqual({
      valid: false,
      reason: "verification_rejected",
      errorCodes: ["timeout-or-duplicate"],
    });
  });

  it("does not call Cloudflare when the challenge token is missing", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);

    await expect(
      verifyTurnstileWithDiagnostics(
        new Request("https://proxy.example/api/session"),
        "secret",
        "llm_session",
      ),
    ).resolves.toEqual({ valid: false, reason: "missing_token" });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
