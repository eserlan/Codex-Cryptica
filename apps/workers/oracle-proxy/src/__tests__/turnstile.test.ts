import { describe, expect, it } from "vitest";
import { isCodexHostname } from "../turnstile";

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
