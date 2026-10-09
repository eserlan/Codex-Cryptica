import { describe, expect, it, vi } from "vitest";
import { PublicEntityTemplateDirectoryService } from "./PublicEntityTemplateDirectoryService";

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const make = (fetchImpl: (...a: any[]) => Promise<Response>) =>
  new PublicEntityTemplateDirectoryService({
    fetch: fetchImpl as any,
    baseUrl: "https://dir.test",
  });

describe("reportEntityTemplate", () => {
  it("sends the reason and details with no credentials", async () => {
    const fetch = vi.fn(async () => ok({ success: true }, 201));
    await make(fetch).reportEntityTemplate("L1", {
      reason: "spam",
      details: "Looks fake",
    });
    const [url, init] = fetch.mock.calls[0] as any[];
    expect(url).toBe(
      "https://dir.test/api/template-directory/listings/L1/report",
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      reason: "spam",
      details: "Looks fake",
    });
    expect(init.headers.Authorization).toBeUndefined();
  });

  it.each([
    [409, {}, "already_reported", "You've already reported this."],
    [429, {}, "rate_limited", "Too many requests. Please try again later."],
    [
      503,
      { error: { code: "reporting_unavailable", message: "x" } },
      "reporting_unavailable",
      "Reporting isn't available right now.",
    ],
    [404, {}, "not_found", "This template is no longer available."],
    [500, {}, "unknown", "Could not send the report."],
  ])(
    "maps %s to a plain-language error",
    async (status, body, code, message) => {
      const err = await make(async () => ok(body, status))
        .reportEntityTemplate("L1", { reason: "other" })
        .catch((e) => e);
      expect(err.code).toBe(code);
      expect(err.message).toBe(message);
    },
  );

  it("reports a retryable network error", async () => {
    const err = await make(async () => {
      throw new TypeError("offline");
    })
      .reportEntityTemplate("L1", { reason: "other" })
      .catch((e) => e);
    expect(err.code).toBe("network");
  });
});
