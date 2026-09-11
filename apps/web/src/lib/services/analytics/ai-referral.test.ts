import { describe, expect, it } from "vitest";
import { classifyAiReferral } from "./ai-referral";

const landingUrl = (source?: string) => {
  const url = new URL("https://codexcryptica.com/answers/example");
  if (source) url.searchParams.set("utm_source", source);
  return url;
};

describe("classifyAiReferral", () => {
  it.each([
    ["https://chatgpt.com", "openai", "chatgpt"],
    ["https://chat.openai.com/c/example", "openai", "chatgpt"],
    ["https://www.perplexity.ai/search/example", "perplexity", "perplexity"],
    ["https://copilot.microsoft.com/chats/example", "microsoft", "copilot"],
    ["https://claude.ai/new", "anthropic", "claude"],
    ["https://gemini.google.com/app", "google", "gemini"],
  ] as const)("classifies %s as %s/%s", (referrer, provider, source) => {
    expect(classifyAiReferral(landingUrl(), referrer)).toEqual({
      channel: "ai_referral",
      provider,
      source,
    });
  });

  it.each([
    ["chatgpt", "openai", "chatgpt"],
    ["CHATGPT.COM", "openai", "chatgpt"],
    ["perplexity.ai", "perplexity", "perplexity"],
    ["copilot", "microsoft", "copilot"],
    ["bing-ai", "microsoft", "copilot"],
    ["claude.ai", "anthropic", "claude"],
    ["gemini.google.com", "google", "gemini"],
  ] as const)(
    "classifies utm_source=%s as %s/%s",
    (utmSource, provider, source) => {
      expect(classifyAiReferral(landingUrl(utmSource))).toEqual({
        channel: "ai_referral",
        provider,
        source,
      });
    },
  );

  it("prefers a recognised campaign source over a conflicting referrer", () => {
    expect(
      classifyAiReferral(
        landingUrl("chatgpt.com"),
        "https://perplexity.ai/search/example",
      ),
    ).toEqual({
      channel: "ai_referral",
      provider: "openai",
      source: "chatgpt",
    });
  });

  it("falls back to a recognised referrer when the UTM source is generic", () => {
    expect(
      classifyAiReferral(landingUrl("newsletter"), "https://claude.ai/new"),
    ).toEqual({
      channel: "ai_referral",
      provider: "anthropic",
      source: "claude",
    });
  });

  it.each([
    "https://www.google.com/search?q=campaign",
    "https://www.bing.com/chat?q=campaign",
    "https://openai.com/research",
    "https://chatgpt.com.example.org/campaign",
    "not a URL",
  ])("leaves ambiguous or invalid referrer %s unclassified", (referrer) => {
    expect(classifyAiReferral(landingUrl(), referrer)).toBeNull();
  });

  it("does not treat a same-origin referrer as an AI referral", () => {
    expect(
      classifyAiReferral(
        landingUrl(),
        "https://codexcryptica.com/answers/another-page",
      ),
    ).toBeNull();
  });
});
