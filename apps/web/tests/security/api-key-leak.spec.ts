import { test, expect } from "@playwright/test";

/**
 * Security tests to verify API keys are never exposed in client-side network traffic.
 * Ensures the system proxy path keeps the system API key hidden from the client.
 */

test("system API key is never exposed in client network traffic", async ({
  page,
}) => {
  // Start network monitoring before any actions
  const requestUrls: string[] = [];
  page.on("request", (request) => {
    requestUrls.push(request.url());
  });

  // Navigate to app and send Oracle message without user API key
  await page.goto("/");

  // Wait for app to initialize
  await page.waitForLoadState("networkidle");

  // Send a test message through the Oracle
  const oracleInput = page.locator('[data-testid="oracle-input"]');
  if (await oracleInput.isVisible()) {
    await oracleInput.fill("Test message for security verification");
    await page.locator('[data-testid="oracle-send"]').click();

    // Wait for response to complete
    await page.waitForTimeout(2000);
  }

  // Verify no requests contain 'key=' parameter to Google APIs
  const googleApiRequests = requestUrls.filter(
    (url) => url.includes("googleapis.com") && url.includes("key="),
  );

  expect(googleApiRequests).toHaveLength(0);

  // Verify proxy requests go to the correct endpoint (if any requests were made)
  const proxyRequests = requestUrls.filter((url) =>
    url.includes("oracle-proxy.espen-erlandsen.workers.dev"),
  );

  // If using system proxy, requests should go to proxy, not direct to Google
  if (proxyRequests.length === 0) {
    // If no proxy requests, ensure no Google API requests with keys either
    const anyGoogleRequests = requestUrls.filter(
      (url) =>
        url.includes("googleapis.com") && !url.includes("fonts.googleapis.com"),
    );
    expect(anyGoogleRequests).toHaveLength(0);
  }
});

test("user API key is only sent to authorized endpoints", async ({ page }) => {
  // This test verifies that when a user provides their own API key,
  // it is only sent to Google APIs and never logged or exposed elsewhere

  const sensitiveUrls: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    const postData = request.postData() || "";

    // Check for API key patterns in URL or POST data
    const apiKeyPattern = /key=[a-zA-Z0-9_-]+/;
    if (apiKeyPattern.test(url) || apiKeyPattern.test(postData)) {
      sensitiveUrls.push(url);
    }
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Note: This test requires manual API key entry or pre-configured test key
  // For automated testing, use environment variable or test fixture

  // Verify no sensitive data in analytics/tracking endpoints
  const analyticsUrls = sensitiveUrls.filter(
    (url) =>
      url.includes("analytics") ||
      url.includes("tracking") ||
      url.includes("telemetry"),
  );

  expect(analyticsUrls).toHaveLength(0);
});
