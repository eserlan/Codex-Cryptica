import { describe, expect, it } from "vitest";
import { getSessionTurnstileToken } from "./turnstile";

describe("getSessionTurnstileToken", () => {
  it("uses the local development token without loading a hostname-bound challenge", async () => {
    await expect(getSessionTurnstileToken()).resolves.toBe(
      "dev-turnstile-token",
    );
  });
});
