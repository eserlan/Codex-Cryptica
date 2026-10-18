import { describe, expect, it, vi } from "vitest";

// The real bundle is generated at build time and is not committed. Simulating
// it being absent proves the route is wired and degrades to a clear 503.
vi.mock("./help-bundle", () => {
  throw new Error("bundle not built");
});

import worker from "./index";

const env = { GEMINI_API_KEY: "test-key" };
const ctx = { waitUntil() {}, passThroughOnException() {} } as never;

const ask = (init: RequestInit & { origin?: string } = {}) =>
  worker.fetch(
    new Request("https://oracle-proxy.test/api/help/ask", {
      method: "POST",
      headers: { Origin: init.origin ?? "https://codexcryptica.com" },
      body: JSON.stringify({
        question: "How do I connect the faction?",
        history: [],
        context: {
          v: 1,
          routeTemplate: "/(app)",
          area: "entity-detail",
          entityKind: "location",
          tab: "connections",
          mode: "view",
          surface: "vault",
          flags: [],
          availableActions: ["status-tab"],
        },
      }),
    }),
    env,
    ctx,
  );

describe("index dispatch for /api/help/ask", () => {
  it("reaches the help handler and reports help as unavailable when the bundle is missing", async () => {
    const res = await ask();
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("HELP_NOT_CONFIGURED");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://codexcryptica.com",
    );
  });

  it("refuses a disallowed origin through the existing guard", async () => {
    const res = await ask({ origin: "https://evil.example" });
    expect(res.status).toBe(403);
  });

  it("only accepts POST", async () => {
    const res = await worker.fetch(
      new Request("https://oracle-proxy.test/api/help/ask", { method: "GET" }),
      env,
      ctx,
    );
    expect(res.status).toBe(405);
  });
});
