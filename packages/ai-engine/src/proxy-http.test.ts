import { describe, expect, it, vi } from "vitest";
import {
  formatErrorCode,
  postProxyJson,
  readProxyGenerationResponse,
} from "./proxy-http";

describe("proxy HTTP helpers", () => {
  it("serialises JSON and forwards the abort signal and response unchanged", async () => {
    const response = new Response("ok");
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
    const signal = new AbortController().signal;
    expect(
      await postProxyJson(
        fetcher,
        "https://proxy.test",
        { input: "hello" },
        signal,
      ),
    ).toBe(response);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith("https://proxy.test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"input":"hello"}',
      signal,
    });
  });

  it("propagates transport rejection", async () => {
    const error = new Error("offline");
    await expect(
      postProxyJson(vi.fn().mockRejectedValue(error), "https://proxy.test", {}),
    ).rejects.toBe(error);
  });

  it.each([undefined, null, "", 42, {}])(
    "omits invalid error code %j",
    (code) => {
      expect(formatErrorCode(code)).toBe("");
    },
  );

  it("preserves machine-readable error codes", () => {
    expect(formatErrorCode("SESSION_TOKEN_EXPIRED")).toBe(
      " (code: SESSION_TOKEN_EXPIRED)",
    );
  });

  it("reads successful generation responses", async () => {
    expect(
      await readProxyGenerationResponse(Response.json({ content: "hi" })),
    ).toEqual({ content: "hi" });
  });

  it("uses a fallback error when a failed generation response is not JSON", async () => {
    await expect(
      readProxyGenerationResponse(new Response("not JSON", { status: 502 })),
    ).rejects.toThrow("Proxy request failed");
  });

  it("keeps the unknown-error fallback and code when the proxy omits a message", async () => {
    await expect(
      readProxyGenerationResponse(
        Response.json({ error: { code: "UNAVAILABLE" } }, { status: 503 }),
      ),
    ).rejects.toThrow("Unknown error (code: UNAVAILABLE)");
  });
});
