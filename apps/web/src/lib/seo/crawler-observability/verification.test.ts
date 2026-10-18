import { describe, expect, it } from "vitest";
import { verifyAiCrawler } from "./verification";

describe("verification", () => {
  it("verifies when client IP matches published CIDR for the declared agent", () => {
    // 104.210.140.128/28 is an official OAI-SearchBot CIDR
    const result = verifyAiCrawler("OAI-SearchBot", "104.210.140.130");
    expect(result).toEqual({
      verified: true,
      method: "ip_range",
      details: "Source IP matched published CIDR for OAI-SearchBot",
    });
  });

  it("verifies ChatGPT-User against ChatGPT-User published CIDRs", () => {
    // 104.208.184.192/28 is an official ChatGPT-User CIDR
    const result = verifyAiCrawler("ChatGPT-User", "104.208.184.195");
    expect(result.verified).toBe(true);
    expect(result.method).toBe("ip_range");
  });

  it("classifies spoofed requests as unverified when source IP does not match published ranges", () => {
    // Declares OAI-SearchBot, but comes from residential or random cloud IP
    const spoofed = verifyAiCrawler("OAI-SearchBot", "198.51.100.25");
    expect(spoofed).toEqual({
      verified: false,
      method: "unverified",
      details:
        "Unverified: source IP outside published ranges and no Cloudflare verified-bot signal",
    });
  });

  it("falls back to Cloudflare verified-bot signal when IP range check is inconclusive", () => {
    // Agent without published IP ranges, or new provider IP, but confirmed by Cloudflare Bot Management
    const cfVerified = verifyAiCrawler("ClaudeBot", "192.0.2.1", {
      clientBot: true,
    });
    expect(cfVerified).toEqual({
      verified: true,
      method: "cloudflare_verified_bot",
      details: "Verified via Cloudflare verified-bot signal",
    });

    const botManagementVerified = verifyAiCrawler("bingbot", "192.0.2.1", {
      botManagement: { verifiedBot: true },
    });
    expect(botManagementVerified).toEqual({
      verified: true,
      method: "cloudflare_verified_bot",
      details: "Verified via Cloudflare verified-bot signal",
    });
  });

  it("never trusts User-Agent alone without IP match or Cloudflare verified signal", () => {
    const uaOnly = verifyAiCrawler("PerplexityBot", null, null);
    expect(uaOnly.verified).toBe(false);
    expect(uaOnly.method).toBe("unverified");

    const fakeCf = verifyAiCrawler("PerplexityBot", "203.0.113.5", {
      clientBot: false,
      botManagement: { verifiedBot: false },
    });
    expect(fakeCf.verified).toBe(false);
    expect(fakeCf.method).toBe("unverified");
  });

  it("returns unverified for empty agent name", () => {
    const noAgent = verifyAiCrawler("", "104.210.140.130");
    expect(noAgent.verified).toBe(false);
    expect(noAgent.method).toBe("unverified");
  });
});
