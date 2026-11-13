import { describe, expect, it } from "vitest";
import { responseFailure } from "./backup-response";

function response(json: () => Promise<unknown>) {
  return {
    ok: false,
    status: 503,
    json,
    arrayBuffer: async () => new ArrayBuffer(0),
  };
}

describe("responseFailure", () => {
  it("preserves the server message and HTTP status", async () => {
    expect(
      await responseFailure(
        response(async () => ({ error: { message: "Unavailable" } })),
      ),
    ).toEqual({
      ok: false,
      error: "Unavailable",
      status: 503,
    });
  });

  it.each([null, {}, { error: { message: "" } }])(
    "falls back for an unreadable error: %j",
    async (body) => {
      expect(await responseFailure(response(async () => body))).toEqual({
        ok: false,
        error: "Request failed (503)",
        status: 503,
      });
    },
  );

  it("falls back when the response body cannot be decoded", async () => {
    expect(
      await responseFailure(
        response(async () => {
          throw new Error("Invalid JSON");
        }),
      ),
    ).toEqual({
      ok: false,
      error: "Request failed (503)",
      status: 503,
    });
  });
});
