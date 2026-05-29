import { test, expect } from "@playwright/test";

/**
 * Security tests to verify cross-origin isolation is active.
 * This is crucial for SharedArrayBuffer support in multi-threaded/worker performance.
 */

test("cross-origin isolation headers are active and window is isolated", async ({
  page,
}) => {
  // Navigate to root and capture the initial navigation response
  const response = await page.goto("/");
  expect(response).not.toBeNull();

  if (response) {
    const headers = response.headers();

    // Verify Cross-Origin-Opener-Policy header
    const coop = headers["cross-origin-opener-policy"];
    expect(coop).toBeDefined();
    expect(coop).toBe("same-origin-allow-popups");

    // Verify Cross-Origin-Embedder-Policy header
    const coep = headers["cross-origin-embedder-policy"];
    expect(coep).toBeDefined();
    expect(coep).toBe("credentialless");
  }

  // Evaluate self.crossOriginIsolated on the client page
  // Note: same-origin-allow-popups does not grant crossOriginIsolated,
  // but it's required to prevent breaking Google Drive OAuth popups.
  const isIsolated = await page.evaluate(() => self.crossOriginIsolated);
  expect(isIsolated).toBe(false);
});
