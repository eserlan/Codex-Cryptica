import { describe, expect, it, vi } from "vitest";
import { onRequest } from "./_middleware";

function makeContext(overrides: {
  userAgent?: string | null;
  cfIp?: string | null;
  writeDataPoint?: (point: unknown) => void;
  waitUntil?: ((promise: Promise<unknown>) => void) | null;
}) {
  const headers = new Headers();
  if (overrides.userAgent) headers.set("user-agent", overrides.userAgent);
  if (overrides.cfIp) headers.set("cf-connecting-ip", overrides.cfIp);

  const request = new Request("https://codexcryptica.com/answers/example", {
    headers,
  });

  const response = new Response("ok", {
    status: 200,
    headers: { "cf-cache-status": "HIT" },
  });

  const next = vi.fn().mockResolvedValue(response);
  const waitUntil =
    overrides.waitUntil === null ? undefined : (overrides.waitUntil ?? vi.fn());

  return {
    context: {
      request,
      env: {
        AI_CRAWLER_ANALYTICS: overrides.writeDataPoint
          ? { writeDataPoint: overrides.writeDataPoint }
          : undefined,
      },
      next,
      waitUntil: waitUntil as unknown as (p: Promise<unknown>) => void,
    },
    next,
  };
}

describe("functions/_middleware onRequest", () => {
  it("skips telemetry entirely for ordinary human traffic", async () => {
    const writeDataPoint = vi.fn();
    const { context, next } = makeContext({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Safari/605",
      writeDataPoint,
    });

    const response = await onRequest(context as never);

    expect(response.status).toBe(200);
    expect(next).toHaveBeenCalledTimes(1);
    expect(writeDataPoint).not.toHaveBeenCalled();
  });

  it("schedules telemetry via waitUntil for a recognised AI agent without delaying the response", async () => {
    const writeDataPoint = vi.fn();
    const waitUntil = vi.fn();
    const { context } = makeContext({
      userAgent:
        "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot",
      cfIp: "104.210.140.130",
      writeDataPoint,
      waitUntil,
    });

    const response = await onRequest(context as never);

    expect(response.status).toBe(200);
    expect(waitUntil).toHaveBeenCalledTimes(1);

    // The response is returned without awaiting telemetry directly; the
    // caller is responsible for keeping the worker alive via waitUntil.
    await waitUntil.mock.calls[0][0];
    expect(writeDataPoint).toHaveBeenCalledTimes(1);
  });

  it("awaits telemetry inline when the platform provides no waitUntil", async () => {
    const writeDataPoint = vi.fn();
    const { context } = makeContext({
      userAgent:
        "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot",
      cfIp: "104.210.140.130",
      writeDataPoint,
      waitUntil: null,
    });

    const response = await onRequest(context as never);

    expect(response.status).toBe(200);
    expect(writeDataPoint).toHaveBeenCalledTimes(1);
  });

  it("still returns the origin response if telemetry recording throws", async () => {
    const { context } = makeContext({
      userAgent:
        "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot",
      cfIp: "104.210.140.130",
      writeDataPoint: () => {
        throw new Error("analytics engine unavailable");
      },
      waitUntil: null,
    });

    const response = await onRequest(context as never);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
  });
});
