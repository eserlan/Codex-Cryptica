import { describe, expect, it, vi } from "vitest";
import {
  FeedbackReportService,
  FeedbackSubmitError,
} from "./FeedbackReportService";

const payload = {
  schemaVersion: 1 as const,
  submissionId: "3f0c2b1e-8d4a-4c6b-9e2f-1a2b3c4d5e6f",
  kind: "problem" as const,
  description: "The tracker stayed empty.",
  meta: {
    appVersion: "0.36.0",
    area: "tabletop" as const,
    browser: "firefox" as const,
    screen: "narrow" as const,
  },
};

function service(fetch: typeof globalThis.fetch) {
  return new FeedbackReportService({ fetch, baseUrl: "https://worker.test" });
}

describe("FeedbackReportService", () => {
  it("posts the report as JSON and returns the reference", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ reference: "CC-7F3K-9Q2M" }), {
          status: 201,
        }),
    );
    const receipt = await service(fetch as never).submitReport(payload);

    expect(receipt).toEqual({ reference: "CC-7F3K-9Q2M" });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://worker.test/api/feedback/reports");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual(payload);
  });

  it("treats a repeat as success with the same reference", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ reference: "CC-7F3K-9Q2M" }), {
          status: 200,
        }),
    );
    expect(
      (await service(fetch as never).submitReport(payload)).reference,
    ).toBe("CC-7F3K-9Q2M");
  });

  it("reports a network failure as offline, not as success", async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(
      service(fetch as never).submitReport(payload),
    ).rejects.toMatchObject({ code: "offline" });
  });

  it("maps a 429 to rate_limited with the Retry-After seconds", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ error: { code: "rate_limited", message: "x" } }),
          {
            status: 429,
            headers: { "Retry-After": "60" },
          },
        ),
    );
    const error = await service(fetch as never)
      .submitReport(payload)
      .catch((e) => e);
    expect(error).toBeInstanceOf(FeedbackSubmitError);
    expect(error).toMatchObject({
      code: "rate_limited",
      retryAfterSeconds: 60,
    });
  });

  it("maps server errors to unavailable and never shows upstream text", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: { code: "unavailable", message: "github token abc leaked" },
          }),
          {
            status: 503,
          },
        ),
    );
    const error = await service(fetch as never)
      .submitReport(payload)
      .catch((e) => e);
    expect(error).toMatchObject({ code: "unavailable" });
    expect(error.message).not.toContain("leaked");
  });

  it("treats an unreadable error body as unavailable", async () => {
    const fetch = vi.fn(
      async () => new Response("<html>oops</html>", { status: 502 }),
    );
    await expect(
      service(fetch as never).submitReport(payload),
    ).rejects.toMatchObject({ code: "unavailable" });
  });

  it("treats a success without a reference as unavailable, never as sent", async () => {
    const fetch = vi.fn(
      async () => new Response(JSON.stringify({}), { status: 201 }),
    );
    await expect(
      service(fetch as never).submitReport(payload),
    ).rejects.toMatchObject({ code: "unavailable" });
  });
});
