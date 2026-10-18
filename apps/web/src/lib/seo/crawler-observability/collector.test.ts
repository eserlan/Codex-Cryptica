import { describe, expect, it, vi } from "vitest";
import { collectCrawlerTelemetry, type TelemetrySink } from "./collector";
import type { AiCrawlerEvent } from "./event-model";

describe("collector", () => {
  it("collects and verifies genuine OAI-SearchBot requests", async () => {
    const recordedEvents: AiCrawlerEvent[] = [];
    const mockSink: TelemetrySink = {
      recordEvent: (evt) => {
        recordedEvents.push(evt);
      },
    };

    const event = await collectCrawlerTelemetry(
      "https://codexcryptica.com/answers/how-do-you-run-a-heist-in-a-tabletop-rpg?ref=test",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot",
      200,
      { "cf-cache-status": "HIT" },
      {
        clientIp: "104.210.140.130", // within 104.210.140.128/28
        cf: { country: "US" },
        sinks: [mockSink],
      },
    );

    expect(event).not.toBeNull();
    expect(event?.provider).toBe("openai");
    expect(event?.agent).toBe("OAI-SearchBot");
    expect(event?.agentType).toBe("search_crawler");
    expect(event?.verified).toBe(true);
    expect(event?.verificationMethod).toBe("ip_range");
    expect(event?.path).toBe(
      "/answers/how-do-you-run-a-heist-in-a-tabletop-rpg",
    );
    expect(event?.primaryContentCluster).toBe("heist");
    expect(event?.cacheStatus).toBe("HIT");
    expect(event?.country).toBe("US");

    expect(recordedEvents).toHaveLength(1);
    expect(recordedEvents[0]).toEqual(event);
  });

  it("handles user-triggered prompt fetch from Perplexity-User", async () => {
    const event = await collectCrawlerTelemetry(
      "https://codexcryptica.com/generators/rumour",
      "Perplexity-User/1.0",
      200,
      { "cf-cache-status": "DYNAMIC" },
      {
        clientIp: "44.208.221.197", // within Perplexity-User range
        cf: { country: "US" },
      },
    );

    expect(event).not.toBeNull();
    expect(event?.provider).toBe("perplexity");
    expect(event?.agent).toBe("Perplexity-User");
    expect(event?.agentType).toBe("user_fetch");
    expect(event?.verified).toBe(true);
    expect(event?.primaryContentCluster).toBe("rumour");
  });

  it("marks spoofed requests with genuine UA but unverified IP as unverified", async () => {
    const event = await collectCrawlerTelemetry(
      "https://codexcryptica.com/generators/heist",
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      200,
      null,
      {
        clientIp: "198.51.100.42", // outside Googlebot ranges
        cf: { clientBot: false },
      },
    );

    expect(event).not.toBeNull();
    expect(event?.provider).toBe("google");
    expect(event?.verified).toBe(false);
    expect(event?.verificationMethod).toBe("unverified");
  });

  it("returns null and emits nothing for human browser traffic", async () => {
    const mockSink: TelemetrySink = {
      recordEvent: vi.fn(),
    };

    const event = await collectCrawlerTelemetry(
      "https://codexcryptica.com/",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36",
      200,
      null,
      { sinks: [mockSink] },
    );

    expect(event).toBeNull();
    expect(mockSink.recordEvent).not.toHaveBeenCalled();
  });

  it("is fail-silent when telemetry sinks throw errors", async () => {
    const failingSink: TelemetrySink = {
      recordEvent: () => {
        throw new Error("Simulated network outage");
      },
    };

    // Should not throw, should return the event successfully
    const event = await collectCrawlerTelemetry(
      "https://codexcryptica.com/generators/heist",
      "OAI-SearchBot",
      200,
      null,
      {
        clientIp: "104.210.140.130",
        sinks: [failingSink],
      },
    );

    expect(event).not.toBeNull();
  });
});
