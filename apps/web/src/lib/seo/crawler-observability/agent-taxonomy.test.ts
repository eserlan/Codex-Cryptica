import { describe, expect, it } from "vitest";
import {
  classifyUserAgent,
  isPotentialAiAgent,
  RECOGNISED_AGENTS,
} from "./agent-taxonomy";

describe("agent-taxonomy", () => {
  describe("isPotentialAiAgent", () => {
    it("returns true for AI user agents and common crawler tokens", () => {
      expect(
        isPotentialAiAgent("Mozilla/5.0 (compatible; OAI-SearchBot/1.0)"),
      ).toBe(true);
      expect(
        isPotentialAiAgent(
          "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0",
        ),
      ).toBe(true);
      expect(isPotentialAiAgent("PerplexityBot/1.0")).toBe(true);
      expect(
        isPotentialAiAgent(
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        ),
      ).toBe(true);
      expect(isPotentialAiAgent("Mozilla/5.0 (compatible; bingbot/2.0)")).toBe(
        true,
      );
      expect(isPotentialAiAgent("ClaudeBot/1.0")).toBe(true);
    });

    it("returns false for standard human browser user agents", () => {
      expect(
        isPotentialAiAgent(
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        ),
      ).toBe(false);
      expect(
        isPotentialAiAgent(
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
        ),
      ).toBe(false);
      expect(isPotentialAiAgent("")).toBe(false);
      expect(isPotentialAiAgent(null)).toBe(false);
      expect(isPotentialAiAgent(undefined)).toBe(false);
    });
  });

  describe("classifyUserAgent", () => {
    it("classifies OpenAI search, prompt-fetch, and training agents", () => {
      const search = classifyUserAgent(
        "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot",
      );
      expect(search).toEqual({
        provider: "openai",
        agentName: "OAI-SearchBot",
        agentType: "search_crawler",
      });

      const user = classifyUserAgent(
        "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot",
      );
      expect(user).toEqual({
        provider: "openai",
        agentName: "ChatGPT-User",
        agentType: "user_fetch",
      });

      const train = classifyUserAgent(
        "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot",
      );
      expect(train).toEqual({
        provider: "openai",
        agentName: "GPTBot",
        agentType: "training_crawler",
      });
    });

    it("classifies Perplexity search and user-fetch agents", () => {
      const search = classifyUserAgent(
        "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot",
      );
      expect(search).toEqual({
        provider: "perplexity",
        agentName: "PerplexityBot",
        agentType: "search_crawler",
      });

      const user = classifyUserAgent(
        "Perplexity-User/1.0 (+https://perplexity.ai)",
      );
      expect(user).toEqual({
        provider: "perplexity",
        agentName: "Perplexity-User",
        agentType: "user_fetch",
      });
    });

    it("classifies Microsoft/Bing agents", () => {
      const bot = classifyUserAgent(
        "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      );
      expect(bot).toEqual({
        provider: "microsoft",
        agentName: "bingbot",
        agentType: "search_crawler",
      });

      const copilot = classifyUserAgent("Microsoft-User/1.0 (Copilot)");
      expect(copilot).toEqual({
        provider: "microsoft",
        agentName: "Copilot-User",
        agentType: "user_fetch",
      });
    });

    it("classifies Google agents", () => {
      const gbot = classifyUserAgent(
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      );
      expect(gbot).toEqual({
        provider: "google",
        agentName: "Googlebot",
        agentType: "search_crawler",
      });

      const ext = classifyUserAgent(
        "Mozilla/5.0 (compatible; Google-Extended; +http://www.google.com/bot.html)",
      );
      expect(ext).toEqual({
        provider: "google",
        agentName: "Google-Extended",
        agentType: "training_crawler",
      });

      const vertex = classifyUserAgent("Google-Cloud-VertexBot/1.0");
      expect(vertex).toEqual({
        provider: "google",
        agentName: "Google-Cloud-VertexBot",
        agentType: "user_fetch",
      });
    });

    it("classifies Anthropic agents", () => {
      const claudeBot = classifyUserAgent(
        "ClaudeBot/1.0; +https://anthropic.com/claudebot",
      );
      expect(claudeBot).toEqual({
        provider: "anthropic",
        agentName: "ClaudeBot",
        agentType: "training_crawler",
      });

      const claudeWeb = classifyUserAgent("Claude-Web/1.0");
      expect(claudeWeb).toEqual({
        provider: "anthropic",
        agentName: "Claude-Web",
        agentType: "user_fetch",
      });
    });

    it("returns null for non-matching or empty user agents", () => {
      expect(classifyUserAgent("Curl/8.4.0")).toBeNull();
      expect(classifyUserAgent("")).toBeNull();
      expect(classifyUserAgent(null)).toBeNull();
      expect(classifyUserAgent(undefined)).toBeNull();
    });

    it("has unique agent names across the entire taxonomy", () => {
      const names = RECOGNISED_AGENTS.map((a) => a.agentName);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });
});
